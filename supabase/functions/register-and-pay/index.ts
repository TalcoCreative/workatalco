import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const {
      companyName, slug, industry,
      adminFullName, adminEmail, adminPhone, adminPassword,
      tier, userCount,
    } = await req.json();

    // Validate
    if (!companyName || !slug || !adminFullName || !adminEmail || !adminPassword || !tier || !userCount) {
      throw new Error("Semua field wajib diisi");
    }
    if (adminPassword.length < 6) throw new Error("Password minimal 6 karakter");
    if (slug.length < 3) throw new Error("Slug minimal 3 karakter");

    const TIER_PRICES: Record<string, number> = {
      trial: 0,
      starter: 7000,
      professional: 21000,
      enterprise: 25000,
    };
    const pricePerUser = TIER_PRICES[tier];
    if (pricePerUser === undefined) throw new Error("Tier tidak valid");
    const isTrial = tier === "trial";

    // Check slug uniqueness
    const { data: existingCompany } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("slug", slug.toLowerCase())
      .maybeSingle();
    if (existingCompany) throw new Error("Slug sudah digunakan. Pilih nama workspace lain.");

    // Check email uniqueness
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.find((u: any) => u.email === adminEmail.toLowerCase());
    if (emailExists) throw new Error("Email sudah terdaftar. Silakan login atau gunakan email lain.");

    console.log("Creating company:", { companyName, slug, tier, userCount });

    // 1. Create auth user
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminFullName },
    });
    if (createUserError) throw createUserError;
    const adminUserId = newUser.user.id;
    console.log("User created:", adminUserId);

    // Ensure profile exists
    await supabaseAdmin
      .from("profiles")
      .upsert({
        id: adminUserId,
        full_name: adminFullName,
        phone: adminPhone,
        user_id: adminEmail.toLowerCase(),
      }, { onConflict: "id" });

    // 2. Create company (start as pending until payment confirmed)
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: companyName,
        slug: cleanSlug,
        subscription_tier: isTrial ? "trial" : tier,
        max_users: isTrial ? 3 : userCount,
        owner_id: adminUserId,
        is_active: isTrial ? true : false, // Trial is active immediately, paid requires payment
      })
      .select()
      .single();
    if (companyError) throw companyError;
    console.log("Company created:", company.id);

    // 3. Add as owner
    await supabaseAdmin.from("company_members").insert({
      company_id: company.id,
      user_id: adminUserId,
      role: "owner",
    });

    // 4. Set super_admin role
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: adminUserId,
      role: "super_admin",
    });
    if (roleError) {
      console.error("Role insert error:", roleError);
    }

    // 4b. Seed default roles if not already seeded
    const { data: existingDynRoles } = await supabaseAdmin
      .from("dynamic_roles")
      .select("id")
      .limit(1);

    if (!existingDynRoles || existingDynRoles.length === 0) {
      console.log("Seeding default roles...");
      const seedRes = await fetch(`${supabaseUrl}/functions/v1/seed-default-roles`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
      });
      console.log("Seed roles result:", seedRes.status);
    }

    // 4c. Auto-assign Super Admin dynamic role to owner
    const { data: superAdminDynRole } = await supabaseAdmin
      .from("dynamic_roles")
      .select("id")
      .eq("name", "Super Admin")
      .maybeSingle();

    if (superAdminDynRole) {
      await supabaseAdmin.from("user_dynamic_roles").upsert(
        { user_id: adminUserId, role_id: superAdminDynRole.id },
        { onConflict: "user_id" }
      );
      console.log("Assigned Super Admin dynamic role to owner");
    }
    // 5. Create subscription record
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await supabaseAdmin.from("subscriptions").insert({
      company_id: company.id,
      tier,
      max_users: userCount,
      price_per_user: pricePerUser,
      status: "pending",
      current_period_end: periodEnd.toISOString(),
    });

    // 6. Create Midtrans Snap transaction
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");
    let snapToken: string | null = null;
    let snapRedirectUrl: string | null = null;
    let orderId: string | null = null;

    if (serverKey) {
      const amount = pricePerUser * userCount;
      orderId = `REG-${company.id.slice(0, 8)}-${Date.now()}`;

      const midtransAuth = btoa(serverKey + ":");
      const midtransPayload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
        item_details: [{
          id: `subscription-${tier}`,
          price: pricePerUser,
          quantity: userCount,
          name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan (${userCount} users)`,
        }],
        customer_details: {
          email: adminEmail.toLowerCase(),
          first_name: adminFullName,
          phone: adminPhone,
        },
      };

      try {
        const snapRes = await fetch("https://app.midtrans.com/snap/v1/transactions", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${midtransAuth}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(midtransPayload),
        });

        const snapData = await snapRes.json();
        if (snapRes.ok && snapData.token) {
          snapToken = snapData.token;
          snapRedirectUrl = snapData.redirect_url;

          // Save payment transaction
          await supabaseAdmin.from("payment_transactions").insert({
            company_id: company.id,
            midtrans_order_id: orderId,
            amount,
            status: "pending",
            tier,
            user_count: userCount,
            snap_token: snapToken,
            snap_redirect_url: snapRedirectUrl,
            metadata: { company_name: companyName, user_email: adminEmail },
          });

          console.log("Midtrans transaction created:", orderId);
        } else {
          console.error("Midtrans error (non-blocking):", snapData);
        }
      } catch (midErr) {
        console.error("Midtrans error (non-blocking):", midErr);
      }
    }

    console.log("Registration complete for:", cleanSlug);

    return new Response(
      JSON.stringify({
        success: true,
        companyId: company.id,
        companySlug: cleanSlug,
        snapToken,
        snapRedirectUrl,
        orderId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

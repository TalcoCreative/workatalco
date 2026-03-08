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

    // Verify caller is platform admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { data: pa } = await supabaseAdmin
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!pa) throw new Error("Only platform admins can create companies");

    const { companyName, slug, tier, maxUsers, adminEmail, adminPassword, adminFullName } = await req.json();

    if (!companyName || !slug || !adminEmail || !adminPassword || !adminFullName) {
      throw new Error("Missing required fields");
    }

    console.log("Creating company:", { companyName, slug, tier });

    // 1. Create the company
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: companyName,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        subscription_tier: tier || "trial",
        max_users: maxUsers || 3,
      })
      .select()
      .single();

    if (companyError) throw companyError;
    console.log("Company created:", company.id);

    // 2. Create the admin user (or get existing)
    let adminUserId: string;

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === adminEmail);

    if (existingUser) {
      adminUserId = existingUser.id;
      console.log("Using existing user:", adminUserId);
    } else {
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { full_name: adminFullName },
      });

      if (createUserError) throw createUserError;
      adminUserId = newUser.user.id;
      console.log("Admin user created:", adminUserId);
    }

    // 3. Add user as owner of the company
    const { error: memberError } = await supabaseAdmin
      .from("company_members")
      .insert({
        company_id: company.id,
        user_id: adminUserId,
        role: "owner",
      });

    if (memberError) throw memberError;
    console.log("Admin added as owner");

    // 4. Ensure user has super_admin role for the company
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", adminUserId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!existingRole) {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: adminUserId, role: "super_admin" });
    }

    // 5. Set company owner_id
    await supabaseAdmin
      .from("companies")
      .update({ owner_id: adminUserId })
      .eq("id", company.id);

    return new Response(
      JSON.stringify({ success: true, company, adminUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

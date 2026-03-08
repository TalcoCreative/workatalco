import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { action } = await req.json();

    if (action === "bootstrap") {
      // 1. Create platform admin user
      let userId: string;
      
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: any) => u.email === "rafi@talco.id");
      
      if (existing) {
        userId = existing.id;
        console.log("User already exists:", userId);
      } else {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: "rafi@talco.id",
          password: "123456",
          email_confirm: true,
          user_metadata: { full_name: "Rafi Platform Admin" },
        });
        if (createError) throw createError;
        userId = newUser.user.id;
        console.log("Created user:", userId);
      }

      // 2. Add as platform admin
      await supabaseAdmin.from("platform_admins").upsert({ user_id: userId }, { onConflict: "user_id" });

      // 3. Ensure super_admin role
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "super_admin")
        .maybeSingle();
      
      if (!existingRole) {
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "super_admin" });
      }

      // 4. Create 3 dummy companies
      const companies = [
        { name: "Talco Creative Indonesia", slug: "talco", subscription_tier: "enterprise", max_users: 100 },
        { name: "PT Digital Nusantara", slug: "digital-nusantara", subscription_tier: "professional", max_users: 30 },
        { name: "Startup Maju Jaya", slug: "startup-maju", subscription_tier: "starter", max_users: 10 },
      ];

      for (const comp of companies) {
        // Check if company exists
        const { data: existingComp } = await supabaseAdmin
          .from("companies")
          .select("id")
          .eq("slug", comp.slug)
          .maybeSingle();

        let companyId: string;
        if (existingComp) {
          companyId = existingComp.id;
          // Update tier
          await supabaseAdmin.from("companies").update({
            subscription_tier: comp.subscription_tier,
            max_users: comp.max_users,
          }).eq("id", companyId);
        } else {
          const { data: newComp, error: compError } = await supabaseAdmin
            .from("companies")
            .insert({
              name: comp.name,
              slug: comp.slug,
              subscription_tier: comp.subscription_tier,
              max_users: comp.max_users,
              owner_id: userId,
            })
            .select("id")
            .single();
          if (compError) throw compError;
          companyId = newComp.id;
        }

        // Add platform admin as member (owner)
        const { data: existingMember } = await supabaseAdmin
          .from("company_members")
          .select("id")
          .eq("company_id", companyId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingMember) {
          await supabaseAdmin.from("company_members").insert({
            company_id: companyId,
            user_id: userId,
            role: "owner",
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Platform bootstrapped", userId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error) {
    console.error("Bootstrap error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

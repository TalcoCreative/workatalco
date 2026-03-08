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
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { step } = await req.json();

    // Step 0: Create platform admin
    if (step === 0) {
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: any) => u.email === "rafi@talco.id");
      
      let adminId: string;
      if (existing) {
        adminId = existing.id;
      } else {
        const { data: newUser, error } = await admin.auth.admin.createUser({
          email: "rafi@talco.id",
          password: "123456",
          email_confirm: true,
          user_metadata: { full_name: "Rafi Platform Admin" },
        });
        if (error) throw error;
        adminId = newUser.user.id;
      }

      await admin.from("profiles").upsert({
        id: adminId,
        full_name: "Rafi Platform Admin",
        user_id: "rafi@talco.id",
      }, { onConflict: "id" });

      await admin.from("platform_admins").upsert({
        user_id: adminId,
        email: "rafi@talco.id",
      }, { onConflict: "user_id" });

      const { data: existingRole } = await admin.from("user_roles").select("id").eq("user_id", adminId).eq("role", "super_admin").maybeSingle();
      if (!existingRole) {
        await admin.from("user_roles").insert({ user_id: adminId, role: "super_admin" });
      }

      return new Response(JSON.stringify({ success: true, adminId, step: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1-5: Create companies with admins
    const companies = [
      { name: "Talco Creative Indonesia", slug: "talco", tier: "enterprise", maxUsers: 100, adminEmail: "admin@talco.id", adminName: "Admin Talco", password: "talco123" },
      { name: "PT Digital Nusantara", slug: "digital-nusantara", tier: "professional", maxUsers: 30, adminEmail: "admin@digitalnusantara.id", adminName: "Budi Santoso", password: "digital123" },
      { name: "Startup Maju Jaya", slug: "startup-maju", tier: "starter", maxUsers: 10, adminEmail: "admin@startupjaya.id", adminName: "Andi Wijaya", password: "startup123" },
      { name: "Kreasi Media Group", slug: "kreasi-media", tier: "professional", maxUsers: 25, adminEmail: "admin@kreasimedia.id", adminName: "Sari Dewi", password: "kreasi123" },
      { name: "Bintang Advertising", slug: "bintang-ads", tier: "enterprise", maxUsers: 50, adminEmail: "admin@bintangads.id", adminName: "Dimas Pratama", password: "bintang123" },
    ];

    if (step >= 1 && step <= 5) {
      const c = companies[step - 1];
      const { data: existingUsers } = await admin.auth.admin.listUsers();

      // Delete existing company
      const { data: existingCompany } = await admin.from("companies").select("id").eq("slug", c.slug).maybeSingle();
      if (existingCompany) {
        // Delete related data first
        await admin.from("clients").delete().eq("company_id", existingCompany.id);
        const { data: members } = await admin.from("company_members").select("user_id").eq("company_id", existingCompany.id);
        await admin.from("company_members").delete().eq("company_id", existingCompany.id);
        await admin.from("companies").delete().eq("id", existingCompany.id);
        
        // Delete member users (except rafi)
        if (members) {
          for (const m of members) {
            const memberUser = existingUsers?.users?.find((u: any) => u.id === m.user_id);
            if (memberUser && memberUser.email !== "rafi@talco.id" && memberUser.email !== "rafipicu@gmail.com") {
              await admin.from("user_roles").delete().eq("user_id", m.user_id);
              await admin.from("profiles").delete().eq("id", m.user_id);
              try { await admin.auth.admin.deleteUser(m.user_id); } catch {}
            }
          }
        }
      }

      // Delete existing admin user
      const existingUser = existingUsers?.users?.find((u: any) => u.email === c.adminEmail);
      if (existingUser) {
        await admin.from("user_roles").delete().eq("user_id", existingUser.id);
        await admin.from("profiles").delete().eq("id", existingUser.id);
        try { await admin.auth.admin.deleteUser(existingUser.id); } catch {}
      }

      // Create admin user
      const { data: newUser, error: userErr } = await admin.auth.admin.createUser({
        email: c.adminEmail,
        password: c.password,
        email_confirm: true,
        user_metadata: { full_name: c.adminName },
      });
      if (userErr) throw userErr;
      const userId = newUser.user.id;

      await admin.from("profiles").upsert({
        id: userId,
        full_name: c.adminName,
        user_id: c.adminEmail,
        phone: "0812345678" + step,
      }, { onConflict: "id" });

      // Create company
      const { data: company, error: compErr } = await admin.from("companies").insert({
        name: c.name,
        slug: c.slug,
        subscription_tier: c.tier,
        max_users: c.maxUsers,
        owner_id: userId,
        is_active: true,
      }).select().single();
      if (compErr) throw compErr;

      await admin.from("company_members").insert({ company_id: company.id, user_id: userId, role: "owner" });
      await admin.from("user_roles").insert({ user_id: userId, role: "super_admin" });

      // Add rafi to company
      const { data: rafi } = await admin.from("platform_admins").select("user_id").eq("email", "rafi@talco.id").maybeSingle();
      if (rafi) {
        await admin.from("company_members").upsert({
          company_id: company.id,
          user_id: rafi.user_id,
          role: "owner",
        }, { onConflict: "id" });
      }

      // Create team members
      const roles = ["graphic_designer", "content_writer", "videographer", "hr", "account_executive"];
      for (let i = 0; i < 2; i++) {
        const tmEmail = `team${i + 1}@${c.slug}.id`;
        const existTm = existingUsers?.users?.find((u: any) => u.email === tmEmail);
        if (existTm) {
          await admin.from("user_roles").delete().eq("user_id", existTm.id);
          await admin.from("profiles").delete().eq("id", existTm.id);
          try { await admin.auth.admin.deleteUser(existTm.id); } catch {}
        }

        const { data: tmUser } = await admin.auth.admin.createUser({
          email: tmEmail,
          password: "member123",
          email_confirm: true,
          user_metadata: { full_name: `Team ${i + 1} ${c.name}` },
        });
        if (tmUser?.user) {
          await admin.from("profiles").upsert({ id: tmUser.user.id, full_name: `Team ${i + 1} ${c.name}`, user_id: tmEmail }, { onConflict: "id" });
          await admin.from("company_members").insert({ company_id: company.id, user_id: tmUser.user.id, role: "member" });
          await admin.from("user_roles").insert({ user_id: tmUser.user.id, role: roles[i] || "graphic_designer" });
        }
      }

      // Seed clients
      const clientIds: string[] = [];
      for (let i = 0; i < 2; i++) {
        const { data: cl } = await admin.from("clients").insert({
          name: `Client ${String.fromCharCode(65 + i)} - ${c.name}`,
          company: `PT Client ${String.fromCharCode(65 + i)}`,
          status: "active",
          client_type: i === 0 ? "retainer" : "project",
          created_by: userId,
          company_id: company.id,
          email: `client${i + 1}@${c.slug}.id`,
        }).select("id").single();
        if (cl) clientIds.push(cl.id);
      }

      // Seed attendance
      const today = new Date().toISOString().split("T")[0];
      await admin.from("attendance").upsert({
        user_id: userId,
        date: today,
        clock_in: new Date().toISOString(),
      }, { onConflict: "id" });

      return new Response(JSON.stringify({
        success: true,
        step,
        company: c.name,
        slug: c.slug,
        tier: c.tier,
        adminEmail: c.adminEmail,
        password: c.password,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid step (0-5)" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
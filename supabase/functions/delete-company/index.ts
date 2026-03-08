import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify platform admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { data: pa } = await supabase
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!pa) throw new Error("Only platform admins can delete companies");

    const { companyId } = await req.json();
    if (!companyId) throw new Error("Missing companyId");

    console.log("Deleting company:", companyId);

    // 1. Get all members of the company
    const { data: members } = await supabase
      .from("company_members")
      .select("user_id")
      .eq("company_id", companyId);
    const memberUserIds = (members || []).map((m: any) => m.user_id);

    // 2. Delete company-scoped data
    const tables = [
      { table: "client_activity_logs", fk: "client_id", via: "clients" },
      { table: "client_accounts", fk: "client_id", via: "clients" },
      { table: "client_contracts", fk: "client_id", via: "clients" },
      { table: "client_documents", fk: "client_id", via: "clients" },
      { table: "client_payment_settings", fk: "client_id", via: "clients" },
      { table: "client_payments", fk: "client_id", via: "clients" },
      { table: "client_quotas", fk: "client_id", via: "clients" },
    ];

    // Get client IDs for this company
    const { data: clients } = await supabase
      .from("clients")
      .select("id")
      .eq("company_id", companyId);
    const clientIds = (clients || []).map((c: any) => c.id);

    if (clientIds.length > 0) {
      for (const t of tables) {
        await supabase.from(t.table).delete().in(t.fk, clientIds);
      }
      // Delete editorial plans and slides for this company
      const { data: eps } = await supabase
        .from("editorial_plans")
        .select("id")
        .eq("company_id", companyId);
      const epIds = (eps || []).map((e: any) => e.id);
      if (epIds.length > 0) {
        await supabase.from("editorial_slides").delete().in("ep_id", epIds);
        await supabase.from("editorial_plans").delete().in("id", epIds);
      }

      // Delete clients
      await supabase.from("clients").delete().eq("company_id", companyId);
    }

    // Delete activity timeline
    await supabase.from("activity_timeline").delete().eq("company_id", companyId);

    // 3. Delete company members
    await supabase.from("company_members").delete().eq("company_id", companyId);

    // 4. Delete auth users who are ONLY in this company (not in any other)
    const deletedUserIds: string[] = [];
    for (const uid of memberUserIds) {
      // Skip platform admin
      if (uid === user.id) continue;

      // Check if user is in other companies
      const { data: otherMemberships } = await supabase
        .from("company_members")
        .select("id")
        .eq("user_id", uid);

      if (!otherMemberships || otherMemberships.length === 0) {
        // User has no other company memberships, safe to delete
        // Clean up user data
        await supabase.from("user_roles").delete().eq("user_id", uid);
        await supabase.from("attendance").delete().eq("user_id", uid);
        await supabase.from("leave_requests").delete().eq("user_id", uid);
        await supabase.from("task_activities").delete().eq("user_id", uid);
        await supabase.from("shooting_notifications").delete().eq("user_id", uid);
        await supabase.from("shooting_crew").delete().eq("user_id", uid);
        await supabase.from("auto_clockout_notifications").delete().eq("user_id", uid);
        await supabase.from("announcement_reads").delete().eq("user_id", uid);
        await supabase.from("comment_mentions").delete().eq("mentioned_user_id", uid);
        await supabase.from("candidate_notifications").delete().eq("user_id", uid);
        await supabase.from("meeting_invitations").delete().eq("user_id", uid);
        
        // Delete profile
        await supabase.from("profiles").delete().eq("id", uid);
        
        // Delete auth user
        const { error: delErr } = await supabase.auth.admin.deleteUser(uid);
        if (!delErr) {
          deletedUserIds.push(uid);
          console.log("Deleted user:", uid);
        } else {
          console.error("Failed to delete user:", uid, delErr);
        }
      }
    }

    // 5. Delete the company itself
    const { error: companyErr } = await supabase
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (companyErr) {
      console.error("Error deleting company:", companyErr);
      throw new Error("Failed to delete company: " + companyErr.message);
    }

    console.log("Company deleted successfully:", companyId, "Users deleted:", deletedUserIds.length);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Company deleted successfully",
        deletedUsers: deletedUserIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

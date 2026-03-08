import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify caller is platform admin
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader);
      if (user) {
        const { data: admin } = await supabase.from("platform_admins").select("id").eq("user_id", user.id).maybeSingle();
        if (!admin) throw new Error("Unauthorized: not a platform admin");
      }
    }

    const body = await req.json();
    const { broadcast_id } = body;

    if (!broadcast_id) throw new Error("broadcast_id is required");

    // Get broadcast details
    const { data: broadcast, error: bErr } = await supabase
      .from("email_broadcasts")
      .select("*")
      .eq("id", broadcast_id)
      .single();
    if (bErr || !broadcast) throw new Error("Broadcast not found");
    if (broadcast.status !== "draft") throw new Error("Broadcast already sent or sending");

    // Build recipient query
    let query = supabase.from("profiles").select("id, full_name, email, user_id");

    // If filtering by company
    let companyMemberIds: string[] | null = null;
    if (broadcast.filter_company) {
      const { data: members } = await supabase.from("company_members").select("user_id").eq("company_id", broadcast.filter_company);
      companyMemberIds = members?.map((m: any) => m.user_id) || [];
      if (companyMemberIds.length > 0) {
        query = query.in("id", companyMemberIds);
      } else {
        // No members in this company
        await supabase.from("email_broadcasts").update({ status: "sent", total_recipients: 0, sent_at: new Date().toISOString() }).eq("id", broadcast_id);
        return new Response(JSON.stringify({ success: true, total: 0 }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    const { data: profiles } = await query;
    if (!profiles || profiles.length === 0) {
      await supabase.from("email_broadcasts").update({ status: "sent", total_recipients: 0, sent_at: new Date().toISOString() }).eq("id", broadcast_id);
      return new Response(JSON.stringify({ success: true, total: 0 }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Filter by role if specified
    let recipientIds = profiles.map((p: any) => p.id);
    if (broadcast.filter_role) {
      const { data: userRoles } = await supabase.from("user_roles").select("user_id").eq("role", broadcast.filter_role);
      const roleUserIds = new Set(userRoles?.map((r: any) => r.user_id) || []);
      recipientIds = recipientIds.filter((id: string) => roleUserIds.has(id));
    }

    const recipients = profiles.filter((p: any) => recipientIds.includes(p.id));

    // Update broadcast status
    await supabase.from("email_broadcasts").update({ status: "sending", total_recipients: recipients.length }).eq("id", broadcast_id);

    const batchId = broadcast_id;
    let enqueued = 0;

    // Check preferences and enqueue
    for (const profile of recipients) {
      const email = profile.email || (profile.user_id?.includes("@") ? profile.user_id : null);
      if (!email) continue;

      // Check if user accepts marketing
      const { data: prefs } = await supabase
        .from("email_preferences")
        .select("marketing_emails")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (prefs?.marketing_emails === false) continue;

      await supabase.from("email_queue").insert({
        email_type: "broadcast",
        recipient_email: email,
        recipient_name: profile.full_name || "User",
        template_key: "broadcast",
        template_data: {
          custom_html: broadcast.body_html,
          title: broadcast.subject,
        },
        priority: "low",
        provider: "brevo",
        status: "pending",
        batch_id: batchId,
        scheduled_at: new Date().toISOString(),
      });
      enqueued++;
    }

    // Update broadcast
    await supabase.from("email_broadcasts").update({
      total_recipients: enqueued,
      status: enqueued > 0 ? "sending" : "sent",
      sent_at: new Date().toISOString(),
    }).eq("id", broadcast_id);

    // Trigger worker to start processing
    if (enqueued > 0) {
      try {
        await supabase.functions.invoke("email-worker", { body: { batch_size: 50 } });
      } catch (e) {
        console.error("Failed to trigger worker:", e);
      }
    }

    return new Response(JSON.stringify({ success: true, enqueued, total_recipients: recipients.length }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Send broadcast error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

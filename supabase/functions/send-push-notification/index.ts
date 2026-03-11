import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    webpush.setVapidDetails(
      "mailto:hello@worka.app",
      vapidPublicKey,
      vapidPrivateKey
    );

    const { company_id, user_id, title, message, action_url, event_type, tag } =
      await req.json();

    if (!company_id || !title || !message || !event_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: company_id, title, message, event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query - strict company isolation
    let query = supabase
      .from("push_subscriptions")
      .select("*")
      .eq("company_id", company_id);

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: subscriptions, error: subErr } = await query;

    if (subErr) {
      console.error("Error fetching subscriptions:", subErr);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: tag || event_type || "worka-notification",
      data: { url: action_url || "/" },
    });

    let sentCount = 0;
    let failedCount = 0;
    let errorMsg = "";

    for (const sub of subscriptions || []) {
      // Validate company_id match
      if (sub.company_id !== company_id) continue;

      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth_key,
        },
      };

      try {
        await webpush.sendNotification(pushSub, payload);
        sentCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired/invalid - remove it
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        failedCount++;
        errorMsg = err.message || String(err);
        console.error(`Push failed for ${sub.endpoint}:`, err.statusCode, err.message);
      }
    }

    const totalSubs = (subscriptions || []).length;
    const logStatus = totalSubs === 0 ? "no_subscribers" : sentCount > 0 ? "sent" : "failed";

    // Log the notification
    await supabase.from("push_notification_logs").insert({
      company_id,
      user_id: user_id || null,
      title,
      message,
      action_url: action_url || null,
      event_type,
      status: logStatus,
      error_message: failedCount > 0 ? errorMsg : null,
    } as any);

    return new Response(
      JSON.stringify({ sent: sentCount, failed: failedCount, total: totalSubs, status: logStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Push notification error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

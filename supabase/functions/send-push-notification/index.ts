import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push requires crypto for signing
async function sendWebPush(subscription: any, payload: string, vapidPrivateKey: string, vapidPublicKey: string) {
  // For production, use a proper web-push library
  // This is a simplified implementation that creates the push request
  const endpoint = subscription.endpoint;
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "TTL": "86400",
    },
    body: payload,
  });

  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { company_id, user_id, title, message, action_url, event_type } = await req.json();

    if (!company_id || !title || !message || !event_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: company_id, title, message, event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query - always filter by company_id for strict isolation
    let query = supabase
      .from("push_subscriptions")
      .select("*")
      .eq("company_id", company_id);

    // If user_id provided, target specific user
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
      data: { url: action_url || "/" },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const sub of subscriptions || []) {
      try {
        // CRITICAL: Validate company_id matches before sending
        if (sub.company_id !== company_id) {
          console.error("Company ID mismatch - skipping notification");
          continue;
        }

        const endpoint = sub.endpoint;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "TTL": "86400",
          },
          body: payload,
        });

        if (response.ok || response.status === 201) {
          sentCount++;
        } else if (response.status === 410) {
          // Subscription expired, remove it
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          failedCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        console.error("Push send error:", err);
        failedCount++;
      }
    }

    // Log the notification
    await supabase.from("push_notification_logs").insert({
      company_id,
      user_id: user_id || null,
      title,
      message,
      action_url: action_url || null,
      event_type,
      status: sentCount > 0 ? "sent" : "failed",
    });

    return new Response(
      JSON.stringify({ sent: sentCount, failed: failedCount, total: (subscriptions || []).length }),
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

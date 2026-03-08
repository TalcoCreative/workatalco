import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Webhook handler for email delivery events from Resend and Brevo
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") || "resend";

    let eventType: string;
    let emailId: string | null = null;
    let metadata: any = {};

    if (provider === "resend") {
      eventType = body.type || "unknown";
      emailId = body.data?.email_id;
      metadata = body.data || {};
    } else if (provider === "brevo") {
      const eventMap: Record<string, string> = {
        delivered: "delivered", opened: "opened", click: "clicked",
        hard_bounce: "bounced", soft_bounce: "bounced",
        complaint: "complained", unsubscribed: "unsubscribed",
      };
      eventType = eventMap[body.event] || body.event || "unknown";
      emailId = body["message-id"];
      metadata = body;
    } else {
      eventType = body.event_type || "unknown";
      metadata = body;
    }

    await supabase.from("email_events").insert({
      event_type: eventType,
      provider,
      metadata,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

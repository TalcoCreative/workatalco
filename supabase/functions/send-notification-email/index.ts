import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "test" | "notification";
  notification_type?: string;
  notificationType?: string;
  recipient_email?: string;
  recipientEmail?: string;
  recipient_name?: string;
  recipientName?: string;
  data?: {
    title?: string;
    description?: string;
    content?: string;
    deadline?: string;
    creator_name?: string;
    creatorName?: string;
    link?: string;
    priority?: string;
    status?: string;
    participants?: string;
    location?: string;
    createdAt?: string;
    comment_content?: string;
    updated_at?: string;
  };
  related_id?: string;
  relatedId?: string;
  company_id?: string;
}

// Transactional types that should send immediately via Resend
const TRANSACTIONAL = new Set([
  "welcome_user", "verify_email", "reset_password", "invite_user",
  "payment_confirmation", "security_alert", "password_changed",
]);

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let requestBody: EmailRequest | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    requestBody = await req.json();
    const body = requestBody!;

    const normalizedRecipientEmail = body.recipient_email || body.recipientEmail;
    const normalizedRecipientName = body.recipient_name || body.recipientName || "User";
    const normalizedNotificationType = body.notification_type || body.notificationType || "general";
    const normalizedRelatedId = body.related_id || body.relatedId;
    const normalizedData = body.data ? {
      ...body.data,
      description: body.data.description || body.data.content,
      creator_name: body.data.creator_name || body.data.creatorName,
    } : undefined;

    // Handle test emails directly (not through queue)
    if (body.type === "test") {
      if (!resendKey) throw new Error("RESEND_API_KEY not configured");
      const { data: settings } = await supabase.from("email_settings").select("*").limit(1).maybeSingle();
      const senderName = settings?.sender_name || "WORKA";
      const senderEmail = settings?.smtp_email || "onboarding@resend.dev";
      const testEmail = settings?.smtp_email || "delivered@resend.dev";

      const testHtml = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align:center;margin-bottom:24px;"><h1 style="color:#2563eb;margin:0;font-size:24px;">WORKA</h1></div>
          <div style="text-align:center;"><p style="font-size:48px;margin:0;">✅</p><h2 style="color:#16a34a;">Email Service Connected!</h2>
          <p style="color:#555;">Resend + Brevo ready 🎉</p></div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <div style="text-align:center;"><p style="color:#2563eb;font-weight:bold;">— WORKA</p></div>
        </div></body></html>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: `${senderName} <${senderEmail}>`, to: [testEmail], subject: "✅ WORKA - Test Email!", html: testHtml }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      await supabase.from("email_logs").insert({
        recipient_email: testEmail, recipient_name: "Admin (Test)",
        subject: "✅ WORKA - Test Email!", body: testHtml,
        notification_type: "test", status: "sent", sent_at: new Date().toISOString(),
      });
      if (settings?.id) await supabase.from("email_settings").update({ is_connected: true, last_test_at: new Date().toISOString() }).eq("id", settings.id);

      return new Response(JSON.stringify({ success: true, message: "Test email sent!" }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Notification emails → enqueue
    if (!normalizedRecipientEmail) throw new Error("Recipient email is required");

    const isTransactional = TRANSACTIONAL.has(normalizedNotificationType);

    // Enqueue the email
    const { error: enqueueError } = await supabase.from("email_queue").insert({
      email_type: normalizedNotificationType,
      recipient_email: normalizedRecipientEmail,
      recipient_name: normalizedRecipientName,
      template_key: normalizedNotificationType,
      template_data: {
        ...normalizedData,
        user_id: normalizedData?.creator_name, // for preference checking
      },
      priority: isTransactional ? "high" : "medium",
      provider: isTransactional ? "resend" : "brevo",
      status: "pending",
      related_id: normalizedRelatedId,
      company_id: body.company_id,
      scheduled_at: new Date().toISOString(),
    });

    if (enqueueError) throw enqueueError;

    // Trigger worker for immediate processing
    try {
      await supabase.functions.invoke("email-worker", { body: { batch_size: 5 } });
    } catch (e) {
      console.log("Worker trigger deferred, queue will process later");
    }

    return new Response(JSON.stringify({ success: true, message: "Email queued" }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      if (requestBody) {
        await supabase.from("email_logs").insert({
          recipient_email: requestBody.recipient_email || "unknown",
          recipient_name: requestBody.recipient_name || null,
          subject: "Failed to enqueue",
          notification_type: requestBody.notification_type || "general",
          status: "failed", error_message: error.message,
        });
      }
    } catch (e) { console.error("Log error:", e); }

    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

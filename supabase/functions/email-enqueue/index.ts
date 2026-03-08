import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Transactional email types that use Resend (high priority)
const TRANSACTIONAL_TYPES = new Set([
  "welcome_user", "verify_email", "reset_password", "invite_user",
  "magic_login_link", "payment_confirmation", "invoice_created",
  "subscription_activated", "subscription_cancelled",
  "security_alert", "password_changed",
]);

// Notification types that use Brevo (medium priority)
const NOTIFICATION_TYPES = new Set([
  "task_assignment", "task_completed", "task_status_change",
  "task_mention", "task_overdue",
  "project_assignment", "meeting_invitation",
  "shooting_assignment", "shooting_status_update",
  "event_assignment", "comment_added", "file_uploaded",
]);

// Low priority types
const LOW_PRIORITY_TYPES = new Set([
  "weekly_summary", "monthly_summary", "feature_announcement",
  "blog_update", "system_maintenance_notice",
]);

function getProvider(emailType: string): string {
  if (TRANSACTIONAL_TYPES.has(emailType)) return "resend";
  return "brevo";
}

function getPriority(emailType: string): string {
  if (TRANSACTIONAL_TYPES.has(emailType)) return "high";
  if (LOW_PRIORITY_TYPES.has(emailType)) return "low";
  return "medium";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      recipient_email, recipient_name, email_type, template_key,
      template_data, related_id, company_id, batch_id,
      send_immediately, custom_html,
    } = body;

    if (!recipient_email) throw new Error("recipient_email is required");
    if (!email_type) throw new Error("email_type is required");

    const provider = getProvider(email_type);
    const priority = getPriority(email_type);

    // Insert into queue
    const { data: job, error } = await supabase.from("email_queue").insert({
      email_type,
      recipient_email,
      recipient_name: recipient_name || "User",
      template_key: template_key || email_type,
      template_data: { ...template_data, custom_html },
      priority,
      provider,
      status: "pending",
      related_id,
      company_id,
      batch_id,
      scheduled_at: new Date().toISOString(),
    }).select("id").single();

    if (error) throw error;

    // For high priority (transactional), trigger worker immediately
    if (priority === "high" || send_immediately) {
      try {
        await supabase.functions.invoke("email-worker", {
          body: { batch_size: 1 },
        });
      } catch (e) {
        console.error("Failed to trigger immediate worker:", e);
        // Job is still in queue, worker will pick it up later
      }
    }

    return new Response(JSON.stringify({ success: true, job_id: job.id, provider, priority }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Email enqueue error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

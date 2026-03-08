import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Send via Resend (transactional, high priority)
async function sendViaResend(apiKey: string, from: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend error: ${data.message || data.error?.message || res.status}`);
  return data;
}

// Send via Brevo (notifications, broadcasts, low priority)
async function sendViaBrevo(apiKey: string, from: { name: string; email: string }, to: string, subject: string, html: string) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: from,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Brevo error: ${data.message || JSON.stringify(data)}`);
  return data;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const brevoKey = Deno.env.get("BREVO_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const batchSize = body.batch_size || 20;

    // Fetch pending jobs ordered by priority then scheduled_at
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    const { data: jobs, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (fetchError) throw fetchError;
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "No pending jobs" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Sort by priority in memory
    const sorted = jobs.sort((a: any, b: any) => (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 2));

    let processed = 0, failed = 0;

    // Get email settings for sender info
    const { data: settings } = await supabase.from("email_settings").select("*").limit(1).maybeSingle();
    const senderName = settings?.sender_name || "WORKA";
    const resendSenderEmail = settings?.smtp_email || "onboarding@resend.dev";
    const brevoSenderEmail = (settings as any)?.brevo_sender_email || resendSenderEmail;

    // Get email templates
    const templateKeys = [...new Set(sorted.map((j: any) => j.template_key).filter(Boolean))];
    let templates: Record<string, any> = {};
    if (templateKeys.length > 0) {
      const { data: tpls } = await supabase
        .from("email_templates")
        .select("template_key, subject, greeting, main_message, button_text, footer_text, is_active")
        .in("template_key", templateKeys);
      if (tpls) {
        tpls.forEach((t: any) => { templates[t.template_key] = t; });
      }
    }

    for (const job of sorted) {
      // Mark as processing
      await supabase.from("email_queue").update({ status: "processing" }).eq("id", job.id);

      try {
        // Check user email preferences
        if (job.template_data?.user_id) {
          const { data: prefs } = await supabase
            .from("email_preferences")
            .select("*")
            .eq("user_id", job.template_data.user_id)
            .maybeSingle();

          if (prefs) {
            const prefMap: Record<string, string> = {
              task_assignment: "task_notifications", task_completed: "task_notifications",
              task_status_change: "task_notifications", task_mention: "task_notifications",
              task_overdue: "task_notifications",
              project_assignment: "project_updates",
              meeting_invitation: "meeting_invitations",
              shooting_assignment: "shooting_notifications", shooting_status_update: "shooting_notifications",
              event_assignment: "event_notifications",
              weekly_summary: "weekly_reports", monthly_summary: "weekly_reports",
              feature_announcement: "product_updates", blog_update: "product_updates",
            };
            const prefKey = prefMap[job.email_type];
            if (prefKey && prefs[prefKey] === false) {
              await supabase.from("email_queue").update({ status: "cancelled", processed_at: new Date().toISOString(), error_message: "User disabled this notification type" }).eq("id", job.id);
              continue;
            }
          }
        }

        // Build email content
        const tplData = job.template_data || {};
        const template = templates[job.template_key];
        const recipientName = job.recipient_name || "User";
        const firstName = recipientName.split(" ")[0];

        const replaceVars = (text: string) => {
          return text
            .replace(/\{\{recipient_name\}\}/g, recipientName)
            .replace(/\{\{first_name\}\}/g, firstName)
            .replace(/\{\{title\}\}/g, tplData.title || "")
            .replace(/\{\{creator_name\}\}/g, tplData.creator_name || "")
            .replace(/\{\{deadline\}\}/g, tplData.deadline || "")
            .replace(/\{\{priority\}\}/g, tplData.priority || "")
            .replace(/\{\{status\}\}/g, tplData.status || "")
            .replace(/\{\{link\}\}/g, tplData.link || "#")
            .replace(/\{\{location\}\}/g, tplData.location || "")
            .replace(/\{\{comment_content\}\}/g, tplData.comment_content || "")
            .replace(/\{\{updated_at\}\}/g, tplData.updated_at || "")
            .replace(/\{\{description\}\}/g, tplData.description || "")
            .replace(/\{\{participants\}\}/g, tplData.participants || "");
        };

        const greeting = template ? replaceVars(template.greeting) : `Halo @${firstName} 👋`;
        const mainMessage = template ? replaceVars(template.main_message) : "Ada update baru buat lo:";
        const buttonText = template ? replaceVars(template.button_text) : "Lihat Detail";
        const footerText = template ? replaceVars(template.footer_text) : "";

        const subject = template ? replaceVars(template.subject) : `Hi @${firstName} – ada update nih 🚀`;

        // Build HTML body with fixed layout
        const label = getNotificationLabel(job.email_type);
        let additionalInfo = "";
        if (tplData.comment_content && job.email_type === "task_mention") {
          additionalInfo += `<div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:12px;margin:12px 0;border-radius:0 8px 8px 0;"><p style="margin:0;font-style:italic;color:#0369a1;">"${tplData.comment_content}"</p></div>`;
        }
        if (tplData.priority) additionalInfo += `<p>🔥 Prioritas: <strong>${tplData.priority}</strong></p>`;
        if (tplData.status) additionalInfo += `<p>📊 Status: <strong>${tplData.status}</strong></p>`;
        if (tplData.participants) additionalInfo += `<p>👥 Peserta: ${tplData.participants}</p>`;
        if (tplData.location) additionalInfo += `<p>📍 Lokasi: ${tplData.location}</p>`;
        if (tplData.updated_at) additionalInfo += `<p>📅 Waktu: <strong>${tplData.updated_at}</strong></p>`;

        const htmlBody = tplData.custom_html || buildStandardEmail({
          greeting, mainMessage, buttonText, footerText, label,
          title: tplData.title, description: tplData.description,
          deadline: tplData.deadline, creator_name: tplData.creator_name,
          link: tplData.link, additionalInfo, emailType: job.email_type,
        });

        // Route to correct provider
        if (job.provider === "brevo" && brevoKey) {
          await sendViaBrevo(brevoKey, { name: senderName, email: brevoSenderEmail }, job.recipient_email, subject, htmlBody);
        } else if (resendKey) {
          await sendViaResend(resendKey, `${senderName} <${resendSenderEmail}>`, job.recipient_email, subject, htmlBody);
        } else {
          throw new Error("No email provider API key configured");
        }

        // Mark success
        await supabase.from("email_queue").update({ status: "sent", processed_at: new Date().toISOString() }).eq("id", job.id);

        // Log
        await supabase.from("email_logs").insert({
          recipient_email: job.recipient_email,
          recipient_name: recipientName,
          subject, body: htmlBody,
          notification_type: job.email_type,
          related_id: job.related_id,
          status: "sent",
          sent_at: new Date().toISOString(),
        });

        processed++;
      } catch (err: any) {
        const retryCount = (job.retry_count || 0) + 1;
        const newStatus = retryCount >= (job.max_retries || 3) ? "failed" : "pending";
        await supabase.from("email_queue").update({
          status: newStatus,
          retry_count: retryCount,
          error_message: err.message,
          processed_at: newStatus === "failed" ? new Date().toISOString() : null,
        }).eq("id", job.id);

        if (newStatus === "failed") {
          await supabase.from("email_logs").insert({
            recipient_email: job.recipient_email,
            recipient_name: job.recipient_name,
            subject: "Failed",
            notification_type: job.email_type,
            related_id: job.related_id,
            status: "failed",
            error_message: err.message,
          });
        }
        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, processed, failed, total: sorted.length }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Email worker error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

function getNotificationLabel(type: string): string {
  const labels: Record<string, string> = {
    task_assignment: "Task", task_completed: "Task", task_status_change: "Task",
    task_mention: "Task", task_overdue: "Task",
    project_assignment: "Project", shooting_assignment: "Shooting",
    shooting_status_update: "Shooting", event_assignment: "Event",
    meeting_invitation: "Meeting", announcement: "Pengumuman",
    broadcast: "Broadcast", welcome_user: "Welcome",
  };
  return labels[type] || "Notifikasi";
}

function buildStandardEmail(opts: {
  greeting: string; mainMessage: string; buttonText: string; footerText: string;
  label: string; title?: string; description?: string; deadline?: string;
  creator_name?: string; link?: string; additionalInfo: string; emailType: string;
}): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
<div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
  <div style="text-align:center;margin-bottom:24px;"><h1 style="color:#2563eb;margin:0;font-size:24px;">WORKA</h1></div>
  <p style="font-size:18px;color:#333;">${opts.greeting}</p>
  <p style="color:#555;font-size:16px;">${opts.mainMessage}</p>
  <div style="background:#f8fafc;border-left:4px solid #2563eb;padding:16px;margin:20px 0;border-radius:0 8px 8px 0;">
    <p style="margin:8px 0;"><strong>📌 Jenis:</strong> ${opts.label}</p>
    ${opts.title ? `<p style="margin:8px 0;"><strong>📝 Judul:</strong> ${opts.title}</p>` : ""}
    ${opts.description ? `<p style="margin:8px 0;"><strong>ℹ️ Deskripsi:</strong> ${opts.description}</p>` : ""}
    ${opts.deadline ? `<p style="margin:8px 0;"><strong>📅 Deadline:</strong> ${opts.deadline}</p>` : ""}
    ${opts.creator_name ? `<p style="margin:8px 0;"><strong>👤 Oleh:</strong> ${opts.creator_name}</p>` : ""}
    ${opts.additionalInfo}
  </div>
  ${opts.link ? `<div style="text-align:center;margin:24px 0;"><a href="${opts.link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;">🔗 ${opts.buttonText}</a></div>` : ""}
  ${opts.footerText ? `<p style="color:#555;font-style:italic;">${opts.footerText}</p>` : ""}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <div style="text-align:center;">
    <p style="color:#2563eb;font-weight:bold;margin:0;">— WORKA</p>
    <p style="color:#888;font-size:14px;margin:8px 0 0;">Biar kerjaan rapi & tim makin enak kerjanya ✨</p>
  </div>
  <p style="color:#999;font-size:12px;text-align:center;margin-top:24px;">Email ini dikirim otomatis dari WORKA.<br>Kalau merasa tidak terkait, hubungi admin ya.</p>
</div>
</body></html>`;
}

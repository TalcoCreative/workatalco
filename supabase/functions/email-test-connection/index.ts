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
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const brevoKey = Deno.env.get("BREVO_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { provider, test_email } = body;

    const { data: settings } = await supabase.from("email_settings").select("*").limit(1).maybeSingle();
    const senderName = settings?.sender_name || "WORKA";
    const senderEmail = settings?.smtp_email || "onboarding@resend.dev";
    const brevoSenderEmail = settings?.brevo_sender_email || "";

    const results: Record<string, { connected: boolean; message: string; details?: any }> = {};

    // ─── Test Resend ───
    if (!provider || provider === "resend") {
      if (!resendKey) {
        results.resend = { connected: false, message: "RESEND_API_KEY not configured" };
      } else {
        try {
          // 1. Validate API key via domains endpoint (if key has domain scope)
          const domainRes = await fetch("https://api.resend.com/domains", {
            headers: { "Authorization": `Bearer ${resendKey}` },
          });
          const domainData = await domainRes.json();

          const domainErrorMessage = String(domainData?.message || domainData?.error || "");
          const isSendOnlyKey = !domainRes.ok && domainErrorMessage.toLowerCase().includes("restricted to only send emails");

          let domains: any[] = [];
          let verifiedDomains: any[] = [];
          let hasVerifiedDomain = false;

          if (domainRes.ok) {
            domains = domainData.data || [];
            verifiedDomains = domains.filter((d: any) => d.status === "verified");
            hasVerifiedDomain = verifiedDomains.length > 0;
          } else if (!isSendOnlyKey) {
            results.resend = { connected: false, message: `API Key invalid: ${domainErrorMessage || domainRes.status}` };
          }

          if (results.resend?.connected === false) {
            // stop resend test flow when key is invalid
          } else {

          if (test_email) {
            // Determine best from address: use configured sender email if set, else verified domain, else onboarding
            let fromAddr = `${senderName} <onboarding@resend.dev>`;
            if (senderEmail && senderEmail !== "onboarding@resend.dev") {
              fromAddr = `${senderName} <${senderEmail}>`;
            } else if (hasVerifiedDomain) {
              const vd = verifiedDomains[0];
              fromAddr = `${senderName} <noreply@${vd.name}>`;
            }

            try {
              const sendRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  from: fromAddr,
                  to: [test_email],
                  subject: "✅ WORKA - Resend Test Email",
                  html: buildTestHtml("Resend", "Transactional email provider berhasil terkoneksi!"),
                }),
              });
              const sendData = await sendRes.json();

              if (!sendRes.ok) {
                const errMsg = sendData.message || JSON.stringify(sendData);
                const isTestRestriction = errMsg.includes("only send testing emails to your own email");
                results.resend = {
                  connected: true,
                  message: isTestRestriction
                    ? "API Key valid ✅ | Mode testing Resend: kirim ke email owner akun dulu, atau verifikasi domain untuk kirim ke email lain"
                    : `API Key valid ✅ | Send error: ${errMsg}`,
                  details: {
                    domains: domains.length,
                    verified: verifiedDomains.length,
                    domain_list: domains.map((d: any) => ({ name: d.name, status: d.status })),
                    key_mode: isSendOnlyKey ? "send_only" : "full",
                    send_error: isTestRestriction ? "Perlu verified domain atau kirim ke owner email" : errMsg,
                    hint: isTestRestriction
                      ? "Resend kamu aktif, tapi masih mode test limitation"
                      : undefined,
                  },
                };
              } else {
                results.resend = {
                  connected: true,
                  message: `Connected & email terkirim ke ${test_email} ✅`,
                  details: {
                    domains: domains.length,
                    verified: verifiedDomains.length,
                    key_mode: isSendOnlyKey ? "send_only" : "full",
                    email_id: sendData.id,
                  },
                };
              }
            } catch (e: any) {
              results.resend = {
                connected: true,
                message: `API Key valid ✅ | Network error: ${e.message}`,
                details: { domains: domains.length, key_mode: isSendOnlyKey ? "send_only" : "full" },
              };
            }
          } else {
            // Connection check only (no send)
            const hasConfiguredSender = senderEmail && senderEmail !== "onboarding@resend.dev";
            results.resend = {
              connected: true,
              message: isSendOnlyKey
                ? hasConfiguredSender
                  ? `API Key valid ✅ (send-only). Sender: ${senderEmail}`
                  : "API Key valid ✅ (send-only key). Set sender email di Pengaturan dengan domain verified."
                : hasVerifiedDomain
                  ? `API Key valid ✅ — ${verifiedDomains.length} verified domain(s)`
                  : hasConfiguredSender
                    ? `API Key valid ✅ — Sender: ${senderEmail} (domain belum terdeteksi via API, tapi bisa jadi key send-only)`
                    : "API Key valid ✅ — Belum ada verified domain (mode testing)",
              details: {
                domains: domains.length,
                verified: verifiedDomains.length,
                domain_list: domains.map((d: any) => ({ name: d.name, status: d.status })),
                key_mode: isSendOnlyKey ? "send_only" : "full",
                configured_sender: senderEmail,
              },
            };
          }
        }
      } catch (e: any) {
        results.resend = { connected: false, message: `Connection error: ${e.message}` };
      }
      }
    }

    // ─── Test Brevo ───
    if (!provider || provider === "brevo") {
      if (!brevoKey) {
        results.brevo = { connected: false, message: "BREVO_API_KEY not configured" };
      } else {
        try {
          // 1. Validate API key via account endpoint
          const accountRes = await fetch("https://api.brevo.com/v3/account", {
            headers: { "api-key": brevoKey },
          });
          const accountData = await accountRes.json();

          if (!accountRes.ok) {
            results.brevo = { connected: false, message: `API Key invalid: ${accountData.message || accountRes.status}` };
          } else {
            const plan = accountData.plan || [];

            // 2. Get verified senders
            const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
              headers: { "api-key": brevoKey },
            });
            const sendersData = await sendersRes.json();
            const senders = sendersData.senders || [];
            const activeSenders = senders.filter((s: any) => s.active);

            if (test_email) {
              // Use configured sender, or match from active senders, or fallback
              let brevoSender: { name: string; email: string };
              if (brevoSenderEmail) {
                const matched = activeSenders.find((s: any) => s.email.toLowerCase() === brevoSenderEmail.toLowerCase());
                brevoSender = matched
                  ? { name: matched.name, email: matched.email }
                  : { name: senderName, email: brevoSenderEmail };
              } else if (activeSenders.length > 0) {
                brevoSender = { name: activeSenders[0].name, email: activeSenders[0].email };
              } else {
                brevoSender = { name: senderName, email: accountData.email };
              }

              try {
                const sendRes = await fetch("https://api.brevo.com/v3/smtp/email", {
                  method: "POST",
                  headers: { "api-key": brevoKey, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sender: brevoSender,
                    to: [{ email: test_email, name: "Test Recipient" }],
                    subject: "✅ WORKA - Brevo Test Email",
                    htmlContent: buildTestHtml("Brevo", "Notification & broadcast email provider berhasil terkoneksi!"),
                  }),
                });
                const sendData = await sendRes.json();

                if (!sendRes.ok) {
                  const errMsg = sendData.message || JSON.stringify(sendData);
                  results.brevo = {
                    connected: true,
                    message: `API Key valid ✅ | Send error: ${errMsg}`,
                    details: {
                      company: accountData.companyName,
                      email: accountData.email,
                      senders: activeSenders.map((s: any) => s.email),
                      send_error: errMsg,
                      hint: "Pastikan sender email sudah diverifikasi di Brevo",
                    },
                  };
                } else {
                  results.brevo = {
                    connected: true,
                    message: `Connected & email terkirim ke ${test_email} ✅ (via ${brevoSender.email})`,
                    details: {
                      company: accountData.companyName,
                      email: accountData.email,
                      sender_used: brevoSender.email,
                      message_id: sendData.messageId,
                      senders: activeSenders.map((s: any) => s.email),
                    },
                  };
                }
              } catch (e: any) {
                results.brevo = { connected: true, message: `API Key valid ✅ | Network error: ${e.message}`, details: { company: accountData.companyName } };
              }
            } else {
              const configuredSenderMatch = brevoSenderEmail
                ? activeSenders.some((s: any) => s.email.toLowerCase() === brevoSenderEmail.toLowerCase())
                : null;
              results.brevo = {
                connected: true,
                message: brevoSenderEmail
                  ? (configuredSenderMatch
                    ? `API Key valid ✅ — Sender: ${brevoSenderEmail} (verified ✅)`
                    : `API Key valid ✅ — ⚠️ Sender ${brevoSenderEmail} belum verified di Brevo!`)
                  : `API Key valid ✅ — Account: ${accountData.companyName || accountData.email}`,
                details: {
                  company: accountData.companyName,
                  email: accountData.email,
                  configured_sender: brevoSenderEmail || "(belum diset di Pengaturan)",
                  senders: activeSenders.map((s: any) => s.email),
                  plan: plan.map((p: any) => ({ type: p.type, credits: p.credits })),
                  hint: activeSenders.length === 0
                    ? "Belum ada verified sender di Brevo"
                    : brevoSenderEmail && !configuredSenderMatch
                      ? `Email ${brevoSenderEmail} belum ada di daftar sender Brevo. Tambahkan & verifikasi di Brevo → Settings → Senders.`
                      : undefined,
                },
              };
            }
          }
        } catch (e: any) {
          results.brevo = { connected: false, message: `Connection error: ${e.message}` };
        }
      }
    }

    // Update email_settings
    const allConnected = Object.values(results).every((r) => r.connected);
    if (settings?.id) {
      await supabase.from("email_settings").update({ is_connected: allConnected, last_test_at: new Date().toISOString() }).eq("id", settings.id);
    }

    // Log
    const logSubject = `Provider Test: ${Object.entries(results).map(([k, v]) => `${k}=${v.connected ? "✅" : "❌"}`).join(", ")}`;
    await supabase.from("email_logs").insert({
      recipient_email: test_email || "connection-test",
      recipient_name: "Admin (Connection Test)",
      subject: logSubject,
      notification_type: "test",
      status: allConnected ? "sent" : "failed",
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, results, all_connected: allConnected }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Test connection error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

function buildTestHtml(provider: string, message: string): string {
  const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;margin:0;padding:0;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
  <tr><td style="background:#2563eb;padding:24px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:24px;letter-spacing:1px;">WORKA</h1>
  </td></tr>
  <tr><td style="padding:40px 32px;text-align:center;">
    <p style="font-size:48px;margin:0 0 16px;">✅</p>
    <h2 style="color:#16a34a;margin:0 0 8px;font-size:22px;">${provider} Connected!</h2>
    <p style="color:#555;font-size:16px;margin:0 0 24px;">${message}</p>
    <table cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin:0 auto;width:100%;">
      <tr><td style="padding:16px;">
        <p style="margin:0;color:#15803d;font-weight:600;">Provider: ${provider}</p>
        <p style="margin:4px 0 0;color:#166534;font-size:14px;">Test berhasil pada: ${now} WIB</p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="border-top:1px solid #e5e7eb;padding:24px 32px;text-align:center;">
    <p style="color:#2563eb;font-weight:bold;margin:0;font-size:14px;">— WORKA Email Infrastructure</p>
    <p style="color:#888;font-size:13px;margin:8px 0 0;">Dual-provider: Resend + Brevo ✨</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

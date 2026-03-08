import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Send welcome email to new team member
async function sendWelcomeEmail(
  supabaseUrl: string,
  email: string,
  fullName: string,
  role: string,
  password: string
): Promise<void> {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping welcome email");
      return;
    }

    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: settings } = await supabase
      .from("email_settings")
      .select("sender_name, smtp_email")
      .limit(1)
      .single();

    const senderName = settings?.sender_name || "Talco System";
    const senderEmail = settings?.smtp_email || "onboarding@resend.dev";
    const fromAddress = `${senderName} <${senderEmail}>`;

    const firstName = fullName.split(" ")[0];
    const roleLabel = role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Talco System</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 24px;">Talco System</h1>
          </div>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <p style="font-size: 48px; margin: 0;">🎉</p>
            <h2 style="color: #16a34a; margin: 16px 0;">Welcome to the Team!</h2>
          </div>
          
          <p style="font-size: 18px; color: #333;">Halo @${firstName} 👋</p>
          
          <p style="color: #555; font-size: 16px;">Selamat datang di Talco! Akun lo udah siap nih. Ini dia detail loginnya:</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 8px 0;"><strong>📧 Email:</strong> ${email}</p>
            <p style="margin: 8px 0;"><strong>🔑 Password:</strong> ${password}</p>
            <p style="margin: 8px 0;"><strong>👤 Role:</strong> ${roleLabel}</p>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 16px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ <strong>Penting:</strong> Segera ganti password setelah login pertama ya!</p>
          </div>
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://managementtalco.lovable.app/auth" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">🚀 Login Sekarang</a>
          </div>
          
          <p style="color: #555;">Kalau ada pertanyaan, hubungi admin atau HR ya!</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          
          <div style="text-align: center;">
            <p style="color: #2563eb; font-weight: bold; margin: 0;">— Talco System</p>
            <p style="color: #888; font-size: 14px; margin: 8px 0 0 0;">Biar kerjaan rapi & tim makin enak kerjanya ✨</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: `🎉 Selamat datang di Talco, @${firstName}!`,
        html: htmlBody,
      }),
    });

    const data = await response.json();
    console.log("Welcome email response:", JSON.stringify(data, null, 2));

    await supabase.from("email_logs").insert({
      recipient_email: email,
      recipient_name: fullName,
      subject: `🎉 Selamat datang di Talco, @${firstName}!`,
      body: htmlBody,
      notification_type: "welcome",
      status: response.ok ? "sent" : "failed",
      sent_at: response.ok ? new Date().toISOString() : null,
      error_message: response.ok ? null : (data.message || "Failed to send"),
    });

    if (response.ok) {
      console.log("Welcome email sent successfully to:", email);
    } else {
      console.error("Failed to send welcome email:", data);
    }
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if requesting user is super_admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuperAdmin = roles?.some((r) => r.role === "super_admin");
    if (!isSuperAdmin) {
      throw new Error("Only super admins can create users");
    }

    const { email, password, fullName, role, companyId } = await req.json();

    if (!email || !password || !fullName || !role) {
      throw new Error("Missing required fields");
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    console.log("Creating user:", { email: normalizedEmail, fullName, role, companyId });

    // Resolve target company
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const { data: adminMembership } = await supabaseAdmin
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      targetCompanyId = adminMembership?.company_id;
    }

    if (!targetCompanyId) {
      throw new Error("Tidak dapat menentukan workspace. Pastikan Anda tergabung di sebuah workspace.");
    }

    // Check max_users capacity
    const { data: company, error: companyFetchError } = await supabaseAdmin
      .from("companies")
      .select("max_users, subscription_tier, name")
      .eq("id", targetCompanyId)
      .single();

    if (companyFetchError || !company) {
      throw new Error("Workspace tidak ditemukan.");
    }

    const { data: existingMembers } = await supabaseAdmin
      .from("company_members")
      .select("user_id")
      .eq("company_id", targetCompanyId);

    const currentCount = existingMembers?.length || 0;
    if (currentCount >= (company.max_users || 3)) {
      throw new Error(`Kapasitas user workspace "${company.name}" sudah penuh (${currentCount}/${company.max_users}). Upgrade plan untuk menambah user.`);
    }

    // Find existing profile by email/user_id to support re-linking users that are not attached to another company
    let existingProfile: { id: string } | null = null;

    const { data: byEmail } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (byEmail) {
      existingProfile = byEmail;
    } else {
      const { data: byUserId } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", normalizedEmail)
        .maybeSingle();
      existingProfile = byUserId;
    }

    let targetUserId: string | null = existingProfile?.id ?? null;
    let createdUserForResponse: { id: string; email?: string | null } | null = null;
    let shouldSendWelcomeEmail = false;

    if (targetUserId) {
      const { data: memberships, error: membershipError } = await supabaseAdmin
        .from("company_members")
        .select("company_id")
        .eq("user_id", targetUserId);

      if (membershipError) {
        throw new Error("Gagal memeriksa membership user.");
      }

      const alreadyInTargetCompany = (memberships || []).some((m) => m.company_id === targetCompanyId);
      const inOtherCompany = (memberships || []).some((m) => m.company_id !== targetCompanyId);

      if (inOtherCompany) {
        throw new Error("Email ini sudah digunakan. Silakan gunakan email lain untuk mendaftarkan user baru.");
      }

      if (alreadyInTargetCompany) {
        throw new Error("Email ini sudah terdaftar di workspace ini.");
      }

      // Update account credentials/profile for existing detached user
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (authUpdateError) {
        console.error("Error updating existing auth user:", authUpdateError);
        throw new Error("Akun dengan email ini ditemukan tapi tidak bisa diperbarui. Hubungi admin platform.");
      }

      await supabaseAdmin
        .from("profiles")
        .upsert({
          id: targetUserId,
          full_name: fullName,
          user_id: normalizedEmail,
          email: normalizedEmail,
        }, { onConflict: "id" });

      createdUserForResponse = { id: targetUserId, email: normalizedEmail };
    } else {
      // Create new auth user if email not found
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (createError || !newUser?.user?.id) {
        console.error("Error creating user:", createError);
        throw createError || new Error("Gagal membuat user baru");
      }

      targetUserId = newUser.user.id;
      createdUserForResponse = { id: newUser.user.id, email: newUser.user.email };
      shouldSendWelcomeEmail = true;

      // Create profile for the new user (trigger may not exist)
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: targetUserId,
          full_name: fullName,
          user_id: normalizedEmail,
          email: normalizedEmail,
        }, { onConflict: "id" });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Don't throw - try to continue
      } else {
        console.log("Profile created successfully");
      }
    }

    if (!targetUserId) {
      throw new Error("Gagal menentukan ID user.");
    }

    console.log("User ready:", targetUserId);

    // Remove default role assigned by trigger (if trigger exists) to avoid duplicates
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId);

    // Assign the requested role to the user
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: targetUserId,
        role: role,
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      throw roleError;
    }

    console.log("Role assigned successfully");

    // Add user to the target company
    const { error: memberError } = await supabaseAdmin
      .from("company_members")
      .insert({
        user_id: targetUserId,
        company_id: targetCompanyId,
        role: "member",
      });

    if (memberError) {
      console.error("Error adding company member:", memberError);
      throw new Error("User berhasil dibuat tapi gagal ditambahkan ke workspace: " + memberError.message);
    }
    console.log("User added to company:", targetCompanyId);

    // Auto-assign matching dynamic access role
    const roleLabel = role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
    const { data: dynRole } = await supabaseAdmin
      .from("dynamic_roles")
      .select("id")
      .eq("name", roleLabel)
      .maybeSingle();

    if (dynRole) {
      await supabaseAdmin.from("user_dynamic_roles").upsert(
        { user_id: targetUserId, role_id: dynRole.id, assigned_by: user.id },
        { onConflict: "user_id" }
      );
      console.log("Dynamic role auto-assigned:", roleLabel);
    }

    // Send welcome email only for newly created auth user
    if (shouldSendWelcomeEmail) {
      await sendWelcomeEmail(supabaseUrl, normalizedEmail, fullName, role, password);
    }

    return new Response(
      JSON.stringify({ success: true, user: createdUserForResponse }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { companyId, userId } = await req.json();
    if (!companyId || !userId) throw new Error("companyId and userId required");

    console.log("Seeding dummy data for company:", companyId);

    // ── 1. Clients ──
    const { data: clients } = await supabaseAdmin.from("clients").insert([
      { name: "(Dummy) PT Maju Bersama", email: "dummy1@example.com", phone: "081200000001", company: "PT Maju Bersama", status: "active", created_by: userId, company_id: companyId, industry: "Technology" },
      { name: "(Dummy) CV Kreatif Nusantara", email: "dummy2@example.com", phone: "081200000002", company: "CV Kreatif Nusantara", status: "active", created_by: userId, company_id: companyId, industry: "Creative Agency" },
    ]).select("id");

    const clientId1 = clients?.[0]?.id;
    const clientId2 = clients?.[1]?.id;
    console.log("Clients seeded:", clientId1, clientId2);

    // ── 2. Projects ──
    const { data: projects } = await supabaseAdmin.from("projects").insert([
      { title: "(Dummy) Website Redesign", description: "Redesign website perusahaan dengan tampilan modern", status: "in_progress", client_id: clientId1!, company_id: companyId, assigned_to: userId },
      { title: "(Dummy) Social Media Campaign", description: "Kampanye media sosial untuk Q2", status: "pending", client_id: clientId2!, company_id: companyId, assigned_to: userId },
    ]).select("id");

    const projectId1 = projects?.[0]?.id;
    const projectId2 = projects?.[1]?.id;
    console.log("Projects seeded:", projectId1, projectId2);

    // ── 3. Tasks ──
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date(); nextMonth.setDate(nextMonth.getDate() + 30);
    await supabaseAdmin.from("tasks").insert([
      { title: "(Dummy) Buat wireframe homepage", description: "Membuat wireframe untuk halaman utama website", priority: "high", status: "in_progress", project_id: projectId1!, assigned_to: userId, created_by: userId, deadline: nextWeek.toISOString().split("T")[0] },
      { title: "(Dummy) Riset kompetitor", description: "Analisis kompetitor untuk strategi konten", priority: "medium", status: "todo", project_id: projectId2!, assigned_to: userId, created_by: userId, deadline: nextMonth.toISOString().split("T")[0] },
    ]);
    console.log("Tasks seeded");

    // ── 4. Shooting Schedules ──
    const shootDate1 = new Date(); shootDate1.setDate(shootDate1.getDate() + 14);
    const shootDate2 = new Date(); shootDate2.setDate(shootDate2.getDate() + 21);
    await supabaseAdmin.from("shooting_schedules").insert([
      { title: "(Dummy) Product Photoshoot", scheduled_date: shootDate1.toISOString().split("T")[0], scheduled_time: "10:00", location: "Studio A", status: "pending", requested_by: userId, client_id: clientId1!, project_id: projectId1! },
      { title: "(Dummy) Behind The Scene Video", scheduled_date: shootDate2.toISOString().split("T")[0], scheduled_time: "14:00", location: "On Location", status: "pending", requested_by: userId, client_id: clientId2!, project_id: projectId2! },
    ]);
    console.log("Shootings seeded");

    // ── 5. Meetings ──
    const meetDate1 = new Date(); meetDate1.setDate(meetDate1.getDate() + 3);
    const meetDate2 = new Date(); meetDate2.setDate(meetDate2.getDate() + 10);
    await supabaseAdmin.from("meetings").insert([
      { title: "(Dummy) Kickoff Meeting", meeting_date: meetDate1.toISOString().split("T")[0], start_time: "10:00", end_time: "11:00", mode: "online", meeting_link: "https://meet.google.com/dummy", created_by: userId, status: "scheduled", client_id: clientId1!, project_id: projectId1! },
      { title: "(Dummy) Weekly Sync", meeting_date: meetDate2.toISOString().split("T")[0], start_time: "14:00", end_time: "15:00", mode: "online", meeting_link: "https://meet.google.com/dummy2", created_by: userId, status: "scheduled", client_id: clientId2!, project_id: projectId2! },
    ]);
    console.log("Meetings seeded");

    // ── 6. Events ──
    const eventDate1 = new Date(); eventDate1.setDate(eventDate1.getDate() + 30);
    const eventDate2 = new Date(); eventDate2.setDate(eventDate2.getDate() + 45);
    await supabaseAdmin.from("events").insert([
      { name: "(Dummy) Product Launch Event", event_type: "launch", location: "Jakarta Convention Center", start_date: eventDate1.toISOString(), end_date: eventDate1.toISOString(), status: "planning", created_by: userId, client_id: clientId1!, project_id: projectId1! },
      { name: "(Dummy) Brand Activation", event_type: "activation", location: "Mall Grand Indonesia", start_date: eventDate2.toISOString(), end_date: eventDate2.toISOString(), status: "planning", created_by: userId, client_id: clientId2!, project_id: projectId2! },
    ]);
    console.log("Events seeded");

    // ── 7. Assets ──
    await supabaseAdmin.from("assets").insert([
      { name: "(Dummy) Canon EOS R5", code: "DUM-CAM-001", category: "Kamera", default_location: "Studio A", condition: "baik", status: "available", created_by: userId },
      { name: "(Dummy) DJI Ronin RS3", code: "DUM-STB-001", category: "Stabilizer", default_location: "Studio A", condition: "baik", status: "available", created_by: userId },
    ]);
    console.log("Assets seeded");

    // ── 8. Platform Accounts (Reports) ──
    await supabaseAdmin.from("platform_accounts").insert([
      { client_id: clientId1!, platform: "Instagram", account_name: "(Dummy) @majubersama", username_url: "https://instagram.com/majubersama", status: "active", created_by: userId },
      { client_id: clientId2!, platform: "TikTok", account_name: "(Dummy) @kreatifindonesia", username_url: "https://tiktok.com/@kreatifindonesia", status: "active", created_by: userId },
    ]);
    console.log("Platform accounts seeded");

    // ── 9. Letters ──
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    await supabaseAdmin.from("letters").insert([
      { letter_number: "DUM/SPK/I/2026/001", entity_code: "DUM", entity_name: "Dummy Corp", category_code: "SPK", category_name: "Surat Perintah Kerja", recipient_name: "(Dummy) PT Maju Bersama", recipient_company: "PT Maju Bersama", status: "draft", created_by: userId, running_number: 1, year: currentYear, month: currentMonth },
      { letter_number: "DUM/PKS/I/2026/002", entity_code: "DUM", entity_name: "Dummy Corp", category_code: "PKS", category_name: "Perjanjian Kerjasama", recipient_name: "(Dummy) CV Kreatif Nusantara", recipient_company: "CV Kreatif Nusantara", status: "draft", created_by: userId, running_number: 2, year: currentYear, month: currentMonth },
    ]);
    console.log("Letters seeded");

    // ── 10. KOL Database ──
    await supabaseAdmin.from("kol_database").insert([
      { name: "(Dummy) Sarah Influencer", username: "@sarahinfluencer", ig_followers: 50000, tiktok_followers: 30000, category: "micro", industry: "Lifestyle", created_by: userId, updated_by: userId, company_id: companyId },
      { name: "(Dummy) Budi Creator", username: "@budicreator", ig_followers: 120000, tiktok_followers: 80000, category: "macro", industry: "Technology", created_by: userId, updated_by: userId, company_id: companyId },
    ]);
    console.log("KOL Database seeded");

    // ── 11. KOL Campaigns ──
    await supabaseAdmin.from("kol_campaigns").insert([
      { campaign_name: "(Dummy) Brand Awareness Q1", client_id: clientId1!, platform: "Instagram", status: "active", fee: 5000000, created_by: userId, updated_by: userId, company_id: companyId },
      { campaign_name: "(Dummy) Product Review Series", client_id: clientId2!, platform: "TikTok", status: "draft", fee: 3000000, created_by: userId, updated_by: userId, company_id: companyId },
    ]);
    console.log("KOL Campaigns seeded");

    // ── 12. Recruitment Forms (Form Builder) ──
    await supabaseAdmin.from("recruitment_forms").insert([
      { name: "(Dummy) Formulir Lamaran Graphic Designer", position: "Graphic Designer", description: "Form untuk melamar posisi Graphic Designer", slug: `dummy-gd-${companyId.slice(0, 8)}`, status: "active", created_by: userId, company_id: companyId },
      { name: "(Dummy) Formulir Lamaran Content Writer", position: "Content Writer", description: "Form untuk melamar posisi Content Writer", slug: `dummy-cw-${companyId.slice(0, 8)}`, status: "active", created_by: userId, company_id: companyId },
    ]);
    console.log("Recruitment Forms seeded");

    // ── 13. Editorial Plans ──
    await supabaseAdmin.from("editorial_plans").insert([
      { title: "(Dummy) Content Plan Januari", client_id: clientId1!, slug: `dummy-ep1-${companyId.slice(0, 8)}`, period: "2026-01", created_by: userId, company_id: companyId },
      { title: "(Dummy) Content Plan Februari", client_id: clientId2!, slug: `dummy-ep2-${companyId.slice(0, 8)}`, period: "2026-02", created_by: userId, company_id: companyId },
    ]);
    console.log("Editorial Plans seeded");

    console.log("All dummy data seeded successfully for company:", companyId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed dummy data error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

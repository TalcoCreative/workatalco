import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const rand = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDate = (daysBack: number) => { const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * daysBack)); return d.toISOString().split("T")[0]; };
const futureDate = (daysAhead: number) => { const d = new Date(); d.setDate(d.getDate() + Math.floor(Math.random() * daysAhead) + 1); return d.toISOString().split("T")[0]; };
const randTime = () => `${String(randInt(8,18)).padStart(2,'0')}:${rand(['00','15','30','45'])}`;

const companies = [
  { name: "Talco Creative Indonesia", slug: "talco", tier: "enterprise", maxUsers: 100 },
  { name: "PT Digital Nusantara", slug: "digital-nusantara", tier: "professional", maxUsers: 30 },
  { name: "Startup Maju Jaya", slug: "startup-maju", tier: "starter", maxUsers: 10 },
  { name: "Kreasi Media Group", slug: "kreasi-media", tier: "trial", maxUsers: 5 },
  { name: "Bintang Advertising", slug: "bintang-ads", tier: "professional", maxUsers: 25 },
];

const teamTemplates = [
  ["Andi Pratama", "Siti Rahayu", "Budi Santoso", "Dewi Lestari", "Rizky Firmansyah", "Nina Kusuma", "Fajar Hidayat"],
  ["Agus Setiawan", "Maya Putri", "Doni Saputra", "Rina Wulandari", "Hendra Gunawan"],
  ["Taufik Rahman", "Lisa Anggraini", "Yusuf Hakim"],
  ["Bayu Nugroho", "Citra Dewi"],
  ["Reza Mahendra", "Anisa Fitri", "Galih Prakoso", "Winda Sari"],
];

const clientTemplates = [
  ["PT Indofood|FMCG", "Bank BCA|Banking", "Tokopedia|E-Commerce", "Pertamina|Energy", "Telkomsel|Telco", "Garuda Indonesia|Aviation", "Gojek|Technology", "Unilever Indonesia|FMCG"],
  ["Shopee Indonesia|E-Commerce", "Traveloka|Travel", "Bukalapak|E-Commerce", "Astra International|Automotive", "Mandiri Sekuritas|Finance"],
  ["Grab Indonesia|Technology", "OVO|Fintech", "DANA|Fintech"],
  ["Ruangguru|Edtech", "Zenius Education|Edtech"],
  ["Blibli|E-Commerce", "JNE Express|Logistics", "Wardah Cosmetics|Beauty", "Erigo Fashion|Fashion"],
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { seed_key } = await req.json();
    if (seed_key !== "FULL_SEED_2026") throw new Error("Invalid seed key");

    const results: any[] = [];

    // ============ 1. CREATE PLATFORM ADMIN ============
    let adminUserId: string;
    const { data: existingUsers } = await sb.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === "rafi@talco.id");

    if (existing) {
      adminUserId = existing.id;
      console.log("Admin exists:", adminUserId);
    } else {
      const { data: newUser, error: createError } = await sb.auth.admin.createUser({
        email: "rafi@talco.id",
        password: "123456",
        email_confirm: true,
        user_metadata: { full_name: "Rafi Platform Admin" },
      });
      if (createError) throw createError;
      adminUserId = newUser.user.id;
      console.log("Admin created:", adminUserId);
    }

    // Ensure platform_admin
    await sb.from("platform_admins").upsert({ user_id: adminUserId }, { onConflict: "user_id" });

    // Ensure super_admin role
    const { data: existingRole } = await sb.from("user_roles").select("id").eq("user_id", adminUserId).eq("role", "super_admin").maybeSingle();
    if (!existingRole) {
      await sb.from("user_roles").insert({ user_id: adminUserId, role: "super_admin" });
    }

    console.log("✅ Platform admin ready");

    // ============ 2. CREATE 5 COMPANIES ============
    for (let ci = 0; ci < companies.length; ci++) {
      const comp = companies[ci];
      const team = teamTemplates[ci];
      const clients = clientTemplates[ci];
      const prefix = comp.slug.substring(0, 3).toUpperCase();

      console.log(`\n🏢 Seeding ${comp.name}...`);

      // Create or get company
      let companyId: string;
      const { data: existingComp } = await sb.from("companies").select("id").eq("slug", comp.slug).maybeSingle();
      if (existingComp) {
        companyId = existingComp.id;
        await sb.from("companies").update({ subscription_tier: comp.tier, max_users: comp.maxUsers }).eq("id", companyId);
      } else {
        const { data: newComp, error: compErr } = await sb.from("companies").insert({
          name: comp.name, slug: comp.slug, subscription_tier: comp.tier, max_users: comp.maxUsers, owner_id: adminUserId,
        }).select("id").single();
        if (compErr) throw compErr;
        companyId = newComp.id;
      }

      // Add admin as owner member
      const { data: existingMember } = await sb.from("company_members").select("id").eq("company_id", companyId).eq("user_id", adminUserId).maybeSingle();
      if (!existingMember) {
        await sb.from("company_members").insert({ company_id: companyId, user_id: adminUserId, role: "owner" });
      }

      // Create team members
      const memberIds: string[] = [adminUserId];
      const roles: string[] = ["super_admin", "hr", "project_manager", "account_executive", "graphic_designer", "videographer", "content_writer"];

      for (let ti = 0; ti < team.length; ti++) {
        const email = `${team[ti].toLowerCase().replace(/\s/g, ".")}@${comp.slug}.co.id`;
        let userId: string;
        const existUser = existingUsers?.users?.find((u: any) => u.email === email);
        if (existUser) {
          userId = existUser.id;
        } else {
          const { data: nu, error: nuErr } = await sb.auth.admin.createUser({
            email, password: "123456", email_confirm: true,
            user_metadata: { full_name: team[ti] },
          });
          if (nuErr) { console.error(`User ${email}:`, nuErr.message); continue; }
          userId = nu.user.id;
        }
        memberIds.push(userId);

        // Add as company member
        const { data: em } = await sb.from("company_members").select("id").eq("company_id", companyId).eq("user_id", userId).maybeSingle();
        if (!em) await sb.from("company_members").insert({ company_id: companyId, user_id: userId, role: rand(["admin", "member"]) });

        // Add role
        const role = roles[ti % roles.length];
        const { data: er } = await sb.from("user_roles").select("id").eq("user_id", userId).eq("role", role).maybeSingle();
        if (!er) await sb.from("user_roles").insert({ user_id: userId, role });
      }
      console.log(`  ✅ ${memberIds.length} members`);

      // ============ CLIENTS ============
      const clientIds: string[] = [];
      for (const cl of clients) {
        const [name, industry] = cl.split("|");
        const { data: client } = await sb.from("clients").insert({
          name, company: name, industry, email: `contact@${name.toLowerCase().replace(/\s/g, "")}.co.id`,
          phone: `021-${randInt(1000000, 9999999)}`, created_by: adminUserId,
          client_type: "client", status: "active", start_date: randDate(180), company_id: companyId,
        }).select("id").single();
        if (client) clientIds.push(client.id);
      }
      console.log(`  ✅ ${clientIds.length} clients`);

      // ============ PROJECTS ============
      const projNames = ["Social Media Management", "Brand Identity Redesign", "Digital Campaign Q1", "Content Production", "Website Revamp", "Video Commercial", "SEO Optimization", "Event Activation"];
      const projectIds: string[] = [];
      for (let i = 0; i < Math.min(projNames.length, clientIds.length + 2); i++) {
        const { data: proj } = await sb.from("projects").insert({
          title: `${projNames[i % projNames.length]} - ${clients[i % clients.length]?.split("|")[0] || "Internal"}`,
          client_id: clientIds[i % clientIds.length] || null, assigned_to: rand(memberIds),
          status: rand(["on_progress", "completed", "pending"]), type: rand(["retainer", "project"]),
          deadline: futureDate(90), description: `Project ${projNames[i % projNames.length]}`,
          company_id: companyId,
        }).select("id").single();
        if (proj) projectIds.push(proj.id);
      }
      console.log(`  ✅ ${projectIds.length} projects`);

      // ============ TASKS ============
      const taskTitles = ["Design social media batch 1", "Review copywriting deck", "Create mood board", "Edit video teaser 30s", "Client presentation", "Photo retouching", "Setup Meta Ads", "Write blog draft", "Design newsletter", "Create IG Reels storyboard", "Update brand guidelines", "KOL coordination", "Monthly analytics report", "Design web banner promo", "Shooting prep checklist", "Client feedback revision", "TikTok content plan", "Product catalog design", "GA tracking setup", "Quarterly report"];
      let taskCount = 0;
      for (let i = 0; i < taskTitles.length; i++) {
        const assignee = rand(memberIds);
        const status = rand(["completed", "on_progress", "pending"]);
        const { data: task } = await sb.from("tasks").insert({
          title: taskTitles[i], status, priority: rand(["high", "medium", "low"]),
          project_id: projectIds[i % projectIds.length] || null, created_by: adminUserId, assigned_to: assignee,
          deadline: status === "completed" ? randDate(30) : futureDate(30), description: `Task: ${taskTitles[i]}`,
          company_id: companyId,
        }).select("id").single();
        if (task) {
          taskCount++;
          await sb.from("task_assignees").insert({ task_id: task.id, user_id: assignee });
          // Add subtasks
          if (i < 8) {
            for (let s = 0; s < randInt(2, 4); s++) {
              await sb.from("sub_tasks").insert({
                task_id: task.id, title: `Subtask ${s + 1} - ${taskTitles[i]}`,
                is_completed: Math.random() > 0.5,
              });
            }
          }
        }
      }
      console.log(`  ✅ ${taskCount} tasks`);

      // ============ ATTENDANCE (last 14 days) ============
      let attCount = 0;
      for (const mid of memberIds.slice(0, 5)) {
        for (let d = 1; d <= 14; d++) {
          const date = new Date(); date.setDate(date.getDate() - d);
          if (date.getDay() === 0 || date.getDay() === 6) continue;
          const dateStr = date.toISOString().split("T")[0];
          const clockIn = `${dateStr}T${String(randInt(7, 9)).padStart(2, '0')}:${String(randInt(0, 59)).padStart(2, '0')}:00`;
          const clockOut = `${dateStr}T${String(randInt(17, 19)).padStart(2, '0')}:${String(randInt(0, 59)).padStart(2, '0')}:00`;
          await sb.from("attendance").insert({
            user_id: mid, date: dateStr, clock_in: clockIn, clock_out: clockOut,
            notes: rand(["WFO", "WFH", "Client visit", null]),
          });
          attCount++;
        }
      }
      console.log(`  ✅ ${attCount} attendance`);

      // ============ LEAVE REQUESTS ============
      for (let i = 0; i < Math.min(3, memberIds.length - 1); i++) {
        const uid = memberIds[i + 1];
        await sb.from("leave_requests").insert({
          user_id: uid, leave_type: rand(["annual", "sick", "personal"]),
          start_date: futureDate(10), end_date: futureDate(14),
          reason: rand(["Liburan keluarga", "Sakit flu", "Urusan pribadi", "Cuti tahunan"]),
          status: rand(["pending", "approved", "rejected"]),
          approved_by: i === 0 ? null : adminUserId,
        });
      }
      console.log("  ✅ leave requests");

      // ============ CANDIDATES ============
      const candidateNames = ["Ahmad Fauzi", "Putri Maharani", "Gilang Ramadhan", "Nadia Safitri", "Oscar Wijaya", "Laras Puspita"];
      const candidateStatuses: any[] = ["applied", "screening", "interview", "test", "offering", "hired"];
      for (let i = 0; i < candidateNames.length; i++) {
        await sb.from("candidates").insert({
          full_name: candidateNames[i],
          email: `${candidateNames[i].toLowerCase().replace(/\s/g, ".")}@mail.com`,
          phone: `08${randInt(100000000, 999999999)}`,
          position: rand(["Graphic Designer", "Content Writer", "Video Editor", "Social Media Specialist", "Account Executive"]),
          division: rand(["Creative", "Marketing", "Production", "Business Development"]),
          status: candidateStatuses[i % candidateStatuses.length],
          created_by: adminUserId,
          location: rand(["Jakarta", "Bandung", "Surabaya", "Yogyakarta"]),
        });
      }
      console.log("  ✅ candidates");

      // ============ EVENTS ============
      const eventNames = ["Product Launch Event", "Annual Gathering", "Brand Activation Mall", "Webinar Digital Marketing", "Music Festival Sponsorship"];
      const eventIds: string[] = [];
      for (let i = 0; i < Math.min(eventNames.length, 4); i++) {
        const startDate = i < 2 ? randDate(30) : futureDate(30);
        const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + randInt(1, 3));
        const { data: ev } = await sb.from("events").insert({
          name: eventNames[i], event_type: rand(["activation", "gathering", "webinar", "sponsorship"]),
          start_date: startDate, end_date: endDate.toISOString().split("T")[0],
          location: rand(["Jakarta Convention Center", "Mall Grand Indonesia", "Online Zoom", "Bali BNDCC"]),
          created_by: adminUserId, status: i < 2 ? "completed" : "planning",
          current_phase: i < 2 ? "post_event" : rand(["planning", "preparation"]),
          client_id: clientIds[i % clientIds.length] || null,
          pic_id: rand(memberIds),
        }).select("id").single();
        if (ev) {
          eventIds.push(ev.id);
          // Add checklists
          for (const item of ["Booking venue", "Konfirmasi vendor", "Print material", "Setup dekorasi", "Briefing crew"]) {
            await sb.from("event_checklists").insert({ event_id: ev.id, item, is_completed: Math.random() > 0.4 });
          }
          // Add vendors
          await sb.from("event_vendors").insert({
            event_id: ev.id, name: rand(["PT Catering Nusantara", "Sound System Pro", "Dekorasi Indah"]),
            purpose: rand(["Catering", "Sound & Lighting", "Decoration"]),
            cost: randInt(5000000, 50000000), status: "confirmed",
          });
        }
      }
      console.log(`  ✅ ${eventIds.length} events`);

      // ============ MEETINGS ============
      for (let i = 0; i < 5; i++) {
        const meetingDate = i < 2 ? randDate(7) : futureDate(14);
        const { data: mtg } = await sb.from("meetings").insert({
          title: rand(["Weekly Sync", "Client Review", "Sprint Planning", "Creative Brainstorm", "Budget Review"]),
          meeting_date: meetingDate, start_time: randTime(), end_time: randTime(),
          mode: rand(["online", "offline", "hybrid"]), type: rand(["internal", "client", "vendor"]),
          location: rand(["Meeting Room A", "Zoom", "Google Meet", null]),
          created_by: adminUserId, status: i < 2 ? "completed" : "scheduled",
          client_id: clientIds[i % clientIds.length] || null,
        }).select("id").single();
        if (mtg) {
          // Add participants
          for (const mid of memberIds.slice(0, 3)) {
            await sb.from("meeting_participants").insert({
              meeting_id: mtg.id, user_id: mid, status: rand(["accepted", "pending"]),
            });
          }
        }
      }
      console.log("  ✅ meetings");

      // ============ SHOOTING SCHEDULES ============
      for (let i = 0; i < 4; i++) {
        await sb.from("shooting_schedules").insert({
          title: rand(["Product Photoshoot", "BTS Content", "TVC Recording", "Lifestyle Shoot"]),
          scheduled_date: i < 2 ? randDate(14) : futureDate(14), scheduled_time: "09:00",
          requested_by: adminUserId, location: rand(["Studio A", "Outdoor Jakarta", "Client Office"]),
          status: i < 2 ? "completed" : "scheduled",
          client_id: clientIds[i % clientIds.length] || null,
          project_id: projectIds[i % projectIds.length] || null,
        });
      }
      console.log("  ✅ shootings");

      // ============ FINANCE: INCOME ============
      for (let i = 0; i < 6; i++) {
        await sb.from("income").insert({
          source: `${clients[i % clients.length]?.split("|")[0] || "Client"} - Monthly Fee`,
          amount: randInt(5000, 25000) * 1000, type: rand(["service_fee", "project_fee", "retainer"]),
          date: randDate(60), created_by: adminUserId, status: rand(["received", "pending"]),
          client_id: clientIds[i % clientIds.length] || null,
          project_id: projectIds[i % projectIds.length] || null,
        });
      }
      console.log("  ✅ income");

      // ============ FINANCE: EXPENSES ============
      for (let i = 0; i < 5; i++) {
        await sb.from("expenses").insert({
          description: rand(["Internet bulanan", "Sewa studio", "Pembelian props", "Transport klien", "Software subscription"]),
          amount: randInt(500, 5000) * 1000, category: rand(["operational", "production", "marketing"]),
          created_by: adminUserId, status: rand(["paid", "pending"]),
          client_id: clientIds[i % clientIds.length] || null,
        });
      }
      console.log("  ✅ expenses");

      // ============ PAYROLL ============
      for (const mid of memberIds) {
        await sb.from("payroll").insert({
          employee_id: mid, created_by: adminUserId, month: "2026-03",
          amount: randInt(5000000, 15000000), status: rand(["paid", "pending"]),
          bonus: randInt(0, 2000000),
        });
      }
      console.log("  ✅ payroll");

      // ============ ASSETS ============
      const assetItems = [["Canon EOS R5", "Camera"], ["MacBook Pro 16", "Laptop"], ["DJI Ronin S3", "Stabilizer"], ["Sony A7IV", "Camera"], ["Ring Light 18", "Lighting"]];
      for (const [i, [name, cat]] of assetItems.entries()) {
        await sb.from("assets").insert({
          name, category: cat, code: `${prefix}-${String(i + 1).padStart(3, "0")}`,
          created_by: adminUserId, default_location: "Office", condition: rand(["good", "excellent"]),
          status: rand(["available", "in_use"]),
        });
      }
      console.log("  ✅ assets");

      // ============ REIMBURSEMENTS ============
      for (let i = 1; i < Math.min(memberIds.length, 4); i++) {
        await sb.from("reimbursements").insert({
          user_id: memberIds[i],
          title: rand(["Transport klien", "Parkir", "Makan dengan klien", "Beli ATK"]),
          amount: randInt(50, 500) * 1000, request_from: "personal",
          status: rand(["pending", "approved", "paid"]),
        });
      }
      console.log("  ✅ reimbursements");

      // ============ LETTERS ============
      for (let i = 0; i < 3; i++) {
        await sb.from("letters").insert({
          letter_number: `${prefix}/SPK/${String(i + 1).padStart(3, "0")}/III/2026`,
          category_code: "SPK", category_name: "Surat Perintah Kerja",
          entity_code: prefix, entity_name: comp.name,
          recipient_name: clients[i % clients.length]?.split("|")[0] || "Client",
          created_by: adminUserId, month: 3, year: 2026, running_number: i + 1,
          status: rand(["draft", "sent", "signed"]),
        });
      }
      console.log("  ✅ letters");

      // ============ LEDGER ENTRIES ============
      for (let i = 0; i < 5; i++) {
        await sb.from("ledger_entries").insert({
          type: rand(["income", "expense"]), sub_type: rand(["service_fee", "operational", "production"]),
          source: rand(["Client payment", "Vendor invoice", "Subscription"]),
          amount: randInt(1000, 15000) * 1000, date: randDate(60), created_by: adminUserId,
          client_id: clientIds[i % clientIds.length] || null,
          project_id: projectIds[i % projectIds.length] || null,
        });
      }
      console.log("  ✅ ledger");

      // ============ KOL DATABASE ============
      const kolNames = ["Anya Geraldine", "Jerome Polin", "Rachel Vennya", "Arief Muhammad"];
      const kolIds: string[] = [];
      for (const kn of kolNames) {
        const username = kn.toLowerCase().replace(/\s/g, "");
        const { data: kol } = await sb.from("kol_database").insert({
          name: kn, username, created_by: adminUserId, updated_by: adminUserId,
          ig_followers: randInt(100000, 5000000), tiktok_followers: randInt(50000, 3000000),
          industry: rand(["Lifestyle", "Finance", "Food", "Tech"]),
          rate_ig_feed: randInt(2000000, 10000000), rate_ig_reels: randInt(3000000, 15000000),
          rate_tiktok_video: randInt(2000000, 8000000),
        }).select("id").single();
        if (kol) kolIds.push(kol.id);
      }
      // KOL campaigns
      for (let i = 0; i < Math.min(kolIds.length, 3); i++) {
        await sb.from("kol_campaigns").insert({
          campaign_name: `Campaign ${clients[i % clients.length]?.split("|")[0] || "Brand"} x ${kolNames[i]}`,
          kol_id: kolIds[i], platform: rand(["instagram", "tiktok"]),
          created_by: adminUserId, updated_by: adminUserId, pic_id: rand(memberIds),
          fee: randInt(3000000, 15000000), status: rand(["active", "completed", "pending"]),
          client_id: clientIds[i % clientIds.length] || null,
        });
      }
      console.log("  ✅ KOL");

      // ============ EDITORIAL PLANS ============
      for (let i = 0; i < Math.min(2, clientIds.length); i++) {
        const { data: ep } = await sb.from("editorial_plans").insert({
          title: `EP ${clients[i]?.split("|")[0]} - March 2026`, client_id: clientIds[i],
          created_by: adminUserId, slug: `ep-${comp.slug}-${Date.now()}-${i}`, period: "2026-03",
          company_id: companyId,
        }).select("id").single();
        if (ep) {
          for (let s = 0; s < 6; s++) {
            await sb.from("editorial_slides").insert({
              ep_id: ep.id, slide_order: s + 1,
              status: rand(["draft", "review", "approved", "published"]),
              publish_date: futureDate(30), channel: rand(["instagram", "tiktok", "facebook"]),
              format: rand(["feed", "reels", "story", "carousel"]),
            });
          }
        }
      }
      console.log("  ✅ editorial plans");

      // ============ PROSPECTS ============
      for (let i = 0; i < 4; i++) {
        await sb.from("prospects").insert({
          company_name: rand(["PT Mitra Sejahtera", "CV Kreasi Digital", "PT Indo Makmur", "Startup Baru"]),
          contact_name: rand(["Pak Joko", "Bu Sinta", "Mas Andre", "Mbak Dian"]),
          email: `prospect${i}@${comp.slug}.co.id`, phone: `08${randInt(100000000, 999999999)}`,
          status: rand(["new", "contacted", "proposal", "negotiation", "won", "lost"]),
          source: rand(["referral", "website", "social_media", "cold_call"]),
          created_by: adminUserId, company_id: companyId,
          estimated_value: randInt(10000000, 100000000),
        });
      }
      console.log("  ✅ prospects");

      // ============ HOLIDAYS ============
      await sb.from("holidays").insert([
        { name: "Hari Raya Idul Fitri", start_date: "2026-03-30", end_date: "2026-04-01", holiday_type: "national", created_by: adminUserId },
        { name: "Hari Kemerdekaan RI", start_date: "2026-08-17", end_date: "2026-08-17", holiday_type: "national", created_by: adminUserId },
      ]);
      console.log("  ✅ holidays");

      // ============ SCHEDULED POSTS ============
      for (let i = 0; i < Math.min(4, clientIds.length); i++) {
        await sb.from("scheduled_posts").insert({
          client_id: clientIds[i],
          content: rand(["New product launch 🚀", "Weekly tips carousel 💡", "Behind the scenes 🎬", "Client testimonial ⭐"]),
          platform: rand(["instagram", "tiktok", "facebook", "twitter"]),
          scheduled_date: futureDate(14), scheduled_time: rand(["09:00", "12:00", "18:00"]),
          created_by: adminUserId, status: "scheduled",
        });
      }
      console.log("  ✅ scheduled posts");

      results.push({
        company: comp.name, slug: comp.slug, tier: comp.tier,
        members: memberIds.length, clients: clientIds.length,
        projects: projectIds.length, tasks: taskCount, events: eventIds.length,
      });

      console.log(`🎉 ${comp.name} fully seeded!`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Platform fully seeded!", adminUserId, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

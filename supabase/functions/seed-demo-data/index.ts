import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const rand = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randDate = (daysBack: number) => { const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * daysBack)); return d.toISOString().split("T")[0]; };
const futureDate = (daysAhead: number) => { const d = new Date(); d.setDate(d.getDate() + Math.floor(Math.random() * daysAhead) + 1); return d.toISOString().split("T")[0]; };

// Pre-mapped from DB
const companyMap = [
  { slug: "aurora-creative", companyId: "4bc6fd98-e1d1-47f7-b5e1-6a92890936bd", adminId: "3dfa99a2-420e-4bb4-b9b2-c8e7c8c759ca",
    clients: ["PT Indofood Sukses Makmur|Indofood|FMCG", "Bank Central Asia|BCA|Banking", "Tokopedia|Tokopedia|E-Commerce", "Pertamina|Pertamina|Energy", "Telkomsel|Telkomsel|Telco", "Garuda Indonesia|Garuda Indonesia|Aviation", "Gojek|Gojek|Technology", "Unilever Indonesia|Unilever|FMCG"] },
  { slug: "nexa-digital", companyId: "71d4b59d-5c40-4f71-a303-c25277d5c94f", adminId: "69887afb-040d-48bf-adfa-9fc3a93e35ec",
    clients: ["Shopee Indonesia|Shopee|E-Commerce", "Traveloka|Traveloka|Travel Tech", "Bukalapak|Bukalapak|E-Commerce", "Astra International|Astra|Automotive", "Mandiri Sekuritas|Mandiri|Finance", "Lion Air Group|Lion Air|Aviation", "Kalbe Farma|Kalbe|Pharma", "Sinar Mas Group|Sinar Mas|Conglomerate", "XL Axiata|XL Axiata|Telco", "Mayora Indah|Mayora|FMCG"] },
  { slug: "orbit-media", companyId: "f40fe90c-003a-46c7-85c2-2628cfd0a5b7", adminId: "38968628-eed9-4d4a-842b-c96609bfe2fb",
    clients: ["Grab Indonesia|Grab|Technology", "OVO|OVO|Fintech", "DANA|DANA|Fintech", "Blibli|Blibli|E-Commerce", "JNE Express|JNE|Logistics", "Sido Muncul|Sido Muncul|Pharma", "Wardah Cosmetics|Wardah|Beauty", "Erigo Fashion|Erigo|Fashion", "Kompas Media|Kompas|Media"] },
  { slug: "skyline-lab", companyId: "1e942fa5-db08-42e8-8c63-a55f0a91c521", adminId: "8ff67124-c1e7-425c-a6dc-244098243633",
    clients: ["Ruangguru|Ruangguru|Edtech", "Zenius Education|Zenius|Edtech", "Tiket.com|Tiket.com|Travel Tech", "Sociolla|Sociolla|Beauty Tech", "Halodoc|Halodoc|Healthtech", "KoinWorks|KoinWorks|Fintech", "Fore Coffee|Fore Coffee|F&B", "J&T Express|J&T Express|Logistics", "Kopi Kenangan|Kopi Kenangan|F&B", "Ninja Van|Ninja Van|Logistics", "Evermos|Evermos|Social Commerce", "eFishery|eFishery|Aquatech"] },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { autoRefreshToken: false, persistSession: false } });
    const { seed_key, company_index } = await req.json();
    if (seed_key !== "TOS_SEED_2026") throw new Error("Invalid seed key");
    const idx = company_index as number;
    if (idx < 0 || idx > 3) throw new Error("company_index must be 0-3");

    const comp = companyMap[idx];
    const adminId = comp.adminId;

    // Get all member IDs for this company
    const { data: members } = await sb.from("company_members").select("user_id").eq("company_id", comp.companyId);
    const memberIds = (members || []).map((m: any) => m.user_id);
    console.log(`Company: ${comp.slug}, members: ${memberIds.length}`);

    // 1. Clients
    const clientIds: string[] = [];
    for (const cl of comp.clients) {
      const [name, company, industry] = cl.split("|");
      const { data: client, error: clErr } = await sb.from("clients").insert({
        name, company, industry, email: `contact@${company.toLowerCase().replace(/\s/g, "")}.co.id`,
        phone: `021-${Math.floor(1000000 + Math.random() * 9000000)}`, created_by: adminId,
        client_type: "client", status: "active", start_date: randDate(180),
      }).select("id").single();
      if (clErr) console.error("Client insert error:", clErr.message, clErr.details, clErr.hint);
      if (client) clientIds.push(client.id);
    }
    console.log(`✅ ${clientIds.length} clients`);

    // 2. Projects
    const projTemplates = ["Social Media Management", "Brand Identity Redesign", "Digital Campaign Q1", "Content Production", "Website Revamp", "Video Commercial", "SEO Optimization", "Event Management"];
    const projectIds: string[] = [];
    for (let i = 0; i < Math.min(projTemplates.length, clientIds.length); i++) {
      const { data: proj } = await sb.from("projects").insert({
        title: `${projTemplates[i]} - ${comp.clients[i]?.split("|")[1] || "Client"}`,
        client_id: clientIds[i], assigned_to: rand(memberIds),
        status: rand(["on_progress", "completed", "pending"]), type: rand(["retainer", "project"]),
        deadline: futureDate(90), description: `Project for ${comp.clients[i]?.split("|")[1]}`,
      }).select("id").single();
      if (proj) projectIds.push(proj.id);
    }
    console.log(`✅ ${projectIds.length} projects`);

    // 3. Tasks (25)
    const taskTitles = ["Design social media content batch 1", "Review copywriting deck", "Create mood board", "Edit video teaser 30s", "Prepare client presentation", "Photo retouching product", "Setup Meta Ads campaign", "Write blog article draft", "Design email newsletter", "Create IG Reels storyboard", "Update brand guidelines", "Coordinate KOL collab", "Analytics report monthly", "Design banner web promo", "Shooting prep checklist", "Client feedback revision", "Create TikTok content plan", "Design product catalog", "Setup GA tracking", "Prepare quarterly report", "Logo design v2", "Social media calendar", "Landing page wireframe", "Campaign brief doc", "Influencer shortlist"];
    let taskCount = 0;
    for (let i = 0; i < 25; i++) {
      const assignee = rand(memberIds);
      const status = rand(["completed", "on_progress", "pending"]);
      const { data: task } = await sb.from("tasks").insert({
        title: taskTitles[i], status, priority: rand(["high", "medium", "low"]),
        project_id: projectIds[i % projectIds.length] || null, created_by: adminId, assigned_to: assignee,
        deadline: status === "completed" ? randDate(30) : futureDate(30), description: `Task: ${taskTitles[i]}`,
      }).select("id").single();
      if (task) { taskCount++; await sb.from("task_assignees").insert({ task_id: task.id, user_id: assignee }); }
    }
    console.log(`✅ ${taskCount} tasks`);

    // 4. Shootings
    for (let i = 0; i < 4; i++) {
      await sb.from("shooting_schedules").insert({
        title: ["Product Photoshoot", "Behind the Scenes", "TVC Recording", "Lifestyle Content"][i],
        scheduled_date: i < 2 ? randDate(14) : futureDate(14), scheduled_time: "09:00",
        requested_by: adminId, location: rand(["Studio A", "Outdoor Jakarta", "Client Warehouse"]),
        status: i < 2 ? "completed" : "scheduled",
        client_id: clientIds[i % clientIds.length] || null, project_id: projectIds[i % projectIds.length] || null,
      });
    }
    console.log("✅ shootings");

    // 5. Assets
    const prefix = comp.slug.substring(0, 3).toUpperCase();
    for (const [i, a] of [["Canon EOS R5", "Camera"], ["MacBook Pro 16\"", "Laptop"], ["DJI Ronin S3", "Stabilizer"], ["Sony A7IV", "Camera"], ["Ring Light 18\"", "Lighting"]].entries()) {
      await sb.from("assets").insert({
        name: a[0], category: a[1], code: `AST-${prefix}-${String(i + 1).padStart(3, "0")}`,
        created_by: adminId, default_location: "Office", condition: rand(["good", "excellent"]), status: rand(["available", "in_use"]),
      });
    }
    console.log("✅ assets");

    // 6. Income
    for (let i = 0; i < 6; i++) {
      await sb.from("income").insert({
        source: `${comp.clients[i]?.split("|")[1] || "Client"} - Monthly Fee`,
        amount: (Math.floor(Math.random() * 20000) + 5000) * 1000,
        type: rand(["service_fee", "project_fee", "retainer"]), date: randDate(60),
        created_by: adminId, status: rand(["received", "pending"]),
        received_at: rand([randDate(30), null]),
        client_id: clientIds[i % clientIds.length] || null, project_id: projectIds[i % projectIds.length] || null,
      });
    }
    console.log("✅ income");

    // 7. Reimbursements
    for (let i = 1; i < memberIds.length; i++) {
      await sb.from("reimbursements").insert({
        user_id: memberIds[i],
        title: rand(["Transport to client", "Parking fee", "Meal with client", "Office supplies"]),
        amount: (Math.floor(Math.random() * 500) + 50) * 1000,
        request_from: "personal", status: rand(["pending", "approved", "paid"]), notes: "Business expense",
      });
    }
    console.log("✅ reimbursements");

    // 8. Letters
    for (let i = 0; i < 3; i++) {
      await sb.from("letters").insert({
        letter_number: `${prefix}/SPK/${String(i + 1).padStart(3, "0")}/III/2026`,
        category_code: "SPK", category_name: "Surat Perintah Kerja",
        entity_code: prefix, entity_name: comp.slug,
        recipient_name: comp.clients[i]?.split("|")[0] || "Client",
        recipient_company: comp.clients[i]?.split("|")[1] || null,
        created_by: adminId, month: 3, year: 2026, running_number: i + 1,
        status: rand(["draft", "sent", "signed"]),
      });
    }
    console.log("✅ letters");

    // 9. Payroll
    for (const mid of memberIds) {
      await sb.from("payroll").insert({
        employee_id: mid, created_by: adminId, month: "2026-03",
        amount: 5000000 + Math.floor(Math.random() * 5000000),
        status: rand(["paid", "pending"]), bonus: Math.floor(Math.random() * 1000000),
      });
    }
    console.log("✅ payroll");

    // 10. Ledger entries
    for (let i = 0; i < 5; i++) {
      await sb.from("ledger_entries").insert({
        type: rand(["income", "expense"]), sub_type: rand(["service_fee", "operational", "production"]),
        source: rand(["Client payment", "Vendor invoice", "Subscription"]),
        amount: (Math.floor(Math.random() * 10000) + 1000) * 1000, date: randDate(60),
        created_by: adminId, client_id: clientIds[i % clientIds.length] || null,
        project_id: projectIds[i % projectIds.length] || null,
      });
    }
    console.log("✅ ledger");

    // 11. Scheduled posts
    for (let i = 0; i < 4; i++) {
      if (!clientIds[i]) continue;
      await sb.from("scheduled_posts").insert({
        client_id: clientIds[i],
        content: rand(["New product launch post", "Weekly tips carousel", "Behind the scenes video", "Client testimonial"]),
        platform: rand(["instagram", "tiktok", "facebook", "twitter"]),
        scheduled_date: futureDate(14), scheduled_time: rand(["09:00", "12:00", "18:00"]),
        created_by: adminId, status: "scheduled",
      });
    }
    console.log("✅ scheduled posts");

    // 12. Editorial Plans
    for (let i = 0; i < Math.min(2, clientIds.length); i++) {
      const { data: ep } = await sb.from("editorial_plans").insert({
        title: `EP ${comp.clients[i]?.split("|")[1]} - March 2026`,
        client_id: clientIds[i], created_by: adminId,
        slug: `ep-${comp.slug}-${Date.now()}-${i}`, period: "2026-03",
      }).select("id").single();
      if (ep) {
        for (let s = 0; s < 5; s++) {
          await sb.from("editorial_slides").insert({
            ep_id: ep.id, slide_order: s + 1,
            status: rand(["draft", "review", "approved", "published"]),
            publish_date: futureDate(30),
            channel: rand(["instagram", "tiktok", "facebook"]),
            format: rand(["feed", "reels", "story", "carousel"]),
          });
        }
      }
    }
    console.log("✅ editorial plans");

    console.log(`🎉 ${comp.slug} fully seeded!`);
    return new Response(JSON.stringify({ success: true, slug: comp.slug, clients: clientIds.length, projects: projectIds.length, tasks: taskCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});

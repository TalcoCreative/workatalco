import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Role definitions ───
const ALL_FEATURES = [
  "dashboard","clients","client_hub","projects","tasks","schedule","shooting","meeting",
  "leave","reimburse","asset","event","reports","form_builder","kol_database","kol_campaign",
  "letters","social_media","editorial_plan","content_builder","team","hr_dashboard",
  "hr_analytics","holiday_calendar","performance","recruitment","recruitment_dashboard",
  "recruitment_forms","finance","income_statement","balance_sheet","prospects",
  "sales_analytics","ceo_dashboard","personal_notes","billing","email_settings","role_management",
];

const FULL = { can_view:true, can_create:true, can_edit:true, can_delete:true, can_export:true, can_comment:true, can_mention:true };
const VIEW_ONLY = { can_view:true, can_create:false, can_edit:false, can_delete:false, can_export:false, can_comment:false, can_mention:false };
const VIEW_CREATE_EDIT = { can_view:true, can_create:true, can_edit:true, can_delete:false, can_export:true, can_comment:true, can_mention:true };
const NONE = { can_view:false, can_create:false, can_edit:false, can_delete:false, can_export:false, can_comment:false, can_mention:false };

const CORE_NAV = ["dashboard","clients","projects","tasks","schedule","shooting","meeting","leave","reimburse","asset","event","reports"];
const SOCIAL_FEATURES = ["social_media","editorial_plan","content_builder"];
const HR_FEATURES = ["team","hr_dashboard","hr_analytics","holiday_calendar","performance","recruitment","recruitment_dashboard","recruitment_forms"];
const FINANCE_FEATURES = ["finance","income_statement","balance_sheet"];
const SALES_FEATURES = ["prospects","sales_analytics"];
const CONTENT_NAV = ["kol_database","kol_campaign","letters","form_builder","client_hub"];

interface RoleDef { value: string; label: string; category: string; description: string; }

const DEFAULT_ROLES: RoleDef[] = [
  { value:"super_admin", label:"Super Admin", category:"Executive", description:"Full system access" },
  { value:"admin", label:"Admin", category:"Executive", description:"Administrative access to all modules" },
  { value:"owner", label:"Owner", category:"Executive", description:"Company owner with full access" },
  { value:"director", label:"Director", category:"Executive", description:"Director-level strategic access" },
  { value:"creative_director", label:"Creative Director", category:"Executive", description:"Creative leadership" },
  { value:"art_director", label:"Art Director", category:"Executive", description:"Art direction access" },
  { value:"project_manager", label:"Project Manager", category:"Management", description:"Manages projects, tasks, schedules" },
  { value:"account_manager", label:"Account Manager", category:"Management", description:"Manages client accounts" },
  { value:"account_executive", label:"Account Executive", category:"Management", description:"Client relationships and sales" },
  { value:"producer", label:"Producer", category:"Management", description:"Production schedules and events" },
  { value:"talent_manager", label:"Talent Manager", category:"Management", description:"KOL database and campaigns" },
  { value:"event_coordinator", label:"Event Coordinator", category:"Management", description:"Events and logistics" },
  { value:"graphic_designer", label:"Graphic Designer", category:"Creative", description:"Design tasks and content" },
  { value:"ui_ux_designer", label:"UI/UX Designer", category:"Creative", description:"UI/UX design tasks" },
  { value:"motion_graphic", label:"Motion Graphic Designer", category:"Creative", description:"Motion graphics" },
  { value:"illustrator", label:"Illustrator", category:"Creative", description:"Illustration tasks" },
  { value:"photographer", label:"Photographer", category:"Creative", description:"Photography and shooting" },
  { value:"video_editor", label:"Video Editor", category:"Creative", description:"Video editing" },
  { value:"content_writer", label:"Content Writer", category:"Content", description:"Content writing" },
  { value:"content_strategist", label:"Content Strategist", category:"Content", description:"Content strategy" },
  { value:"copywriter", label:"Copywriter", category:"Content", description:"Copywriting tasks" },
  { value:"socmed_admin", label:"Social Media Admin", category:"Content", description:"Social media management" },
  { value:"community_manager", label:"Community Manager", category:"Content", description:"Community engagement" },
  { value:"seo_specialist", label:"SEO Specialist", category:"Content", description:"SEO optimization" },
  { value:"marketing", label:"Marketing", category:"Marketing", description:"Marketing campaigns" },
  { value:"ads_manager", label:"Ads Manager", category:"Marketing", description:"Advertising campaigns" },
  { value:"media_planner", label:"Media Planner", category:"Marketing", description:"Media planning" },
  { value:"pr_specialist", label:"PR Specialist", category:"Marketing", description:"Public relations" },
  { value:"sales", label:"Sales", category:"Marketing", description:"Sales pipeline" },
  { value:"hr", label:"HR", category:"Operations", description:"Human resources" },
  { value:"finance", label:"Finance", category:"Operations", description:"Financial management" },
  { value:"accounting", label:"Accounting", category:"Operations", description:"Accounting and ledger" },
  { value:"web_developer", label:"Web Developer", category:"Operations", description:"Development tasks" },
  { value:"data_analyst", label:"Data Analyst", category:"Operations", description:"Data analysis" },
  { value:"intern", label:"Intern", category:"Other", description:"Limited access for interns" },
  { value:"freelancer", label:"Freelancer", category:"Other", description:"External collaborator" },
  { value:"consultant", label:"Consultant", category:"Other", description:"Consultant access" },
  { value:"user", label:"User", category:"Other", description:"Basic user access" },
];

function buildPerms(role: RoleDef): Record<string, typeof FULL> {
  const perms: Record<string, typeof FULL> = {};
  ALL_FEATURES.forEach(f => { perms[f] = { ...NONE }; });
  const cat = role.category;
  const val = role.value;

  if (cat === "Executive") {
    ALL_FEATURES.forEach(f => { perms[f] = { ...FULL }; });
    return perms;
  }

  perms["dashboard"] = { ...VIEW_ONLY, can_comment: true };
  perms["personal_notes"] = { ...FULL };

  if (cat === "Management") {
    CORE_NAV.forEach(f => { perms[f] = { ...FULL }; });
    SOCIAL_FEATURES.forEach(f => { perms[f] = { ...VIEW_CREATE_EDIT }; });
    CONTENT_NAV.forEach(f => { perms[f] = { ...VIEW_CREATE_EDIT }; });
    perms["team"] = { ...VIEW_ONLY };
    perms["hr_dashboard"] = { ...VIEW_ONLY };
    perms["holiday_calendar"] = { ...VIEW_ONLY };
    perms["performance"] = { ...VIEW_CREATE_EDIT };
    if (val === "talent_manager") { perms["kol_database"] = { ...FULL }; perms["kol_campaign"] = { ...FULL }; }
    if (val === "event_coordinator") { perms["event"] = { ...FULL }; }
    if (val === "account_executive") { SALES_FEATURES.forEach(f => { perms[f] = { ...VIEW_CREATE_EDIT }; }); }
  }

  if (cat === "Creative") {
    ["projects","tasks","schedule","shooting","meeting"].forEach(f => { perms[f] = { ...VIEW_CREATE_EDIT }; });
    ["asset"].forEach(f => { perms[f] = { ...VIEW_ONLY }; });
    SOCIAL_FEATURES.forEach(f => { perms[f] = { ...VIEW_CREATE_EDIT }; });
    perms["leave"] = { ...VIEW_ONLY, can_create: true };
    perms["reimburse"] = { ...VIEW_ONLY, can_create: true };
    perms["holiday_calendar"] = { ...VIEW_ONLY };
    if (val === "photographer") { perms["shooting"] = { ...FULL }; perms["asset"] = { ...VIEW_CREATE_EDIT }; }
    if (val === "video_editor") { perms["asset"] = { ...VIEW_CREATE_EDIT }; }
  }

  if (cat === "Content") {
    ["tasks","projects","schedule"].forEach(f => { perms[f] = { ...VIEW_CREATE_EDIT }; });
    SOCIAL_FEATURES.forEach(f => { perms[f] = { ...FULL }; });
    perms["reports"] = { ...VIEW_ONLY, can_export: true };
    perms["clients"] = { ...VIEW_ONLY };
    perms["leave"] = { ...VIEW_ONLY, can_create: true };
    perms["reimburse"] = { ...VIEW_ONLY, can_create: true };
    perms["holiday_calendar"] = { ...VIEW_ONLY };
    if (val === "content_strategist" || val === "seo_specialist") {
      perms["reports"] = { ...VIEW_CREATE_EDIT, can_export: true };
      perms["kol_database"] = { ...VIEW_ONLY };
    }
    if (val === "socmed_admin" || val === "community_manager") { perms["client_hub"] = { ...VIEW_CREATE_EDIT }; }
  }

  if (cat === "Marketing") {
    ["clients","projects","tasks","schedule","reports"].forEach(f => { perms[f] = { ...VIEW_CREATE_EDIT }; });
    SALES_FEATURES.forEach(f => { perms[f] = { ...FULL }; });
    perms["kol_database"] = { ...VIEW_CREATE_EDIT };
    perms["kol_campaign"] = { ...VIEW_CREATE_EDIT };
    perms["leave"] = { ...VIEW_ONLY, can_create: true };
    perms["reimburse"] = { ...VIEW_ONLY, can_create: true };
    perms["holiday_calendar"] = { ...VIEW_ONLY };
    SOCIAL_FEATURES.forEach(f => { perms[f] = { ...VIEW_ONLY }; });
    if (val === "ads_manager") { perms["reports"] = { ...FULL }; }
    if (val === "pr_specialist") { perms["event"] = { ...VIEW_CREATE_EDIT }; perms["meeting"] = { ...VIEW_CREATE_EDIT }; }
  }

  if (cat === "Operations") {
    if (val === "hr") {
      HR_FEATURES.forEach(f => { perms[f] = { ...FULL }; });
      perms["leave"] = { ...FULL };
      perms["holiday_calendar"] = { ...FULL };
      ["clients","projects","tasks","schedule","meeting"].forEach(f => { perms[f] = { ...VIEW_ONLY }; });
      perms["reimburse"] = { ...VIEW_CREATE_EDIT };
    }
    if (val === "finance" || val === "accounting") {
      FINANCE_FEATURES.forEach(f => { perms[f] = { ...FULL }; });
      perms["reimburse"] = { ...FULL };
      ["clients","projects","tasks"].forEach(f => { perms[f] = { ...VIEW_ONLY }; });
      perms["reports"] = { ...VIEW_ONLY, can_export: true };
      perms["leave"] = { ...VIEW_ONLY, can_create: true };
      perms["holiday_calendar"] = { ...VIEW_ONLY };
      if (val === "accounting") { perms["billing"] = { ...VIEW_ONLY }; }
    }
    if (val === "web_developer") {
      ["projects","tasks","schedule"].forEach(f => { perms[f] = { ...VIEW_CREATE_EDIT }; });
      perms["form_builder"] = { ...FULL };
      perms["leave"] = { ...VIEW_ONLY, can_create: true };
      perms["reimburse"] = { ...VIEW_ONLY, can_create: true };
      perms["holiday_calendar"] = { ...VIEW_ONLY };
    }
    if (val === "data_analyst") {
      ["reports","clients","projects","tasks"].forEach(f => { perms[f] = { ...VIEW_ONLY, can_export: true }; });
      SALES_FEATURES.forEach(f => { perms[f] = { ...VIEW_ONLY, can_export: true }; });
      perms["hr_analytics"] = { ...VIEW_ONLY, can_export: true };
      perms["ceo_dashboard"] = { ...VIEW_ONLY };
      perms["leave"] = { ...VIEW_ONLY, can_create: true };
      perms["holiday_calendar"] = { ...VIEW_ONLY };
    }
  }

  if (cat === "Other") {
    perms["tasks"] = { ...VIEW_ONLY, can_create: true, can_edit: true, can_comment: true };
    perms["schedule"] = { ...VIEW_ONLY };
    perms["leave"] = { ...VIEW_ONLY, can_create: true };
    perms["holiday_calendar"] = { ...VIEW_ONLY };
    if (val === "consultant") {
      ["projects","clients","reports"].forEach(f => { perms[f] = { ...VIEW_ONLY, can_export: true }; });
      SALES_FEATURES.forEach(f => { perms[f] = { ...VIEW_ONLY }; });
    }
    if (val === "freelancer") {
      ["projects","shooting"].forEach(f => { perms[f] = { ...VIEW_ONLY }; });
      perms["reimburse"] = { ...VIEW_ONLY, can_create: true };
    }
  }

  return perms;
}

// Indonesian national holidays 2025-2026
const NATIONAL_HOLIDAYS = [
  { name: "Tahun Baru 2025", start_date: "2025-01-01", end_date: "2025-01-01" },
  { name: "Isra Mi'raj Nabi Muhammad SAW", start_date: "2025-01-27", end_date: "2025-01-27" },
  { name: "Tahun Baru Imlek 2576", start_date: "2025-01-29", end_date: "2025-01-29" },
  { name: "Hari Raya Nyepi (Tahun Baru Saka 1947)", start_date: "2025-03-29", end_date: "2025-03-29" },
  { name: "Wafat Isa Al Masih", start_date: "2025-04-18", end_date: "2025-04-18" },
  { name: "Hari Raya Idul Fitri 1446 H", start_date: "2025-03-31", end_date: "2025-04-01" },
  { name: "Cuti Bersama Idul Fitri", start_date: "2025-04-02", end_date: "2025-04-04" },
  { name: "Hari Buruh Internasional", start_date: "2025-05-01", end_date: "2025-05-01" },
  { name: "Hari Raya Waisak 2569", start_date: "2025-05-12", end_date: "2025-05-12" },
  { name: "Kenaikan Isa Al Masih", start_date: "2025-05-29", end_date: "2025-05-29" },
  { name: "Hari Lahir Pancasila", start_date: "2025-06-01", end_date: "2025-06-01" },
  { name: "Hari Raya Idul Adha 1446 H", start_date: "2025-06-07", end_date: "2025-06-07" },
  { name: "Tahun Baru Islam 1447 H", start_date: "2025-06-27", end_date: "2025-06-27" },
  { name: "Hari Kemerdekaan RI", start_date: "2025-08-17", end_date: "2025-08-17" },
  { name: "Maulid Nabi Muhammad SAW", start_date: "2025-09-05", end_date: "2025-09-05" },
  { name: "Hari Natal", start_date: "2025-12-25", end_date: "2025-12-25" },
  // 2026
  { name: "Tahun Baru 2026", start_date: "2026-01-01", end_date: "2026-01-01" },
  { name: "Isra Mi'raj Nabi Muhammad SAW", start_date: "2026-01-16", end_date: "2026-01-16" },
  { name: "Tahun Baru Imlek 2577", start_date: "2026-02-17", end_date: "2026-02-17" },
  { name: "Hari Raya Nyepi (Tahun Baru Saka 1948)", start_date: "2026-03-19", end_date: "2026-03-19" },
  { name: "Hari Raya Idul Fitri 1447 H", start_date: "2026-03-20", end_date: "2026-03-21" },
  { name: "Cuti Bersama Idul Fitri", start_date: "2026-03-22", end_date: "2026-03-25" },
  { name: "Wafat Isa Al Masih", start_date: "2026-04-03", end_date: "2026-04-03" },
  { name: "Hari Buruh Internasional", start_date: "2026-05-01", end_date: "2026-05-01" },
  { name: "Kenaikan Isa Al Masih", start_date: "2026-05-14", end_date: "2026-05-14" },
  { name: "Hari Raya Waisak 2570", start_date: "2026-05-31", end_date: "2026-05-31" },
  { name: "Hari Raya Idul Adha 1447 H", start_date: "2026-05-27", end_date: "2026-05-27" },
  { name: "Hari Lahir Pancasila", start_date: "2026-06-01", end_date: "2026-06-01" },
  { name: "Tahun Baru Islam 1448 H", start_date: "2026-06-17", end_date: "2026-06-17" },
  { name: "Hari Kemerdekaan RI", start_date: "2026-08-17", end_date: "2026-08-17" },
  { name: "Maulid Nabi Muhammad SAW", start_date: "2026-08-26", end_date: "2026-08-26" },
  { name: "Hari Natal", start_date: "2026-12-25", end_date: "2026-12-25" },
];

export async function seedRolesForCompany(sb: any, companyId: string) {
  // Check if this company already has roles
  const { data: existing } = await sb
    .from("dynamic_roles")
    .select("id")
    .eq("company_id", companyId)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`Company ${companyId} already has roles, skipping`);
    return;
  }

  console.log(`Seeding roles for company ${companyId}`);
  for (const role of DEFAULT_ROLES) {
    const { data: created, error } = await sb
      .from("dynamic_roles")
      .insert({ name: role.label, description: role.description, company_id: companyId })
      .select("id")
      .single();

    if (error) { console.error(`Error creating role ${role.label}:`, error.message); continue; }

    const perms = buildPerms(role);
    const rows = ALL_FEATURES.map(f => ({
      role_id: created.id,
      feature_key: f,
      ...perms[f],
    }));

    await sb.from("role_permissions").insert(rows);
  }
}

export async function seedHolidaysForCompany(sb: any, companyId: string, createdBy: string) {
  // Check if company already has holidays
  const { data: existing } = await sb
    .from("holidays")
    .select("id")
    .eq("company_id", companyId)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`Company ${companyId} already has holidays, skipping`);
    return;
  }

  console.log(`Seeding national holidays for company ${companyId}`);
  const rows = NATIONAL_HOLIDAYS.map(h => ({
    ...h,
    holiday_type: "national",
    is_active: true,
    company_id: companyId,
    created_by: createdBy,
  }));

  const { error } = await sb.from("holidays").insert(rows);
  if (error) console.error(`Holiday seed error for ${companyId}:`, error.message);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { companyId, backfillAll } = await req.json().catch(() => ({}));

    const results: string[] = [];

    if (backfillAll) {
      // Backfill ALL companies
      const { data: companies } = await sb.from("companies").select("id, owner_id");
      
      for (const company of (companies || [])) {
        // Seed roles
        await seedRolesForCompany(sb, company.id);
        results.push(`Roles seeded for ${company.id}`);

        // Seed holidays
        const ownerId = company.owner_id || "00000000-0000-0000-0000-000000000000";
        await seedHolidaysForCompany(sb, company.id, ownerId);
        results.push(`Holidays seeded for ${company.id}`);

        // Re-map user_dynamic_roles: find users in this company, map their old global role to company-scoped one
        const { data: members } = await sb
          .from("company_members")
          .select("user_id")
          .eq("company_id", company.id);

        for (const member of (members || [])) {
          // Get user's current dynamic role (may be global)
          const { data: currentAssignment } = await sb
            .from("user_dynamic_roles")
            .select("id, role_id, dynamic_roles(name, company_id)")
            .eq("user_id", member.user_id);

          for (const assignment of (currentAssignment || [])) {
            const roleName = (assignment as any).dynamic_roles?.name;
            const roleCompanyId = (assignment as any).dynamic_roles?.company_id;
            
            // If already company-scoped, skip
            if (roleCompanyId) continue;

            // Find the company-scoped equivalent
            if (roleName) {
              const { data: companyRole } = await sb
                .from("dynamic_roles")
                .select("id")
                .eq("name", roleName)
                .eq("company_id", company.id)
                .maybeSingle();

              if (companyRole) {
                // Update the assignment to point to company-scoped role
                await sb
                  .from("user_dynamic_roles")
                  .update({ role_id: companyRole.id })
                  .eq("id", assignment.id);
                results.push(`Remapped ${member.user_id} -> ${roleName} (${company.id})`);
              }
            }
          }
        }
      }

      // Clean up old global roles (no company_id)
      const { data: globalRoles } = await sb
        .from("dynamic_roles")
        .select("id")
        .is("company_id", null);

      // Only delete if no user_dynamic_roles still reference them
      for (const gr of (globalRoles || [])) {
        const { data: refs } = await sb
          .from("user_dynamic_roles")
          .select("id")
          .eq("role_id", gr.id)
          .limit(1);

        if (!refs || refs.length === 0) {
          await sb.from("role_permissions").delete().eq("role_id", gr.id);
          await sb.from("dynamic_roles").delete().eq("id", gr.id);
          results.push(`Deleted orphan global role ${gr.id}`);
        }
      }
    } else if (companyId) {
      // Seed for a single company
      await seedRolesForCompany(sb, companyId);
      
      // Get owner for holiday seeding
      const { data: company } = await sb.from("companies").select("owner_id").eq("id", companyId).maybeSingle();
      const ownerId = company?.owner_id || "00000000-0000-0000-0000-000000000000";
      await seedHolidaysForCompany(sb, companyId, ownerId);
      
      results.push(`Seeded defaults for ${companyId}`);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

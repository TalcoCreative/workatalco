import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// All feature keys
const ALL_FEATURES = [
  "dashboard","clients","client_hub","projects","tasks","schedule","shooting","meeting",
  "leave","reimburse","asset","event","reports","form_builder","kol_database","kol_campaign",
  "letters","social_media","editorial_plan","content_builder","team","hr_dashboard",
  "hr_analytics","holiday_calendar","performance","recruitment","recruitment_dashboard",
  "recruitment_forms","finance","income_statement","balance_sheet","prospects",
  "sales_analytics","ceo_dashboard","billing","email_settings","role_management",
];

const FULL = { can_view:true, can_create:true, can_edit:true, can_delete:true, can_export:true, can_comment:true, can_mention:true };
const VIEW_ONLY = { can_view:true, can_create:false, can_edit:false, can_delete:false, can_export:false, can_comment:false, can_mention:false };
const VIEW_CREATE_EDIT = { can_view:true, can_create:true, can_edit:true, can_delete:false, can_export:true, can_comment:true, can_mention:true };
const NONE = { can_view:false, can_create:false, can_edit:false, can_delete:false, can_export:false, can_comment:false, can_mention:false };

// Feature sets per category
const CORE_NAV = ["dashboard","clients","projects","tasks","schedule","shooting","meeting","leave","reimburse","asset","event","reports"];
const SOCIAL_FEATURES = ["social_media","editorial_plan","content_builder"];
const HR_FEATURES = ["team","hr_dashboard","hr_analytics","holiday_calendar","performance","recruitment","recruitment_dashboard","recruitment_forms"];
const FINANCE_FEATURES = ["finance","income_statement","balance_sheet"];
const SALES_FEATURES = ["prospects","sales_analytics"];
const SYSTEM_FEATURES = ["billing","email_settings","role_management"];
const EXEC_FEATURES = ["ceo_dashboard"];
const CONTENT_NAV = ["kol_database","kol_campaign","letters","form_builder","client_hub"];

interface RoleDef {
  value: string;
  label: string;
  category: string;
  description: string;
}

const ALL_ROLES: RoleDef[] = [
  { value:"super_admin", label:"Super Admin", category:"Executive", description:"Full system access" },
  { value:"admin", label:"Admin", category:"Executive", description:"Administrative access to all modules" },
  { value:"owner", label:"Owner", category:"Executive", description:"Company owner with full access" },
  { value:"director", label:"Director", category:"Executive", description:"Director-level strategic access" },
  { value:"creative_director", label:"Creative Director", category:"Executive", description:"Creative leadership with full creative & project access" },
  { value:"art_director", label:"Art Director", category:"Executive", description:"Art direction with creative & project access" },
  { value:"project_manager", label:"Project Manager", category:"Management", description:"Manages projects, tasks, schedules, and team coordination" },
  { value:"account_manager", label:"Account Manager", category:"Management", description:"Manages client accounts, projects, and deliverables" },
  { value:"account_executive", label:"Account Executive", category:"Management", description:"Handles client relationships and sales pipeline" },
  { value:"producer", label:"Producer", category:"Management", description:"Manages production schedules, shootings, and events" },
  { value:"talent_manager", label:"Talent Manager", category:"Management", description:"Manages talent, KOL database, and campaigns" },
  { value:"event_coordinator", label:"Event Coordinator", category:"Management", description:"Coordinates events, schedules, and logistics" },
  { value:"graphic_designer", label:"Graphic Designer", category:"Creative", description:"Design tasks, projects, and content production" },
  { value:"ui_ux_designer", label:"UI/UX Designer", category:"Creative", description:"UI/UX design tasks and project collaboration" },
  { value:"motion_graphic", label:"Motion Graphic Designer", category:"Creative", description:"Motion graphics and video content production" },
  { value:"illustrator", label:"Illustrator", category:"Creative", description:"Illustration tasks and creative projects" },
  { value:"photographer", label:"Photographer", category:"Creative", description:"Photography, shooting schedules, and asset management" },
  { value:"video_editor", label:"Video Editor", category:"Creative", description:"Video editing, content production, and asset management" },
  { value:"content_writer", label:"Content Writer", category:"Content", description:"Content writing, editorial plans, and social media" },
  { value:"content_strategist", label:"Content Strategist", category:"Content", description:"Content strategy, editorial planning, and analytics" },
  { value:"copywriter", label:"Copywriter", category:"Content", description:"Copywriting tasks and content creation" },
  { value:"socmed_admin", label:"Social Media Admin", category:"Content", description:"Social media management and content publishing" },
  { value:"community_manager", label:"Community Manager", category:"Content", description:"Community engagement and social media monitoring" },
  { value:"seo_specialist", label:"SEO Specialist", category:"Content", description:"SEO optimization, reports, and content strategy" },
  { value:"marketing", label:"Marketing", category:"Marketing", description:"Marketing campaigns, prospects, and analytics" },
  { value:"ads_manager", label:"Ads Manager", category:"Marketing", description:"Advertising campaigns, budgets, and performance" },
  { value:"media_planner", label:"Media Planner", category:"Marketing", description:"Media planning, scheduling, and campaign coordination" },
  { value:"pr_specialist", label:"PR Specialist", category:"Marketing", description:"Public relations, client communications, and events" },
  { value:"sales", label:"Sales", category:"Marketing", description:"Sales pipeline, prospects, and deal management" },
  { value:"hr", label:"HR", category:"Operations", description:"Human resources, team management, and recruitment" },
  { value:"finance", label:"Finance", category:"Operations", description:"Financial management, budgets, and reporting" },
  { value:"accounting", label:"Accounting", category:"Operations", description:"Accounting, ledger, and financial statements" },
  { value:"web_developer", label:"Web Developer", category:"Operations", description:"Development tasks, projects, and technical work" },
  { value:"data_analyst", label:"Data Analyst", category:"Operations", description:"Data analysis, reports, and business intelligence" },
  { value:"intern", label:"Intern", category:"Other", description:"Limited access for interns - basic tasks and schedule" },
  { value:"freelancer", label:"Freelancer", category:"Other", description:"External collaborator - tasks and project view" },
  { value:"consultant", label:"Consultant", category:"Other", description:"Consultant access - projects, reports, and analytics" },
  { value:"user", label:"User", category:"Other", description:"Basic user access - dashboard and tasks" },
];

function buildPerms(role: RoleDef): Record<string, typeof FULL> {
  const perms: Record<string, typeof FULL> = {};
  ALL_FEATURES.forEach(f => { perms[f] = { ...NONE }; });

  const cat = role.category;
  const val = role.value;

  if (cat === "Executive") {
    // Full access to everything
    ALL_FEATURES.forEach(f => { perms[f] = { ...FULL }; });
    return perms;
  }

  // Everyone gets dashboard view
  perms["dashboard"] = { ...VIEW_ONLY, can_comment: true };

  if (cat === "Management") {
    CORE_NAV.forEach(f => { perms[f] = { ...FULL }; });
    SOCIAL_FEATURES.forEach(f => { perms[f] = { ...VIEW_CREATE_EDIT }; });
    CONTENT_NAV.forEach(f => { perms[f] = { ...VIEW_CREATE_EDIT }; });
    // Managers can view HR but not full access
    perms["team"] = { ...VIEW_ONLY };
    perms["hr_dashboard"] = { ...VIEW_ONLY };
    perms["holiday_calendar"] = { ...VIEW_ONLY };
    perms["performance"] = { ...VIEW_CREATE_EDIT };
    // Specific overrides
    if (val === "talent_manager") {
      perms["kol_database"] = { ...FULL };
      perms["kol_campaign"] = { ...FULL };
    }
    if (val === "event_coordinator") {
      perms["event"] = { ...FULL };
    }
    if (val === "account_executive") {
      SALES_FEATURES.forEach(f => { perms[f] = { ...VIEW_CREATE_EDIT }; });
    }
  }

  if (cat === "Creative") {
    // Creative roles: projects, tasks, shooting, schedule, content
    ["projects","tasks","schedule","shooting","meeting"].forEach(f => { perms[f] = { ...VIEW_CREATE_EDIT }; });
    ["asset"].forEach(f => { perms[f] = { ...VIEW_ONLY }; });
    SOCIAL_FEATURES.forEach(f => { perms[f] = { ...VIEW_CREATE_EDIT }; });
    perms["leave"] = { ...VIEW_ONLY, can_create: true };
    perms["reimburse"] = { ...VIEW_ONLY, can_create: true };
    perms["holiday_calendar"] = { ...VIEW_ONLY };
    if (val === "photographer") {
      perms["shooting"] = { ...FULL };
      perms["asset"] = { ...VIEW_CREATE_EDIT };
    }
    if (val === "video_editor") {
      perms["asset"] = { ...VIEW_CREATE_EDIT };
    }
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
    if (val === "socmed_admin" || val === "community_manager") {
      perms["client_hub"] = { ...VIEW_CREATE_EDIT };
    }
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
    if (val === "ads_manager") {
      perms["reports"] = { ...FULL };
    }
    if (val === "pr_specialist") {
      perms["event"] = { ...VIEW_CREATE_EDIT };
      perms["meeting"] = { ...VIEW_CREATE_EDIT };
    }
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
      if (val === "accounting") {
        perms["billing"] = { ...VIEW_ONLY };
      }
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

    const results: string[] = [];

    for (const role of ALL_ROLES) {
      // Check if dynamic_role with this name already exists
      const { data: existing } = await sb
        .from("dynamic_roles")
        .select("id")
        .eq("name", role.label)
        .maybeSingle();

      let roleId: string;

      if (existing) {
        roleId = existing.id;
        // Update description
        await sb.from("dynamic_roles").update({ description: role.description }).eq("id", roleId);
        results.push(`Updated: ${role.label}`);
      } else {
        const { data: created, error } = await sb
          .from("dynamic_roles")
          .insert({ name: role.label, description: role.description })
          .select("id")
          .single();
        if (error) { results.push(`Error creating ${role.label}: ${error.message}`); continue; }
        roleId = created.id;
        results.push(`Created: ${role.label}`);
      }

      // Delete existing permissions and re-insert
      await sb.from("role_permissions").delete().eq("role_id", roleId);

      const perms = buildPerms(role);
      const rows = ALL_FEATURES.map(f => ({
        role_id: roleId,
        feature_key: f,
        ...perms[f],
      }));

      const { error: permErr } = await sb.from("role_permissions").insert(rows);
      if (permErr) {
        results.push(`  Perm error for ${role.label}: ${permErr.message}`);
      }
    }

    // Now auto-assign dynamic roles to all existing users who have user_roles but no user_dynamic_roles
    const { data: allUserRoles } = await sb.from("user_roles").select("user_id, role");
    const { data: allDynamic } = await sb.from("user_dynamic_roles").select("user_id");
    const { data: allDynamicRoles } = await sb.from("dynamic_roles").select("id, name");

    const assignedUserIds = new Set(allDynamic?.map(d => d.user_id) || []);
    
    // Build name->id map using role labels
    const roleNameToId: Record<string, string> = {};
    const roleLabelMap: Record<string, string> = {};
    ALL_ROLES.forEach(r => { roleLabelMap[r.value] = r.label; });
    allDynamicRoles?.forEach(dr => { roleNameToId[dr.name] = dr.id; });

    let autoAssigned = 0;
    for (const ur of (allUserRoles || [])) {
      if (assignedUserIds.has(ur.user_id)) continue;
      const label = roleLabelMap[ur.role] || ur.role;
      const dynId = roleNameToId[label];
      if (dynId) {
        await sb.from("user_dynamic_roles").upsert(
          { user_id: ur.user_id, role_id: dynId },
          { onConflict: "user_id" }
        );
        assignedUserIds.add(ur.user_id);
        autoAssigned++;
      }
    }

    results.push(`Auto-assigned dynamic roles to ${autoAssigned} users`);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

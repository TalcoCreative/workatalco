/**
 * Centralized role definitions for the entire application.
 * All role labels, categories, and colors are defined here.
 */

export interface RoleDefinition {
  value: string;
  label: string;
  category: string;
}

/**
 * Complete list of available roles, grouped by category.
 * Keep labels in English for consistency.
 */
export const ALL_ROLES: RoleDefinition[] = [
  // Executive & Leadership
  { value: "super_admin", label: "Super Admin", category: "Executive" },
  { value: "admin", label: "Admin", category: "Executive" },
  { value: "owner", label: "Owner", category: "Executive" },
  { value: "director", label: "Director", category: "Executive" },
  { value: "creative_director", label: "Creative Director", category: "Executive" },
  { value: "art_director", label: "Art Director", category: "Executive" },

  // Management
  { value: "project_manager", label: "Project Manager", category: "Management" },
  { value: "account_manager", label: "Account Manager", category: "Management" },
  { value: "account_executive", label: "Account Executive", category: "Management" },
  { value: "producer", label: "Producer", category: "Management" },
  { value: "talent_manager", label: "Talent Manager", category: "Management" },
  { value: "event_coordinator", label: "Event Coordinator", category: "Management" },

  // Creative & Design
  { value: "graphic_designer", label: "Graphic Designer", category: "Creative" },
  { value: "ui_ux_designer", label: "UI/UX Designer", category: "Creative" },
  { value: "motion_graphic", label: "Motion Graphic Designer", category: "Creative" },
  { value: "illustrator", label: "Illustrator", category: "Creative" },
  { value: "photographer", label: "Photographer", category: "Creative" },
  { value: "video_editor", label: "Video Editor", category: "Creative" },

  // Content & Marketing
  { value: "content_writer", label: "Content Writer", category: "Content" },
  { value: "content_strategist", label: "Content Strategist", category: "Content" },
  { value: "copywriter", label: "Copywriter", category: "Content" },
  { value: "socmed_admin", label: "Social Media Admin", category: "Content" },
  { value: "community_manager", label: "Community Manager", category: "Content" },
  { value: "seo_specialist", label: "SEO Specialist", category: "Content" },

  // Marketing & Sales
  { value: "marketing", label: "Marketing", category: "Marketing" },
  { value: "ads_manager", label: "Ads Manager", category: "Marketing" },
  { value: "media_planner", label: "Media Planner", category: "Marketing" },
  { value: "pr_specialist", label: "PR Specialist", category: "Marketing" },
  { value: "sales", label: "Sales", category: "Marketing" },

  // Operations & Support
  { value: "hr", label: "HR", category: "Operations" },
  { value: "finance", label: "Finance", category: "Operations" },
  { value: "accounting", label: "Accounting", category: "Operations" },
  { value: "web_developer", label: "Web Developer", category: "Operations" },
  { value: "data_analyst", label: "Data Analyst", category: "Operations" },

  // Other
  { value: "intern", label: "Intern", category: "Other" },
  { value: "freelancer", label: "Freelancer", category: "Other" },
  { value: "consultant", label: "Consultant", category: "Other" },
  { value: "user", label: "User", category: "Other" },
];

/**
 * Get role label from value.
 */
export function getRoleLabelFromList(roleValue: string): string {
  const found = ALL_ROLES.find(r => r.value === roleValue);
  if (found) return found.label;
  // Fallback: convert snake_case to Title Case
  return roleValue.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get role category from value.
 */
export function getRoleCategoryFromList(roleValue: string): string {
  return ALL_ROLES.find(r => r.value === roleValue)?.category || "Other";
}

/**
 * Get role color based on category.
 */
export function getRoleBadgeColor(roleValue: string): string {
  const category = getRoleCategoryFromList(roleValue);
  const map: Record<string, string> = {
    Executive: "bg-primary text-primary-foreground",
    Management: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    Creative: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    Content: "bg-green-500/15 text-green-700 dark:text-green-300",
    Marketing: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    Operations: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    Other: "bg-muted text-muted-foreground",
  };
  return map[category] || map.Other;
}

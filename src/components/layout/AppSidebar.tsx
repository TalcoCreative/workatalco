import { 
  Users, Briefcase, CheckSquare, Calendar, BarChart3, Building2, ClipboardCheck,
  Video, Home, LogOut, CalendarOff, Wallet, Receipt, UserPlus, TrendingUp,
  UserSearch, CalendarClock, Package, FileText, Star, Megaphone, PartyPopper,
  Crown, Share2, Scale, PieChart, Sparkles, CalendarHeart, BarChart2, Shield,
  Lock, StickyNote,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanySlug } from "@/hooks/useCompanySlug";
import { useTierAccess } from "@/hooks/useTierAccess";
import { WorkspaceSwitcher } from "@/components/saas/WorkspaceSwitcher";
import { Badge } from "@/components/ui/badge";

type NavItem = { title: string; path: string; icon: any; featureKey: string };

// ── Main ──
const mainItems: NavItem[] = [
  { title: "Dashboard", path: "", icon: Home, featureKey: "dashboard" },
  { title: "Clients", path: "clients", icon: Building2, featureKey: "clients" },
  { title: "Projects", path: "projects", icon: Briefcase, featureKey: "projects" },
  { title: "Tasks", path: "tasks", icon: CheckSquare, featureKey: "tasks" },
  { title: "Schedule", path: "schedule", icon: Calendar, featureKey: "schedule" },
];

// ── Operations ──
const operationsItems: NavItem[] = [
  { title: "Shooting", path: "shooting", icon: Video, featureKey: "shooting" },
  { title: "Meeting", path: "meeting", icon: CalendarClock, featureKey: "meeting" },
  { title: "Event", path: "event", icon: PartyPopper, featureKey: "event" },
];

// ── Employee ──
const employeeItems: NavItem[] = [
  { title: "Leave", path: "leave", icon: CalendarOff, featureKey: "leave" },
  { title: "Reimburse", path: "my-reimbursement", icon: Receipt, featureKey: "reimburse" },
  { title: "Asset", path: "asset", icon: Package, featureKey: "asset" },
  { title: "Personal Notes", path: "notes", icon: StickyNote, featureKey: "personal_notes" },
];

// ── Reports & Letters ──
const reportsItems: NavItem[] = [
  { title: "Reports", path: "reports", icon: BarChart3, featureKey: "reports" },
  { title: "Letters", path: "letters", icon: FileText, featureKey: "letters" },
];

// ── KOL ──
const kolItems: NavItem[] = [
  { title: "KOL Database", path: "kol-database", icon: Star, featureKey: "kol_database" },
  { title: "KOL Campaign", path: "kol-campaign", icon: Megaphone, featureKey: "kol_campaign" },
];

// ── Form Builder ──
const formItems: NavItem[] = [
  { title: "Form Builder", path: "forms", icon: FileText, featureKey: "form_builder" },
];

// ── Social Media ──
const socialMediaItems: NavItem[] = [
  { title: "Editorial Plan", path: "editorial-plan", icon: FileText, featureKey: "editorial_plan" },
  { title: "Content Builder", path: "content-builder", icon: Sparkles, featureKey: "content_builder" },
];

// ── HR ──
const hrItems: NavItem[] = [
  { title: "Team", path: "users", icon: Users, featureKey: "team" },
  { title: "HR Dashboard", path: "hr-dashboard", icon: ClipboardCheck, featureKey: "hr_dashboard" },
  { title: "HR Analytics", path: "hr/analytics", icon: BarChart2, featureKey: "hr_analytics" },
  { title: "Holiday Calendar", path: "hr/holiday", icon: CalendarHeart, featureKey: "holiday_calendar" },
  { title: "Performance", path: "performance", icon: TrendingUp, featureKey: "performance" },
  { title: "Recruitment", path: "recruitment", icon: UserSearch, featureKey: "recruitment" },
  { title: "Recruitment Dashboard", path: "recruitment/dashboard", icon: BarChart3, featureKey: "recruitment_dashboard" },
  { title: "Recruitment Forms", path: "recruitment/forms", icon: FileText, featureKey: "recruitment_forms" },
];

// ── Finance ──
const financeItems: NavItem[] = [
  { title: "Finance", path: "finance", icon: Wallet, featureKey: "finance" },
];

// ── Sales ──
const salesItems: NavItem[] = [
  { title: "Sales Analytics", path: "sales/dashboard", icon: TrendingUp, featureKey: "sales_analytics" },
  { title: "Prospects", path: "prospects", icon: UserPlus, featureKey: "prospects" },
];

// ── Executive ──
const executiveItems: NavItem[] = [
  { title: "CEO Dashboard", path: "ceo-dashboard", icon: Crown, featureKey: "ceo_dashboard" },
];

// ── System ──
const systemItems: NavItem[] = [
  { title: "Profile Settings", path: "profile", icon: Users, featureKey: "dashboard" },
  { title: "Role & Access", path: "system/roles", icon: Shield, featureKey: "role_management" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const slug = useCompanySlug();
  const { canView, isSuperAdmin } = usePermissions();
  const { isTierFeature, tier } = useTierAccess();

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile-sidebar"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.session.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch {
      toast.error("Failed to log out");
    }
  };

  const isCollapsed = state === "collapsed";
  const prefix = `/${slug}`;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-sidebar-primary/15 text-sidebar-primary-foreground shadow-inner-soft'
        : 'text-sidebar-foreground/55 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
    }`;

  const filterItems = (items: NavItem[]) => items.filter(i => {
    if (isSuperAdmin) return canView(i.featureKey);
    return canView(i.featureKey) && isTierFeature(i.featureKey);
  });

  const renderGroup = (label: string, items: NavItem[]) => {
    const visible = filterItems(items);
    if (visible.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/30 text-[10px] font-semibold uppercase tracking-[0.1em] px-4 mb-1.5">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="px-2 space-y-0.5">
            {visible.map((item) => (
              <SidebarMenuItem key={item.title + item.path}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.path === "" ? prefix : `${prefix}/${item.path}`}
                    end={item.path === ""}
                    className={navLinkClass}
                  >
                    <item.icon className="h-4 w-4 opacity-70" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  const tierLabel: Record<string, string> = {
    trial: "Free Trial",
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/15">
      <SidebarContent className="bg-sidebar">
        <div className="px-4 py-6">
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
                <span className="text-sidebar-primary font-semibold text-sm">
                  {userProfile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-sidebar-foreground leading-tight">
                  Hi, {userProfile?.full_name?.split(" ")[0] || "User"}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[10px] text-sidebar-foreground/40">{slug}</p>
                  <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 border-sidebar-primary/30 text-sidebar-primary">
                    {tierLabel[tier] || tier}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-9 w-9 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
                <span className="text-sidebar-primary font-semibold text-sm">
                  {userProfile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {renderGroup("Main", mainItems)}
        {renderGroup("Operations", operationsItems)}
        {renderGroup("Employee", employeeItems)}
        {renderGroup("Reports & Letters", reportsItems)}
        {renderGroup("KOL", kolItems)}
        {renderGroup("Form Builder", formItems)}
        {renderGroup("Social Media", socialMediaItems)}
        {renderGroup("HR", hrItems)}
        {renderGroup("Finance", financeItems)}
        {renderGroup("Sales", salesItems)}
        {renderGroup("Executive", executiveItems)}
        {renderGroup("System", systemItems)}

      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/15 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout} 
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/50 hover:bg-destructive/8 hover:text-destructive transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

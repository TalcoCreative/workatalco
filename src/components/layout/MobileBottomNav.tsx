import {
  Home, CheckSquare, Briefcase, Calendar, Menu, Building2, UserPlus, TrendingUp,
  Star, Megaphone, CalendarClock, Video, PartyPopper, Share2, FileText, Sparkles,
  BarChart3, Users, ClipboardCheck, BarChart2, CalendarOff, CalendarHeart, UserSearch,
  Wallet, Receipt, Package, Shield, Crown, Scale, PieChart, StickyNote,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePermissions } from "@/hooks/usePermissions";
import { useTierAccess } from "@/hooks/useTierAccess";
import { useCompanySlug } from "@/hooks/useCompanySlug";

const primaryTabs = [
  { title: "Home", path: "", icon: Home, featureKey: "dashboard" },
  { title: "Tasks", path: "tasks", icon: CheckSquare, featureKey: "tasks" },
  { title: "Projects", path: "projects", icon: Briefcase, featureKey: "projects" },
  { title: "Schedule", path: "schedule", icon: Calendar, featureKey: "schedule" },
  { title: "More", path: "#more", icon: Menu, featureKey: "__more__" },
];

type MoreItem = { title: string; path: string; featureKey: string; icon: any };
type MoreGroup = { label: string; color: string; iconColor: string; items: MoreItem[] };

const moreGroups: MoreGroup[] = [
  {
    label: "Main",
    color: "from-blue-500/20 to-blue-400/10",
    iconColor: "text-blue-500",
    items: [
      { title: "Clients", path: "clients", featureKey: "clients", icon: Building2 },
    ],
  },
  {
    label: "Operations",
    color: "from-violet-500/20 to-violet-400/10",
    iconColor: "text-violet-500",
    items: [
      { title: "Shooting", path: "shooting", featureKey: "shooting", icon: Video },
      { title: "Meeting", path: "meeting", featureKey: "meeting", icon: CalendarClock },
      { title: "Event", path: "event", featureKey: "event", icon: PartyPopper },
    ],
  },
  {
    label: "Employee",
    color: "from-teal-500/20 to-teal-400/10",
    iconColor: "text-teal-500",
    items: [
      { title: "Leave", path: "leave", featureKey: "leave", icon: CalendarOff },
      { title: "Reimburse", path: "my-reimbursement", featureKey: "reimburse", icon: Receipt },
      { title: "Asset", path: "asset", featureKey: "asset", icon: Package },
      { title: "Personal Notes", path: "notes", featureKey: "personal_notes", icon: StickyNote },
    ],
  },
  {
    label: "Reports & Letters",
    color: "from-indigo-500/20 to-indigo-400/10",
    iconColor: "text-indigo-500",
    items: [
      { title: "Reports", path: "reports", featureKey: "reports", icon: BarChart3 },
      { title: "Letters", path: "letters", featureKey: "letters", icon: FileText },
    ],
  },
  {
    label: "KOL",
    color: "from-yellow-500/20 to-yellow-400/10",
    iconColor: "text-yellow-500",
    items: [
      { title: "KOL Database", path: "kol-database", featureKey: "kol_database", icon: Star },
      { title: "KOL Campaign", path: "kol-campaign", featureKey: "kol_campaign", icon: Megaphone },
    ],
  },
  {
    label: "Form Builder",
    color: "from-cyan-500/20 to-cyan-400/10",
    iconColor: "text-cyan-500",
    items: [
      { title: "Form Builder", path: "forms", featureKey: "form_builder", icon: FileText },
    ],
  },
  {
    label: "Social Media",
    color: "from-pink-500/20 to-pink-400/10",
    iconColor: "text-pink-500",
    items: [
      { title: "Editorial Plan", path: "editorial-plan", featureKey: "editorial_plan", icon: FileText },
      { title: "Content Builder", path: "content-builder", featureKey: "content_builder", icon: Sparkles },
    ],
  },
  {
    label: "HR",
    color: "from-emerald-500/20 to-emerald-400/10",
    iconColor: "text-emerald-500",
    items: [
      { title: "Team", path: "users", featureKey: "team", icon: Users },
      { title: "HR Dashboard", path: "hr-dashboard", featureKey: "hr_dashboard", icon: ClipboardCheck },
      { title: "HR Analytics", path: "hr/analytics", featureKey: "hr_analytics", icon: BarChart2 },
      { title: "Holiday Calendar", path: "hr/holiday", featureKey: "holiday_calendar", icon: CalendarHeart },
      { title: "Performance", path: "performance", featureKey: "performance", icon: TrendingUp },
      { title: "Recruitment", path: "recruitment", featureKey: "recruitment", icon: UserSearch },
      { title: "Recruitment Dashboard", path: "recruitment/dashboard", featureKey: "recruitment_dashboard", icon: BarChart3 },
      { title: "Recruitment Forms", path: "recruitment/forms", featureKey: "recruitment_forms", icon: FileText },
    ],
  },
  {
    label: "Finance",
    color: "from-amber-500/20 to-amber-400/10",
    iconColor: "text-amber-500",
    items: [
      { title: "Finance", path: "finance", featureKey: "finance", icon: Wallet },
    ],
  },
  {
    label: "Sales",
    color: "from-orange-500/20 to-orange-400/10",
    iconColor: "text-orange-500",
    items: [
      { title: "Sales Analytics", path: "sales/dashboard", featureKey: "sales_analytics", icon: TrendingUp },
      { title: "Prospects", path: "prospects", featureKey: "prospects", icon: UserPlus },
    ],
  },
  {
    label: "Executive",
    color: "from-rose-500/20 to-rose-400/10",
    iconColor: "text-rose-500",
    items: [
      { title: "CEO Dashboard", path: "ceo-dashboard", featureKey: "ceo_dashboard", icon: Crown },
    ],
  },
  {
    label: "System",
    color: "from-slate-500/20 to-slate-400/10",
    iconColor: "text-slate-500",
    items: [
      { title: "Role & Access", path: "system/roles", featureKey: "role_management", icon: Shield },
    ],
  },
];

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const { canView, isSuperAdmin } = usePermissions();
  const { isTierFeature } = useTierAccess();
  const slug = useCompanySlug();
  const prefix = `/${slug}`;

  const canAccess = (featureKey: string) => {
    if (isSuperAdmin) return canView(featureKey);
    return canView(featureKey) && isTierFeature(featureKey);
  };

  const visiblePrimary = primaryTabs.filter(t => t.featureKey === "__more__" || canAccess(t.featureKey));

  const getUrl = (path: string) => path === "" ? prefix : `${prefix}/${path}`;

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/80 backdrop-blur-2xl border-t border-border/15"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16">
          {visiblePrimary.map((tab) => {
            if (tab.path === "#more") {
              return (
                <button
                  key="more"
                  onClick={() => setMoreOpen(true)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 w-full h-full text-muted-foreground/60 transition-all duration-200 tap-target",
                    moreOpen && "text-primary"
                  )}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium tracking-wide">{tab.title}</span>
                </button>
              );
            }
            const url = getUrl(tab.path);
            const isActive = location.pathname === url;
            return (
              <NavLink
                key={tab.path}
                to={url}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-200 tap-target",
                  isActive ? "text-primary" : "text-muted-foreground/60"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200",
                  isActive && "bg-primary/10"
                )}>
                  <tab.icon className="h-5 w-5" />
                </div>
                <span className={cn(
                  "text-[10px] font-medium tracking-wide",
                  isActive && "font-semibold"
                )}>{tab.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10 max-h-[80vh] border-0 shadow-soft-xl">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold">Menu Lainnya</SheetTitle>
          </SheetHeader>
          <ScrollArea className="mt-4 h-[60vh]">
            <div className="space-y-5 pr-3 pb-6">
              {moreGroups.map((group) => {
                const visible = group.items.filter(i => canAccess(i.featureKey));
                if (visible.length === 0) return null;
                return (
                  <div key={group.label}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50 mb-2.5 px-1">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {visible.map((item) => {
                        const url = getUrl(item.path);
                        const isActive = location.pathname === url;
                        return (
                          <NavLink
                            key={item.path}
                            to={url}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-2xl px-2 py-3.5 text-center transition-all duration-200 tap-target",
                              isActive
                                ? "bg-primary/12 text-primary ring-1 ring-primary/20 shadow-soft"
                                : `bg-gradient-to-b ${group.color} hover:shadow-soft`
                            )}
                          >
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center",
                              isActive ? "bg-primary/15" : "bg-background/60"
                            )}>
                              <item.icon className={cn(
                                "h-4.5 w-4.5 shrink-0",
                                isActive ? "text-primary" : group.iconColor
                              )} />
                            </div>
                            <span className="text-[10px] font-medium leading-tight line-clamp-2 text-foreground/80">
                              {item.title}
                            </span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

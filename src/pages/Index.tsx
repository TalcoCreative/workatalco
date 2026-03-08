import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { useCompanyNavigate } from "@/hooks/useCompanyNavigate";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePermissions } from "@/hooks/usePermissions";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClockInOut } from "@/components/attendance/ClockInOut";
import { ShootingNotifications } from "@/components/shooting/ShootingNotifications";
import { DeletionNotifications } from "@/components/hr/DeletionNotifications";
import { MeetingInvitationNotifications } from "@/components/meeting/MeetingInvitationNotifications";
import { AnnouncementNotifications } from "@/components/announcements/AnnouncementNotifications";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { TodayPostsWidget } from "@/components/dashboard/TodayPostsWidget";
import HolidayBanner from "@/components/holiday/HolidayBanner";
import { Badge } from "@/components/ui/badge";
import {
  Users, FolderKanban, ArrowDownToLine, ArrowUpFromLine, ChevronRight, AlertTriangle,
  Building2, CheckSquare, Calendar, Video, CalendarClock, CalendarOff, Receipt,
  Package, PartyPopper, BarChart3, FileText, Star, Megaphone, Share2, Sparkles,
  Wallet, TrendingUp, UserSearch, Crown, Shield, ClipboardCheck,
} from "lucide-react";
import { isPast, parseISO, format } from "date-fns";

const statusLabels: Record<string, string> = {
  pending: "Pending", in_progress: "In Progress", completed: "Completed",
  on_hold: "On Hold", revise: "Revise", todo: "To Do", done: "Done",
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": case "done": return "bg-status-done/15 text-status-done";
    case "in_progress": return "bg-status-progress/15 text-status-progress";
    case "pending": case "todo": return "bg-status-todo/15 text-status-todo";
    case "on_hold": return "bg-status-on-hold/15 text-status-on-hold";
    case "revise": return "bg-destructive/15 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
};

const isTaskOverdue = (task: any) => {
  if (!task.deadline) return false;
  if (task.status === 'completed' || task.status === 'done') return false;
  return isPast(parseISO(task.deadline));
};

// Module quick-access cards
const moduleShortcuts = [
  { key: "clients", label: "Clients", icon: Building2, color: "from-blue-500/10 to-blue-600/5", iconColor: "text-blue-500", path: "clients" },
  { key: "projects", label: "Projects", icon: FolderKanban, color: "from-violet-500/10 to-violet-600/5", iconColor: "text-violet-500", path: "projects" },
  { key: "tasks", label: "Tasks", icon: CheckSquare, color: "from-emerald-500/10 to-emerald-600/5", iconColor: "text-emerald-500", path: "tasks" },
  { key: "schedule", label: "Schedule", icon: Calendar, color: "from-amber-500/10 to-amber-600/5", iconColor: "text-amber-500", path: "schedule" },
  { key: "shooting", label: "Shooting", icon: Video, color: "from-pink-500/10 to-pink-600/5", iconColor: "text-pink-500", path: "shooting" },
  { key: "meeting", label: "Meeting", icon: CalendarClock, color: "from-cyan-500/10 to-cyan-600/5", iconColor: "text-cyan-500", path: "meeting" },
  { key: "leave", label: "Leave", icon: CalendarOff, color: "from-orange-500/10 to-orange-600/5", iconColor: "text-orange-500", path: "leave" },
  { key: "reimburse", label: "Reimburse", icon: Receipt, color: "from-lime-500/10 to-lime-600/5", iconColor: "text-lime-500", path: "my-reimbursement" },
  { key: "asset", label: "Asset", icon: Package, color: "from-slate-500/10 to-slate-600/5", iconColor: "text-slate-500", path: "asset" },
  { key: "event", label: "Event", icon: PartyPopper, color: "from-rose-500/10 to-rose-600/5", iconColor: "text-rose-500", path: "event" },
  { key: "reports", label: "Reports", icon: BarChart3, color: "from-indigo-500/10 to-indigo-600/5", iconColor: "text-indigo-500", path: "reports" },
  { key: "social_media", label: "Social Media", icon: Share2, color: "from-sky-500/10 to-sky-600/5", iconColor: "text-sky-500", path: "social-media" },
  { key: "editorial_plan", label: "Editorial", icon: FileText, color: "from-teal-500/10 to-teal-600/5", iconColor: "text-teal-500", path: "editorial-plan" },
  { key: "content_builder", label: "Content", icon: Sparkles, color: "from-fuchsia-500/10 to-fuchsia-600/5", iconColor: "text-fuchsia-500", path: "content-builder" },
  { key: "finance", label: "Finance", icon: Wallet, color: "from-green-500/10 to-green-600/5", iconColor: "text-green-600", path: "finance" },
  { key: "team", label: "Team", icon: Users, color: "from-blue-400/10 to-blue-500/5", iconColor: "text-blue-400", path: "users" },
  { key: "kol_database", label: "KOL", icon: Star, color: "from-yellow-500/10 to-yellow-600/5", iconColor: "text-yellow-500", path: "kol-database" },
  { key: "prospects", label: "Prospects", icon: UserSearch, color: "from-purple-500/10 to-purple-600/5", iconColor: "text-purple-500", path: "prospects" },
  { key: "sales_analytics", label: "Sales", icon: TrendingUp, color: "from-emerald-400/10 to-emerald-500/5", iconColor: "text-emerald-400", path: "sales/dashboard" },
  { key: "ceo_dashboard", label: "CEO", icon: Crown, color: "from-amber-400/10 to-amber-500/5", iconColor: "text-amber-400", path: "ceo-dashboard" },
];

export default function Index() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { memberIds } = useCompanyMembers();
  const { activeWorkspace } = useWorkspace();
  const navigate = useCompanyNavigate();
  const { canView } = usePermissions();

  const { data: session } = useQuery({
    queryKey: ["current-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile-dashboard"],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).maybeSingle();
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.session.user.id).single();
      return data?.role;
    },
  });

  const isHR = userRole === "hr" || userRole === "super_admin";

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", memberIds],
    queryFn: async (): Promise<{ clients: number; projects: number; tasks: number }> => {
      if (memberIds.length === 0) return { clients: 0, projects: 0, tasks: 0 };
      const companyId = activeWorkspace?.id;
      if (!companyId) return { clients: 0, projects: 0, tasks: 0 };
      const { count: clientCount } = await supabase.from("clients").select("id", { count: "exact", head: true }).eq("client_type", "client").eq("status", "active").eq("company_id", companyId);
      const { data: scopedClients } = await supabase.from("clients").select("id").eq("company_id", companyId);
      const scopedClientIds = scopedClients?.map(c => c.id) || [];
      let projectCount = 0;
      if (scopedClientIds.length > 0) {
        const { count } = await supabase.from("projects").select("id", { count: "exact", head: true }).neq("status", "completed").in("client_id", scopedClientIds);
        projectCount = count || 0;
      }
      const { count: taskCount } = await (supabase.from("tasks").select("id", { count: "exact", head: true }) as any).in("created_by", memberIds);
      return { clients: clientCount || 0, projects: projectCount || 0, tasks: taskCount || 0 };
    },
    enabled: memberIds.length > 0,
  });

  const { data: tasksAssignedToMe } = useQuery({
    queryKey: ["tasks-assigned-to-me", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(title, clients(name)), created_by_profile:profiles!fk_tasks_created_by_profiles(full_name)")
        .eq("assigned_to", session.user.id)
        .not("status", "in", "(completed,done)")
        .order("deadline", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: tasksAssignedByMe } = useQuery({
    queryKey: ["tasks-assigned-by-me", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(title, clients(name)), assigned_profile:profiles!fk_tasks_assigned_to_profiles(full_name)")
        .eq("created_by", session.user.id)
        .neq("assigned_to", session.user.id)
        .not("status", "in", "(completed,done)")
        .order("deadline", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  const visibleModules = moduleShortcuts.filter(m => canView(m.key));

  const overdueCount = (tasksAssignedToMe || []).filter(isTaskOverdue).length;

  return (
    <AppLayout>
      <div className="space-y-6 sm:space-y-8 animate-fade-in">
        {/* ── Hero Greeting ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/8 via-primary/3 to-transparent p-5 sm:p-8">
          <div className="relative z-10">
            <p className="text-sm text-muted-foreground font-medium">{greeting} 👋</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight">
              {userProfile?.full_name?.split(" ")[0] || "User"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {activeWorkspace?.name || "Dashboard"} • {format(new Date(), "EEEE, dd MMM yyyy")}
            </p>
          </div>
          {/* Decorative blur */}
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/6 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-primary/4 blur-2xl" />
        </div>

        <HolidayBanner />
        <ClockInOut />
        <AnnouncementNotifications />
        <MeetingInvitationNotifications />
        <ShootingNotifications />
        {isHR && <DeletionNotifications />}

        {/* ── KPI Stat Cards ── */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Clients", value: stats?.clients || 0, icon: Building2, trend: "active", color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Active Projects", value: stats?.projects || 0, icon: FolderKanban, trend: "running", color: "text-violet-500", bg: "bg-violet-500/10" },
            { label: "Tasks to Me", value: tasksAssignedToMe?.length || 0, icon: ArrowDownToLine, trend: overdueCount > 0 ? `${overdueCount} overdue` : "on track", color: "text-emerald-500", bg: "bg-emerald-500/10", alert: overdueCount > 0 },
            { label: "Tasks I Gave", value: tasksAssignedByMe?.length || 0, icon: ArrowUpFromLine, trend: "delegated", color: "text-amber-500", bg: "bg-amber-500/10" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="floating-card p-4 sm:p-5 group cursor-default"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <div className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl ${stat.bg} transition-transform duration-200 group-hover:scale-110`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                {stat.alert ? (
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                )}
                <span className={`text-[11px] font-medium ${stat.alert ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {stat.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick Access Modules ── */}
        {visibleModules.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Quick Access</h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5 sm:gap-3">
              {visibleModules.map((mod) => (
                <button
                  key={mod.key}
                  onClick={() => navigate(`/${mod.path}`)}
                  className="floating-card flex flex-col items-center gap-2 p-3 sm:p-4 group cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
                >
                  <div className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${mod.color} transition-transform duration-200 group-hover:scale-110`}>
                    <mod.icon className={`h-5 w-5 ${mod.iconColor}`} />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-foreground/80 text-center leading-tight">{mod.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Today's Posts Widget ── */}
        <TodayPostsWidget />

        {/* ── Task Panels ── */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Tasks to Me */}
          <div className="floating-card overflow-hidden">
            <div className="flex items-center justify-between p-5 sm:p-6 pb-3 sm:pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                  <ArrowDownToLine className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold">Tasks to Me</h3>
                  <p className="text-xs text-muted-foreground">Assigned by others</p>
                </div>
              </div>
              {tasksAssignedToMe && tasksAssignedToMe.length > 0 && (
                <Badge variant="secondary" className="rounded-full px-2.5 text-xs font-semibold">
                  {tasksAssignedToMe.length}
                </Badge>
              )}
            </div>
            <div className="px-5 sm:px-6 pb-5 sm:pb-6">
              {tasksAssignedToMe && tasksAssignedToMe.length > 0 ? (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {tasksAssignedToMe.map((task: any) => (
                    <button
                      key={task.id}
                      className={`w-full text-left p-3 sm:p-4 rounded-2xl border-0 bg-muted/30 hover:bg-muted/60 transition-all duration-200 cursor-pointer group ${isTaskOverdue(task) ? 'ring-1 ring-destructive/30 bg-destructive/5' : ''}`}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{task.title}</p>
                            {isTaskOverdue(task) && <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {task.projects?.clients?.name} • {task.projects?.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`${getStatusColor(task.status)} border-0 text-[10px] sm:text-xs rounded-full px-2`}>
                            {statusLabels[task.status] || task.status}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span>From: {task.created_by_profile?.full_name || "Unknown"}</span>
                        <span className={isTaskOverdue(task) ? 'text-destructive font-semibold' : ''}>
                          Due: {formatDate(task.deadline)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <CheckSquare className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">All clear!</p>
                  <p className="text-xs mt-0.5">No tasks assigned to you</p>
                </div>
              )}
            </div>
          </div>

          {/* Tasks I Assigned */}
          <div className="floating-card overflow-hidden">
            <div className="flex items-center justify-between p-5 sm:p-6 pb-3 sm:pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                  <ArrowUpFromLine className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold">Tasks I Gave</h3>
                  <p className="text-xs text-muted-foreground">Delegated to team</p>
                </div>
              </div>
              {tasksAssignedByMe && tasksAssignedByMe.length > 0 && (
                <Badge variant="secondary" className="rounded-full px-2.5 text-xs font-semibold">
                  {tasksAssignedByMe.length}
                </Badge>
              )}
            </div>
            <div className="px-5 sm:px-6 pb-5 sm:pb-6">
              {tasksAssignedByMe && tasksAssignedByMe.length > 0 ? (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {tasksAssignedByMe.map((task: any) => (
                    <button
                      key={task.id}
                      className={`w-full text-left p-3 sm:p-4 rounded-2xl border-0 bg-muted/30 hover:bg-muted/60 transition-all duration-200 cursor-pointer group ${isTaskOverdue(task) ? 'ring-1 ring-destructive/30 bg-destructive/5' : ''}`}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{task.title}</p>
                            {isTaskOverdue(task) && <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {task.projects?.clients?.name} • {task.projects?.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`${getStatusColor(task.status)} border-0 text-[10px] sm:text-xs rounded-full px-2`}>
                            {statusLabels[task.status] || task.status}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span>To: {task.assigned_profile?.full_name || "Unassigned"}</span>
                        <span className={isTaskOverdue(task) ? 'text-destructive font-semibold' : ''}>
                          Due: {formatDate(task.deadline)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <ArrowUpFromLine className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">No delegated tasks</p>
                  <p className="text-xs mt-0.5">Tasks you assign will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TaskDetailDialog
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
    </AppLayout>
  );
}

import { useEffect, useState } from "react";
import { LogOut, Megaphone, Building2, AlertTriangle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateAnnouncementDialog } from "@/components/announcements/CreateAnnouncementDialog";
import { ManageAnnouncementsDialog } from "@/components/announcements/ManageAnnouncementsDialog";
import { HeaderNotifications } from "@/components/layout/HeaderNotifications";
import { WorkspaceSwitcher } from "@/components/saas/WorkspaceSwitcher";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProfileSettingsDialog } from "@/components/users/ProfileSettingsDialog";
import { useWorkspace } from "@/hooks/useWorkspace";
import { differenceInDays, parseISO } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [createAnnouncementOpen, setCreateAnnouncementOpen] = useState(false);
  const [manageAnnouncementsOpen, setManageAnnouncementsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;
      return session.session.user;
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ["user-roles", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id);
      return data?.map((r) => r.role) || [];
    },
    enabled: !!currentUser,
  });

  const isSuperAdmin = userRoles?.includes("super_admin");
  const canManageAnnouncements = userRoles?.includes("hr") || isSuperAdmin;

  const { activeWorkspace } = useWorkspace();

  // Calculate trial warning for super_admin
  const trialWarning = (() => {
    if (!isSuperAdmin || !activeWorkspace) return null;
    if (activeWorkspace.subscription_tier !== "trial") return null;
    if (!activeWorkspace.trial_end) return null;
    const trialEnd = parseISO(activeWorkspace.trial_end);
    const daysLeft = Math.max(0, differenceInDays(trialEnd, new Date()));
    if (daysLeft > 7) return null; // Only warn in last 7 days
    return { daysLeft, isExpired: daysLeft === 0 };
  })();

  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel('task-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
        const newTask = payload.new as any;
        if (newTask.assigned_to === currentUser.id) {
          toast.info(`New task assigned to you: ${newTask.title}`, { duration: 5000 });
        } else {
          toast.info(`New task created: ${newTask.title}`, { duration: 3000 });
        }
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["active-tasks"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, queryClient]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <>
      {trialWarning && (
        <div className={`flex items-center justify-between gap-3 px-4 py-2 text-sm sticky top-0 z-50 ${
          trialWarning.isExpired
            ? "bg-destructive/10 text-destructive border-b border-destructive/20"
            : "bg-warning/10 text-warning-foreground border-b border-warning/20"
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-medium">
              {trialWarning.isExpired
                ? "⚠️ Trial telah berakhir! Workspace akan dinonaktifkan otomatis. Upgrade sekarang untuk melanjutkan."
                : `⚠️ Trial berakhir dalam ${trialWarning.daysLeft} hari. Upgrade sebelum workspace dinonaktifkan otomatis.`}
            </span>
          </div>
          <a
            href="/landing#pricing"
            className="shrink-0 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Upgrade Now
          </a>
        </div>
      )}
      <header className="flex h-14 items-center justify-between bg-card/70 backdrop-blur-2xl px-4 sm:px-6 gap-3 sticky top-0 z-40 border-b border-border/20">
        {!isMobile && <SidebarTrigger className="flex-shrink-0" />}
        {isMobile && (
          <h1 className="text-sm font-semibold tracking-tight truncate text-foreground">Talco</h1>
        )}
      
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" onClick={() => setWorkspaceSwitcherOpen(true)} title="Switch Workspace" className="h-9 w-9 rounded-xl">
          <Building2 className="h-4 w-4" />
        </Button>
        {canManageAnnouncements && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Pengumuman" className="h-9 w-9 rounded-xl">
                <Megaphone className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl shadow-soft-lg border-border/30">
              <DropdownMenuItem onClick={() => setCreateAnnouncementOpen(true)}>
                Buat Pengumuman
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setManageAnnouncementsOpen(true)}>
                Kelola Pengumuman
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        <HeaderNotifications onTaskClick={(taskId) => setSelectedTaskId(taskId)} />

        <Button variant="ghost" size="icon" onClick={() => setProfileSettingsOpen(true)} title="Profile Settings" className="h-9 w-9 rounded-xl">
          <Settings className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9 rounded-xl">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <CreateAnnouncementDialog open={createAnnouncementOpen} onOpenChange={setCreateAnnouncementOpen} />
      <ManageAnnouncementsDialog open={manageAnnouncementsOpen} onOpenChange={setManageAnnouncementsOpen} />
      {selectedTaskId && (
        <TaskDetailDialog
          taskId={selectedTaskId}
          open={!!selectedTaskId}
          onOpenChange={(open) => !open && setSelectedTaskId(null)}
        />
      )}
      <WorkspaceSwitcher open={workspaceSwitcherOpen} onOpenChange={setWorkspaceSwitcherOpen} />
      <ProfileSettingsDialog open={profileSettingsOpen} onOpenChange={setProfileSettingsOpen} />
      </header>
    </>
  );
}

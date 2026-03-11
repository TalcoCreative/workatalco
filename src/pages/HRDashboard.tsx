import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { AppLayout } from "@/components/layout/AppLayout";
import { MobileDesktopBanner } from "@/components/shared/MobileDesktopBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeletionNotifications } from "@/components/hr/DeletionNotifications";
import { DisciplinaryCases } from "@/components/hr/DisciplinaryCases";
import { LeaveApprovalDialog } from "@/components/leave/LeaveApprovalDialog";
import { Clock, UserCheck, Briefcase, TrendingUp, Calendar, ChevronRight, ArrowUpFromLine, ArrowDownToLine, Video, Building2, CalendarOff, CheckCircle, XCircle, FileWarning, Users, FileText, Star, Database, Cake, Settings, AlertTriangle, Timer } from "lucide-react";
import { format, differenceInHours, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { exportMultiSheetExcel } from "@/lib/excel-utils";
import { FileSpreadsheet } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
  revise: "Revise",
  todo: "To Do",
  done: "Done",
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
    case "done":
      return "bg-green-500";
    case "in_progress":
      return "bg-blue-500";
    case "pending":
    case "todo":
      return "bg-yellow-500";
    case "on_hold":
      return "bg-gray-500";
    case "revise":
      return "bg-red-500";
    default:
      return "bg-muted";
  }
};

export default function HRDashboard() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<any>(null);
  const [autoClockoutLoading, setAutoClockoutLoading] = useState(false);
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [thresholdInput, setThresholdInput] = useState("10:00");
  const [savingThreshold, setSavingThreshold] = useState(false);
  const queryClient = useQueryClient();

  const { memberIds } = useCompanyMembers();

  // Fetch late threshold setting
  const { data: lateThresholdSetting } = useQuery({
    queryKey: ["late-threshold"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("setting_value")
        .eq("setting_key", "late_threshold_time")
        .maybeSingle();
      if (error) throw error;
      return data?.setting_value || "10:00";
    },
  });

  const lateThreshold = lateThresholdSetting || "10:00";

  // Helper: determine if a clock-in time is late
  const getAttendanceStatus = (clockIn: string | null, date: string) => {
    if (!clockIn) return null;
    const clockInDate = parseISO(clockIn);
    const timeStr = format(clockInDate, "HH:mm");
    return timeStr > lateThreshold ? "late" : "on_time";
  };

  const handleSaveThreshold = async () => {
    setSavingThreshold(true);
    try {
      // Try update first
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .eq("setting_key", "late_threshold_time")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("company_settings")
          .update({ setting_value: thresholdInput, updated_at: new Date().toISOString() })
          .eq("setting_key", "late_threshold_time");
      } else {
        await supabase
          .from("company_settings")
          .insert({ setting_key: "late_threshold_time", setting_value: thresholdInput });
      }
      
      toast.success("Late threshold berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["late-threshold"] });
      setShowThresholdSettings(false);
    } catch (error: any) {
      toast.error("Gagal menyimpan threshold");
    } finally {
      setSavingThreshold(false);
    }
  };

  // Fetch all profiles scoped to company
  const { data: profiles } = useQuery({
    queryKey: ["hr-profiles", memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, birth_date")
        .in("id", memberIds)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: memberIds.length > 0,
  });

  // Fetch all users with their attendance (scoped to company)
  const { data: attendance } = useQuery({
    queryKey: ["hr-attendance", memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select("*, profiles(full_name)")
        .in("user_id", memberIds)
        .order("date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
    enabled: memberIds.length > 0,
  });

  // Fetch all tasks within date range (scoped to company members)
  const { data: tasks } = useQuery({
    queryKey: ["hr-tasks", startDate, endDate, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assigned_profile:profiles!fk_tasks_assigned_to_profiles(full_name),
          created_by_profile:profiles!fk_tasks_created_by_profiles(full_name),
          projects(title, clients(name))
        `)
        .in("created_by", memberIds)
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: memberIds.length > 0,
  });

  // Fetch shooting schedules (scoped to company members)
  const { data: shootings } = useQuery({
    queryKey: ["hr-shootings", startDate, endDate, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("shooting_schedules")
        .select(`
          *,
          clients(name),
          projects(title),
          requested_by_profile:profiles!fk_shooting_requested_by_profiles(full_name),
          tasks(status)
        `)
        .in("requested_by", memberIds)
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: memberIds.length > 0,
  });

  // Fetch pending leave requests (scoped to company members)
  const { data: pendingLeaveRequests } = useQuery({
    queryKey: ["hr-pending-leave-requests", memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .in("user_id", memberIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: memberIds.length > 0,
  });

  // Fetch all leave requests (scoped to company members)
  const { data: allLeaveRequests } = useQuery({
    queryKey: ["hr-all-leave-requests", memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          profiles:user_id (full_name, avatar_url),
          approver:approved_by (full_name)
        `)
        .in("user_id", memberIds)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: memberIds.length > 0,
  });

  // Fetch letters created per user (scoped to company members)
  const { data: letters } = useQuery({
    queryKey: ["hr-letters", startDate, endDate, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("letters")
        .select("id, created_by")
        .in("created_by", memberIds)
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`);
      if (error) throw error;
      return data || [];
    },
    enabled: memberIds.length > 0,
  });

  // Fetch KOL database entries (scoped to company members)
  const { data: kolEntries } = useQuery({
    queryKey: ["hr-kol-entries", startDate, endDate, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("kol_database")
        .select("id, created_by")
        .in("created_by", memberIds)
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`);
      if (error) throw error;
      return data || [];
    },
    enabled: memberIds.length > 0,
  });

  // Fetch prospects count (scoped to company members)
  const { data: prospects } = useQuery({
    queryKey: ["hr-prospects", startDate, endDate, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("prospects")
        .select("id, status, created_by")
        .in("created_by", memberIds)
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`);
      if (error) throw error;
      return data || [];
    },
    enabled: memberIds.length > 0,
  });
  // Fetch tasks for selected user detail view
  const { data: userTasks } = useQuery({
    queryKey: ["hr-user-tasks", selectedUser?.id, startDate, endDate],
    queryFn: async () => {
      if (!selectedUser?.id) return { assignedToUser: [], createdByUser: [] };

      const [assignedRes, createdRes] = await Promise.all([
        supabase
          .from("tasks")
          .select(`*, projects(title, clients(name)), created_by_profile:profiles!fk_tasks_created_by_profiles(full_name)`)
          .eq("assigned_to", selectedUser.id)
          .gte("created_at", `${startDate}T00:00:00`)
          .lte("created_at", `${endDate}T23:59:59`)
          .order("created_at", { ascending: false }),
        supabase
          .from("tasks")
          .select(`*, projects(title, clients(name)), assigned_profile:profiles!fk_tasks_assigned_to_profiles(full_name)`)
          .eq("created_by", selectedUser.id)
          .gte("created_at", `${startDate}T00:00:00`)
          .lte("created_at", `${endDate}T23:59:59`)
          .order("created_at", { ascending: false }),
      ]);

      return {
        assignedToUser: assignedRes.data || [],
        createdByUser: createdRes.data || [],
      };
    },
    enabled: !!selectedUser?.id,
  });

  // Calculate per-user task statistics with activity scores
  const userActivityStats = profiles?.map(profile => {
    const tasksCreated = tasks?.filter(t => t.created_by === profile.id) || [];
    const tasksAssigned = tasks?.filter(t => t.assigned_to === profile.id) || [];
    const userLetters = letters?.filter(l => l.created_by === profile.id) || [];
    const userProspects = prospects?.filter(p => p.created_by === profile.id) || [];
    const userKol = kolEntries?.filter(k => k.created_by === profile.id) || [];
    
    // Activity score calculation (all ×1)
    const activityScore = 
      tasksCreated.length * 1 + 
      tasksAssigned.filter(t => t.status === 'done' || t.status === 'completed').length * 1 +
      userLetters.length * 1 +
      userProspects.length * 1 +
      userKol.length * 1;
    
    return {
      ...profile,
      tasksCreatedCount: tasksCreated.length,
      tasksAssignedCount: tasksAssigned.length,
      completedCount: tasksAssigned.filter(t => t.status === 'done' || t.status === 'completed').length,
      inProgressCount: tasksAssigned.filter(t => t.status === 'in_progress').length,
      lettersCount: userLetters.length,
      prospectsCount: userProspects.length,
      kolCount: userKol.length,
      activityScore,
    };
  })?.sort((a, b) => b.activityScore - a.activityScore) || [];

  // Legacy stats for backwards compatibility
  const userTaskStats = userActivityStats;

  // Calculate statistics
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecords = attendance?.filter(a => a.date === todayStr) || [];
  const todayOnTime = todayRecords.filter(a => getAttendanceStatus(a.clock_in, a.date) === 'on_time').length;
  const todayLate = todayRecords.filter(a => getAttendanceStatus(a.clock_in, a.date) === 'late').length;
  const lateRate = todayRecords.length > 0 ? Math.round((todayLate / todayRecords.length) * 100) : 0;

  const stats = {
    totalUsers: profiles?.length || 0,
    todayAttendance: todayRecords.length,
    todayOnTime,
    todayLate,
    lateRate,
    activeTasks: tasks?.filter(t => t.status !== 'done' && t.status !== 'completed').length || 0,
    completedTasks: tasks?.filter(t => t.status === 'done' || t.status === 'completed').length || 0,
    totalProspects: prospects?.length || 0,
    activeProspects: prospects?.filter(p => p.status !== 'closed_won' && p.status !== 'closed_lost').length || 0,
    totalLetters: letters?.length || 0,
    totalKol: kolEntries?.length || 0,
  };

  // Late frequency per employee (for analytics)
  const lateCountByEmployee = new Map<string, number>();
  attendance?.forEach(a => {
    if (getAttendanceStatus(a.clock_in, a.date) === 'late') {
      const name = a.profiles?.full_name || 'Unknown';
      lateCountByEmployee.set(name, (lateCountByEmployee.get(name) || 0) + 1);
    }
  });
  const mostLateEmployees = Array.from(lateCountByEmployee.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const calculateWorkHours = (clockIn: string | null, clockOut: string | null) => {
    if (!clockIn) return "Not clocked in";
    if (!clockOut) return "Still working";
    
    const hours = differenceInHours(parseISO(clockOut), parseISO(clockIn));
    return `${hours}h`;
  };

  const openUserDetail = (user: any) => {
    setSelectedUser(user);
    setDetailDialogOpen(true);
  };

  const handleLeaveApprovalClick = (request: any) => {
    setSelectedLeaveRequest(request);
    setApprovalDialogOpen(true);
  };

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case "sakit":
        return <Badge className="bg-red-500">Sakit</Badge>;
      case "cuti":
        return <Badge className="bg-blue-500">Cuti</Badge>;
      case "izin":
        return <Badge className="bg-yellow-500">Izin</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  // Export attendance data
  const attendanceExportData = attendance?.map(a => ({
    employee_name: a.profiles?.full_name || '',
    date: a.date,
    clock_in: a.clock_in ? format(parseISO(a.clock_in), 'HH:mm') : '',
    clock_out: a.clock_out ? format(parseISO(a.clock_out), 'HH:mm') : '',
    notes: a.notes || '',
  })) || [];

  const handleImportAttendance = async (data: any[]) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("Tidak terautentikasi");
      return;
    }

    for (const row of data) {
      if (!row.employee_name || !row.date) continue;
      
      // Find profile by name
      const profile = profiles?.find(p => 
        p.full_name.toLowerCase() === row.employee_name.toLowerCase()
      );
      
      if (profile) {
        // Check if attendance exists
        const { data: existing } = await supabase
          .from("attendance")
          .select("id")
          .eq("user_id", profile.id)
          .eq("date", row.date)
          .single();

        const attendanceData = {
          user_id: profile.id,
          date: row.date,
          clock_in: row.clock_in ? `${row.date}T${row.clock_in}:00` : null,
          clock_out: row.clock_out ? `${row.date}T${row.clock_out}:00` : null,
          notes: row.notes || null,
        };

        if (existing) {
          await supabase
            .from("attendance")
            .update(attendanceData)
            .eq("id", existing.id);
        } else {
          await supabase
            .from("attendance")
            .insert(attendanceData);
        }
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ["hr-attendance"] });
  };

  const handleAutoClockout = async () => {
    setAutoClockoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-clockout-midnight");
      
      if (error) throw error;
      
      if (data?.success) {
        const count = data.results?.length || 0;
        if (count > 0) {
          toast.success(`Berhasil auto clock-out ${count} attendance yang lupa clock-out!`);
          queryClient.invalidateQueries({ queryKey: ["hr-attendance"] });
        } else {
          toast.info("Tidak ada attendance yang perlu di-auto clock-out");
        }
      } else {
        throw new Error(data?.error || "Auto clock-out gagal");
      }
    } catch (error: any) {
      console.error("Auto clock-out error:", error);
      toast.error(error.message || "Gagal melakukan auto clock-out");
    } finally {
      setAutoClockoutLoading(false);
    }
  };

  // Fetch disciplinary cases for export
  const { data: disciplinaryCases } = useQuery({
    queryKey: ["hr-disciplinary-export", memberIds, startDate, endDate],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("disciplinary_cases")
        .select("*, employee:profiles!disciplinary_cases_employee_id_fkey(full_name), reporter:profiles!disciplinary_cases_reported_by_fkey(full_name)")
        .in("employee_id", memberIds)
        .gte("case_date", startDate)
        .lte("case_date", endDate)
        .order("case_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: memberIds.length > 0,
  });

  const handleExportExcel = () => {
    const periodLabel = `${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}`;
    
    const sheets = [
      {
        name: "Activity Score",
        data: userActivityStats.map((u, i) => ({
          rank: i + 1,
          employee: u.full_name,
          letters: u.lettersCount,
          prospects: u.prospectsCount,
          kol: u.kolCount,
          tasks_created: u.tasksCreatedCount,
          tasks_completed: u.completedCount,
          total_score: u.activityScore,
        })),
        columns: [
          { key: "rank", header: "#" },
          { key: "employee", header: "Employee" },
          { key: "letters", header: "Letters" },
          { key: "prospects", header: "Prospects" },
          { key: "kol", header: "KOL" },
          { key: "tasks_created", header: "Tasks Created" },
          { key: "tasks_completed", header: "Tasks Completed" },
          { key: "total_score", header: "Total Score" },
        ],
      },
      {
        name: "Leave Approval",
        data: (allLeaveRequests || []).map((r: any) => ({
          employee: r.profiles?.full_name || "",
          type: r.leave_type,
          start: r.start_date,
          end: r.end_date,
          reason: r.reason || "",
          status: r.status,
          approver: r.approver?.full_name || "",
        })),
        columns: [
          { key: "employee", header: "Employee" },
          { key: "type", header: "Type" },
          { key: "start", header: "Start Date" },
          { key: "end", header: "End Date" },
          { key: "reason", header: "Reason" },
          { key: "status", header: "Status" },
          { key: "approver", header: "Approved By" },
        ],
      },
      {
        name: "Task Overview",
        data: userActivityStats.map(u => ({
          employee: u.full_name,
          tasks_created: u.tasksCreatedCount,
          tasks_assigned: u.tasksAssignedCount,
          in_progress: u.inProgressCount,
          completed: u.completedCount,
        })),
        columns: [
          { key: "employee", header: "Employee" },
          { key: "tasks_created", header: "Tasks Created" },
          { key: "tasks_assigned", header: "Tasks Assigned" },
          { key: "in_progress", header: "In Progress" },
          { key: "completed", header: "Completed" },
        ],
      },
      {
        name: "Shooting",
        data: (shootings || []).map((s: any) => ({
          title: s.title,
          client: s.clients?.name || "",
          project: s.projects?.title || "",
          date: s.scheduled_date,
          time: s.scheduled_time || "",
          requested_by: s.requested_by_profile?.full_name || "",
          status: s.status,
        })),
        columns: [
          { key: "title", header: "Title" },
          { key: "client", header: "Client" },
          { key: "project", header: "Project" },
          { key: "date", header: "Date" },
          { key: "time", header: "Time" },
          { key: "requested_by", header: "Requested By" },
          { key: "status", header: "Status" },
        ],
      },
      {
        name: "Attendance",
        data: (attendance || []).map((a: any) => ({
          employee: a.profiles?.full_name || "",
          date: a.date,
          clock_in: a.clock_in ? format(parseISO(a.clock_in), "HH:mm") : "",
          status: getAttendanceStatus(a.clock_in, a.date) === "late" ? "Late" : getAttendanceStatus(a.clock_in, a.date) === "on_time" ? "On Time" : "",
          clock_out: a.clock_out ? format(parseISO(a.clock_out), "HH:mm") : "",
          work_hours: calculateWorkHours(a.clock_in, a.clock_out),
          notes: a.notes || "",
        })),
        columns: [
          { key: "employee", header: "Employee" },
          { key: "date", header: "Date" },
          { key: "clock_in", header: "Clock In" },
          { key: "status", header: "Status" },
          { key: "clock_out", header: "Clock Out" },
          { key: "work_hours", header: "Work Hours" },
          { key: "notes", header: "Notes" },
        ],
      },
      {
        name: "All Tasks",
        data: (tasks || []).map((t: any) => ({
          title: t.title,
          created_by: t.created_by_profile?.full_name || "",
          assigned_to: t.assigned_profile?.full_name || "Unassigned",
          project: t.projects?.title || "",
          client: t.projects?.clients?.name || "",
          status: t.status,
          priority: t.priority,
          deadline: t.deadline || "",
        })),
        columns: [
          { key: "title", header: "Task" },
          { key: "created_by", header: "Created By" },
          { key: "assigned_to", header: "Assigned To" },
          { key: "client", header: "Client" },
          { key: "project", header: "Project" },
          { key: "status", header: "Status" },
          { key: "priority", header: "Priority" },
          { key: "deadline", header: "Deadline" },
        ],
      },
      {
        name: "Disciplinary",
        data: (disciplinaryCases || []).map((dc: any) => ({
          employee: dc.employee?.full_name || "",
          date: dc.case_date,
          violation: dc.violation_type,
          description: dc.description,
          severity: dc.severity,
          status: dc.status,
          action: dc.action_taken || "",
          reporter: dc.reporter?.full_name || "",
        })),
        columns: [
          { key: "employee", header: "Employee" },
          { key: "date", header: "Date" },
          { key: "violation", header: "Violation Type" },
          { key: "description", header: "Description" },
          { key: "severity", header: "Severity" },
          { key: "status", header: "Status" },
          { key: "action", header: "Action Taken" },
          { key: "reporter", header: "Reported By" },
        ],
      },
    ];

    exportMultiSheetExcel(sheets, `HR_Dashboard_${periodLabel}`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <MobileDesktopBanner />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">HR Dashboard</h1>
            <p className="text-muted-foreground">Monitor employee attendance and productivity</p>
          </div>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filter Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                  }}
                >
                  This Month
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate(format(new Date(), 'yyyy-MM-dd'));
                    setEndDate(format(new Date(), 'yyyy-MM-dd'));
                  }}
                >
                  Today
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayAttendance}</div>
            </CardContent>
          </Card>

          <Card className="border-green-500/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-600">On Time</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.todayOnTime}</div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Late</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.todayLate}</div>
              {stats.todayAttendance > 0 && (
                <p className="text-xs text-muted-foreground">Rate: {stats.lateRate}%</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeTasks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedTasks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Prospects</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProspects}</div>
              <p className="text-xs text-muted-foreground">{stats.activeProspects} active</p>
            </CardContent>
          </Card>
        </div>

        {/* Birthday Reminders */}
        {(() => {
          const today = new Date();
          const upcomingBirthdays = profiles
            ?.filter(p => p.birth_date)
            ?.map(p => {
              const bd = new Date(p.birth_date + 'T00:00:00');
              const thisYear = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
              if (thisYear < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
                thisYear.setFullYear(today.getFullYear() + 1);
              }
              const diffDays = Math.ceil((thisYear.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / (1000 * 60 * 60 * 24));
              return { ...p, nextBirthday: thisYear, daysUntil: diffDays };
            })
            ?.sort((a, b) => a.daysUntil - b.daysUntil)
            ?.slice(0, 5) || [];

          return upcomingBirthdays.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cake className="h-5 w-5" />
                  Ulang Tahun Mendatang
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingBirthdays.map(p => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Cake className={`h-4 w-4 ${p.daysUntil === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`font-medium ${p.daysUntil === 0 ? 'text-primary' : ''}`}>{p.full_name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {p.daysUntil === 0 ? (
                          <Badge className="bg-primary">🎂 Hari Ini!</Badge>
                        ) : (
                          <span>{format(p.nextBirthday, 'dd MMM')} ({p.daysUntil} hari lagi)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null;
        })()}

        {/* Deletion Notifications */}
        <DeletionNotifications />

        <Tabs defaultValue="activity-score" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="activity-score">
              <Star className="h-4 w-4 mr-2" />
              Activity Score
            </TabsTrigger>
            <TabsTrigger value="leave-approval" className="relative">
              <CalendarOff className="h-4 w-4 mr-2" />
              Leave Approval
              {pendingLeaveRequests && pendingLeaveRequests.length > 0 && (
                <span className="ml-2 bg-destructive text-destructive-foreground text-xs rounded-full px-2">
                  {pendingLeaveRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="overview">Task Overview</TabsTrigger>
            <TabsTrigger value="shootings">Shooting</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="all-tasks">All Tasks</TabsTrigger>
            <TabsTrigger value="disciplinary">
              <FileWarning className="h-4 w-4 mr-2" />
              Disciplinary
            </TabsTrigger>
          </TabsList>

          {/* Activity Score Tab */}
          <TabsContent value="activity-score">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Activity Score per Employee ({format(new Date(startDate), 'dd MMM yyyy')} - {format(new Date(endDate), 'dd MMM yyyy')})
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Skor: Task Created (×1) + Task Completed (×1) + Letters (×1) + KOL Database (×1) + Prospects (×1)
                </p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <FileText className="h-3 w-3" />
                            Letters
                          </div>
                        </TableHead>
                        <TableHead className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3" />
                            Prospects
                          </div>
                        </TableHead>
                        <TableHead className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Database className="h-3 w-3" />
                            KOL
                          </div>
                        </TableHead>
                        <TableHead className="text-center">Tasks Created</TableHead>
                        <TableHead className="text-center">Tasks Completed</TableHead>
                        <TableHead className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            Total Score
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userActivityStats.map((user, index) => (
                        <TableRow key={user.id} className={index < 3 ? "bg-yellow-500/5" : ""}>
                          <TableCell className="font-medium">
                            {index < 3 ? (
                              <Badge className={
                                index === 0 ? "bg-yellow-500" : 
                                index === 1 ? "bg-gray-400" : "bg-amber-700"
                              }>
                                {index + 1}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">{index + 1}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-blue-500/10">
                              <FileText className="h-3 w-3 mr-1" />
                              {user.lettersCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-500/10">
                              <Users className="h-3 w-3 mr-1" />
                              {user.prospectsCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-purple-500/10">
                              <Database className="h-3 w-3 mr-1" />
                              {user.kolCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-primary/10">
                              {user.tasksCreatedCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-500">{user.completedCount}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${
                              index === 0 ? "bg-yellow-500" : 
                              index === 1 ? "bg-gray-400" : 
                              index === 2 ? "bg-amber-700" : 
                              "bg-primary"
                            }`}>
                              <Star className="h-3 w-3 mr-1" />
                              {user.activityScore}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Approval Tab */}
          <TabsContent value="leave-approval" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarOff className="h-5 w-5" />
                  Pending Leave Requests ({pendingLeaveRequests?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingLeaveRequests && pendingLeaveRequests.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {pendingLeaveRequests.map((request: any) => (
                      <Card key={request.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <p className="font-medium">{request.profiles?.full_name}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {getLeaveTypeBadge(request.leave_type)}
                                {getLeaveStatusBadge(request.status)}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {format(new Date(request.start_date), "dd MMM yyyy", { locale: idLocale })}
                                  {request.start_date !== request.end_date && (
                                    <> - {format(new Date(request.end_date), "dd MMM yyyy", { locale: idLocale })}</>
                                  )}
                                </span>
                              </div>
                              {request.reason && (
                                <p className="text-sm text-muted-foreground">{request.reason}</p>
                              )}
                            </div>
                            <Button size="sm" onClick={() => handleLeaveApprovalClick(request)}>
                              Review
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <p className="text-muted-foreground">No pending leave requests</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leave History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Processed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allLeaveRequests?.map((request: any) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.profiles?.full_name}</TableCell>
                          <TableCell>{getLeaveTypeBadge(request.leave_type)}</TableCell>
                          <TableCell>
                            {format(new Date(request.start_date), "dd MMM yyyy", { locale: idLocale })}
                            {request.start_date !== request.end_date && (
                              <> - {format(new Date(request.end_date), "dd MMM yyyy", { locale: idLocale })}</>
                            )}
                          </TableCell>
                          <TableCell>{getLeaveStatusBadge(request.status)}</TableCell>
                          <TableCell>{request.approver?.full_name || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Task Overview per Person */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Task Statistics per Employee ({format(new Date(startDate), 'dd MMM yyyy')} - {format(new Date(endDate), 'dd MMM yyyy')})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-center">Tasks Created</TableHead>
                        <TableHead className="text-center">Tasks Assigned</TableHead>
                        <TableHead className="text-center">In Progress</TableHead>
                        <TableHead className="text-center">Completed</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userTaskStats.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-primary/10">
                              <ArrowUpFromLine className="h-3 w-3 mr-1" />
                              {user.tasksCreatedCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-secondary/50">
                              <ArrowDownToLine className="h-3 w-3 mr-1" />
                              {user.tasksAssignedCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-blue-500">{user.inProgressCount}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-500">{user.completedCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openUserDetail(user)}
                            >
                              Detail
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shooting Schedules Tab */}
          <TabsContent value="shootings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Shooting Schedules ({shootings?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Client / Project</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Task Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shootings?.map((shooting) => (
                        <TableRow key={shooting.id}>
                          <TableCell className="font-medium">{shooting.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-primary">{shooting.clients?.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{shooting.projects?.title}</span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(shooting.scheduled_date), 'dd MMM yyyy')}
                            <br />
                            <span className="text-xs text-muted-foreground">{shooting.scheduled_time}</span>
                          </TableCell>
                          <TableCell>{shooting.requested_by_profile?.full_name}</TableCell>
                          <TableCell>
                            <Badge className={
                              shooting.status === 'approved' ? 'bg-green-500' :
                              shooting.status === 'rejected' ? 'bg-red-500' :
                              shooting.status === 'cancelled' ? 'bg-gray-500' :
                              'bg-yellow-500'
                            }>
                              {shooting.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {shooting.tasks ? (
                              <Badge className={getStatusColor(shooting.tasks.status)}>
                                {statusLabels[shooting.tasks.status] || shooting.tasks.status}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <div className="space-y-4">
              {/* Late Threshold Settings */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-sm">Late Threshold</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Clock-in setelah <span className="font-semibold text-destructive">{lateThreshold}</span> dianggap terlambat
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {showThresholdSettings ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={thresholdInput}
                          onChange={(e) => setThresholdInput(e.target.value)}
                          className="w-32 h-8"
                        />
                        <Button size="sm" onClick={handleSaveThreshold} disabled={savingThreshold}>
                          {savingThreshold ? "..." : "Save"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowThresholdSettings(false)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setThresholdInput(lateThreshold);
                          setShowThresholdSettings(true);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Set Threshold
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>

              {/* Late Analytics Summary */}
              {mostLateEmployees.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Most Late Employees (Recent)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {mostLateEmployees.map(([name, count]) => (
                        <div key={name} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{name}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min((count / 10) * 100, 100)} className="w-24 h-2" />
                            <Badge variant="destructive" className="text-xs">{count}×</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Attendance Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Attendance</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAutoClockout}
                    disabled={autoClockoutLoading}
                    className="gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    {autoClockoutLoading ? "Processing..." : "Auto Clock-Out yang Lupa"}
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead>Work Hours</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendance?.map((record) => {
                          const status = getAttendanceStatus(record.clock_in, record.date);
                          return (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">
                                {record.profiles?.full_name}
                              </TableCell>
                              <TableCell>{format(new Date(record.date), 'PPP')}</TableCell>
                              <TableCell>
                                {record.clock_in ? format(new Date(record.clock_in), 'HH:mm') : '-'}
                              </TableCell>
                              <TableCell>
                                {status === 'on_time' ? (
                                  <Badge className="bg-green-500 text-white">On Time</Badge>
                                ) : status === 'late' ? (
                                  <Badge variant="destructive">Late</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {record.clock_out ? format(new Date(record.clock_out), 'HH:mm') : '-'}
                                  {record.notes?.includes('[AUTO CLOCK-OUT') && (
                                    <Badge variant="destructive" className="text-xs">Lupa!</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {calculateWorkHours(record.clock_in, record.clock_out)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                {record.notes?.replace('[AUTO CLOCK-OUT - LUPA CLOCK OUT]', '').trim() || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Tasks Tab */}
          <TabsContent value="all-tasks">
            <Card>
              <CardHeader>
                <CardTitle>All Tasks in Period</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Deadline</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks?.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>{task.created_by_profile?.full_name || '-'}</TableCell>
                          <TableCell>{task.assigned_profile?.full_name || 'Unassigned'}</TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">{task.projects?.clients?.name}</span>
                            <br />
                            {task.projects?.title}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(task.status)}>
                              {statusLabels[task.status] || task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              task.priority === 'high' ? 'destructive' :
                              task.priority === 'medium' ? 'default' : 'outline'
                            }>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {task.requested_at ? format(new Date(task.requested_at), 'dd MMM yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {task.deadline ? format(new Date(task.deadline), 'dd MMM yyyy') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disciplinary Cases Tab */}
          <TabsContent value="disciplinary">
            <DisciplinaryCases />
          </TabsContent>
        </Tabs>

        {/* User Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Task Detail: {selectedUser?.full_name}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({format(new Date(startDate), 'dd MMM yyyy')} - {format(new Date(endDate), 'dd MMM yyyy')})
                </span>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="assigned-to" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="assigned-to">
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Tasks Assigned to {selectedUser?.full_name} ({userTasks?.assignedToUser.length || 0})
                </TabsTrigger>
                <TabsTrigger value="created-by">
                  <ArrowUpFromLine className="h-4 w-4 mr-2" />
                  Tasks Created by {selectedUser?.full_name} ({userTasks?.createdByUser.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assigned-to" className="mt-4">
                <ScrollArea className="h-[400px]">
                  {userTasks?.assignedToUser.length ? (
                    <div className="space-y-3">
                      {userTasks.assignedToUser.map((task: any) => (
                        <div key={task.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {task.projects?.clients?.name} - {task.projects?.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                From: {task.created_by_profile?.full_name || "Unknown"}
                              </p>
                            </div>
                            <Badge className={getStatusColor(task.status)}>
                              {statusLabels[task.status] || task.status}
                            </Badge>
                          </div>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Requested: {task.requested_at ? format(new Date(task.requested_at), 'dd MMM yyyy') : '-'}</span>
                            <span>Deadline: {task.deadline ? format(new Date(task.deadline), 'dd MMM yyyy') : '-'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No tasks assigned to this user in this period</p>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="created-by" className="mt-4">
                <ScrollArea className="h-[400px]">
                  {userTasks?.createdByUser.length ? (
                    <div className="space-y-3">
                      {userTasks.createdByUser.map((task: any) => (
                        <div key={task.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {task.projects?.clients?.name} - {task.projects?.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Assigned to: {task.assigned_profile?.full_name || "Unassigned"}
                              </p>
                            </div>
                            <Badge className={getStatusColor(task.status)}>
                              {statusLabels[task.status] || task.status}
                            </Badge>
                          </div>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Requested: {task.requested_at ? format(new Date(task.requested_at), 'dd MMM yyyy') : '-'}</span>
                            <span>Deadline: {task.deadline ? format(new Date(task.deadline), 'dd MMM yyyy') : '-'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No tasks created by this user in this period</p>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {selectedLeaveRequest && (
          <LeaveApprovalDialog
            open={approvalDialogOpen}
            onOpenChange={setApprovalDialogOpen}
            request={selectedLeaveRequest}
          />
        )}
      </div>
    </AppLayout>
  );
}
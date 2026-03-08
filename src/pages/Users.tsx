import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompanyNavigate } from "@/hooks/useCompanyNavigate";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, User, Edit, Clock, CheckCircle, XCircle, Trash2, Cake, AlertTriangle, Users as UsersIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";
import { AddUserRoleDialog } from "@/components/users/AddUserRoleDialog";
import { EmployeeDetailDialog } from "@/components/users/EmployeeDetailDialog";
import { DeleteUserDialog } from "@/components/users/DeleteUserDialog";

import { format } from "date-fns";
import { toast } from "sonner";
import { usePositions, getPositionColor, getRoleLabel } from "@/hooks/usePositions";
import { getRoleBadgeColor } from "@/lib/role-utils";

export default function Users() {
  const { data: positions } = usePositions();
  const queryClient = useQueryClient();
  const navigate = useCompanyNavigate();
  const { activeWorkspace } = useWorkspace();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: users, isLoading } = useQuery({
    queryKey: ["all-users", activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];

      // Get company members first to scope by workspace
      const { data: members, error: membersError } = await supabase
        .from("company_members")
        .select("user_id")
        .eq("company_id", activeWorkspace.id);
      
      if (membersError) throw membersError;
      const memberUserIds = members?.map(m => m.user_id) || [];
      if (memberUserIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", memberUserIds)
        .order("created_at", { ascending: false });
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", memberUserIds);
      
      if (rolesError) throw rolesError;

      return profiles?.map(profile => ({
        ...profile,
        user_roles: roles?.filter(r => r.user_id === profile.id) || []
      }));
    },
    enabled: !!activeWorkspace?.id,
  });

  // Fetch today's attendance for all users
  const { data: todayAttendance } = useQuery({
    queryKey: ["today-attendance", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("user_id, clock_in, clock_out")
        .eq("date", today);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch approved leaves for today
  const { data: todayLeaves } = useQuery({
    queryKey: ["today-leaves", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("user_id, leave_type")
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today);
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ["user-roles-current"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return [];

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.session.user.id);
      
      return data?.map(r => r.role) || [];
    },
  });

  const isSuperAdmin = userRoles?.includes("super_admin");
  const isHR = userRoles?.includes("hr");
  const canManageUsers = isSuperAdmin || isHR;

  // Redirect non-HR/super_admin users
  useEffect(() => {
    if (userRoles && userRoles.length > 0 && !canManageUsers) {
      navigate("/");
    }
  }, [userRoles, canManageUsers, navigate]);

  const getRoleColor = (role: string) => {
    return getRoleBadgeColor(role);
  };

  const getAttendanceStatus = (userId: string) => {
    // Check for approved leave first
    const leave = todayLeaves?.find(l => l.user_id === userId);
    if (leave) {
      const leaveLabel = leave.leave_type === 'sakit' ? 'Sakit' : 
                        leave.leave_type === 'cuti' ? 'Cuti' : 'Izin';
      return { status: "on_leave", label: leaveLabel, icon: XCircle, color: "text-blue-500" };
    }

    const attendance = todayAttendance?.find(a => a.user_id === userId);
    if (!attendance) {
      return { status: "not_clocked", label: "Belum Absen", icon: XCircle, color: "text-muted-foreground" };
    }
    if (attendance.clock_in && attendance.clock_out) {
      return { status: "complete", label: "Sudah Pulang", icon: CheckCircle, color: "text-green-500" };
    }
    if (attendance.clock_in) {
      return { status: "clocked_in", label: "Hadir", icon: Clock, color: "text-blue-500" };
    }
    return { status: "not_clocked", label: "Belum Absen", icon: XCircle, color: "text-muted-foreground" };
  };

  const handleCardClick = (user: any) => {
    if (canManageUsers) {
      setSelectedUser(user);
      setDetailDialogOpen(true);
    }
  };

  const handleEditRole = (e: React.MouseEvent, user: any) => {
    e.stopPropagation();
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleDeleteUser = (e: React.MouseEvent, user: any) => {
    e.stopPropagation();
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleImportUsers = async (data: any[]) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("Tidak terautentikasi");
      return;
    }

    // Import is limited - users need to be created via edge function
    // This updates existing profiles only
    for (const row of data) {
      if (!row.email) continue;
      
      // Find profile by email
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", row.email)
        .single();

      if (existingProfile) {
        await supabase
          .from("profiles")
          .update({
            full_name: row.full_name || undefined,
            phone: row.phone || undefined,
            address: row.address || undefined,
            ktp_number: row.ktp_number || undefined,
            bank_account_name: row.bank_account_name || undefined,
            bank_account_number: row.bank_account_number || undefined,
            gaji_pokok: row.gaji_pokok ? Number(row.gaji_pokok) : undefined,
            tj_transport: row.tj_transport ? Number(row.tj_transport) : undefined,
            tj_internet: row.tj_internet ? Number(row.tj_internet) : undefined,
            tj_kpi: row.tj_kpi ? Number(row.tj_kpi) : undefined,
            contract_start: row.contract_start || undefined,
            contract_end: row.contract_end || undefined,
            emergency_contact: row.emergency_contact || undefined,
            status: row.status || undefined,
          })
          .eq("id", existingProfile.id);
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ["all-users"] });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Team Members</h1>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                disabled={activeWorkspace && (users?.length || 0) >= (activeWorkspace.max_users || 3)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            )}
          </div>
        </div>

        {/* Max Users Capacity Banner */}
        {activeWorkspace && (() => {
          const totalUsers = users?.length || 0;
          const maxUsers = activeWorkspace.max_users || 3;
          const usagePercent = Math.min((totalUsers / maxUsers) * 100, 100);
          const isNearLimit = totalUsers >= maxUsers - 1;
          const isAtLimit = totalUsers >= maxUsers;
          
          return (
            <Card className={`border ${isAtLimit ? 'border-destructive/50 bg-destructive/5' : isNearLimit ? 'border-warning/50 bg-warning/5' : 'border-border/50'}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {totalUsers} / {maxUsers} users
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {activeWorkspace.subscription_tier} Plan
                    </Badge>
                  </div>
                   {isAtLimit && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Batas user tercapai</span>
                    </div>
                  )}
                </div>
                <Progress value={usagePercent} className="h-2" />
                {isNearLimit && (
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <p className="text-xs text-muted-foreground flex-1">
                      {isAtLimit 
                        ? "Anda telah mencapai batas maksimal user. Upgrade plan untuk menambah kapasitas team."
                        : "Hampir mencapai batas user. Pertimbangkan upgrade plan untuk menambah kapasitas."}
                    </p>
                    <Button 
                      size="sm" 
                      className="gap-2 shrink-0"
                      onClick={() => navigate("/billing")}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Upgrade Plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-32 bg-muted" />
              </Card>
            ))}
          </div>
        ) : users && users.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => {
              const attendanceInfo = getAttendanceStatus(user.id);
              const AttendanceIcon = attendanceInfo.icon;

              return (
                <Card 
                  key={user.id} 
                  className={`hover:shadow-lg transition-all ${canManageUsers ? 'cursor-pointer hover:scale-[1.02]' : ''} ${user.status === 'non_active' ? 'opacity-60' : ''}`}
                  onClick={() => handleCardClick(user)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                          {user.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{user.full_name}</CardTitle>
                          {user.status === 'non_active' && (
                            <Badge variant="secondary" className="text-xs">Non-Active</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email || user.user_id}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Attendance Status */}
                    <div className={`flex items-center gap-2 ${attendanceInfo.color}`}>
                      <AttendanceIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{attendanceInfo.label}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {user.user_roles?.map((ur: any, index: number) => (
                          <Badge 
                            key={index} 
                            className={getRoleColor(ur.role)}
                          >
                            {getRoleLabel(positions, ur.role)}
                          </Badge>
                        ))}
                        {(!user.user_roles || user.user_roles.length === 0) && (
                          <Badge variant="secondary">No role assigned</Badge>
                        )}
                      </div>
                      {canManageUsers && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleEditRole(e, user)}
                            title="Manage Roles"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteUser(e, user)}
                            title="Delete User"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {user.birth_date && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Cake className="h-3.5 w-3.5" />
                        <span>{format(new Date(user.birth_date + 'T00:00:00'), 'dd MMM yyyy')}</span>
                      </div>
                    )}
                    {user.phone && (
                      <p className="text-xs text-muted-foreground">{user.phone}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateUserDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      
      {selectedUser && (
        <>
          <AddUserRoleDialog
            open={roleDialogOpen}
            onOpenChange={setRoleDialogOpen}
            userId={selectedUser.id}
            userName={selectedUser.full_name}
            currentRoles={selectedUser.user_roles?.map((ur: any) => ur.role) || []}
          />
          <EmployeeDetailDialog
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
            employee={selectedUser}
            canEdit={canManageUsers}
          />
          <DeleteUserDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            userId={selectedUser.id}
            userName={selectedUser.full_name}
          />
        </>
      )}

    </AppLayout>
  );
}

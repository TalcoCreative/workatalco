import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";
import { ALL_ROLES, getRoleLabelFromList, getRoleBadgeColor } from "@/lib/role-utils";

interface AddUserRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRoles: string[];
}

/**
 * Auto-assign the matching dynamic_role to user_dynamic_roles
 * based on the role label matching dynamic_roles.name
 */
async function autoAssignDynamicRole(userId: string, roleValue: string) {
  const label = getRoleLabelFromList(roleValue);
  const { data: dynRole } = await supabase
    .from("dynamic_roles")
    .select("id")
    .eq("name", label)
    .maybeSingle();

  if (dynRole) {
    const { data: session } = await supabase.auth.getSession();
    await supabase.from("user_dynamic_roles").upsert(
      { user_id: userId, role_id: dynRole.id, assigned_by: session.session?.user.id },
      { onConflict: "user_id" }
    );
  }
}

export function AddUserRoleDialog({ open, onOpenChange, userId, userName, currentRoles }: AddUserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const availableRoles = ALL_ROLES.filter(role => !currentRoles.includes(role.value));

  // Group available roles by category
  const groupedRoles = availableRoles.reduce<Record<string, typeof ALL_ROLES>>((acc, role) => {
    if (!acc[role.category]) acc[role.category] = [];
    acc[role.category].push(role);
    return acc;
  }, {});

  const handleAddRole = async () => {
    if (!selectedRole) { toast.error("Pilih role terlebih dahulu"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("user_roles").insert([{ user_id: userId, role: selectedRole as any }]);
      if (error) throw error;

      // Auto-assign matching access control role
      await autoAssignDynamicRole(userId, selectedRole);

      toast.success("Role berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-dynamic-role"] });
      queryClient.invalidateQueries({ queryKey: ["user-dynamic-role-counts"] });
      setSelectedRole("");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (roleToRemove: string) => {
    if (currentRoles.length <= 1) { toast.error("User harus memiliki minimal satu role"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", roleToRemove as any);
      if (error) throw error;

      // If user still has roles, auto-assign the first remaining role's dynamic role
      const remaining = currentRoles.filter(r => r !== roleToRemove);
      if (remaining.length > 0) {
        await autoAssignDynamicRole(userId, remaining[0]);
      }

      toast.success("Role berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-dynamic-role"] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kelola Role — {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Roles */}
          <div className="space-y-2">
            <Label>Role Saat Ini</Label>
            <div className="flex flex-wrap gap-2">
              {currentRoles.map((role) => (
                <Badge key={role} className={`flex items-center gap-1 ${getRoleBadgeColor(role)}`}>
                  {getRoleLabelFromList(role)}
                  <button
                    onClick={() => handleRemoveRole(role)}
                    disabled={loading || currentRoles.length <= 1}
                    className="hover:bg-white/20 rounded-full p-0.5 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Akses fitur otomatis mengikuti role. Atur detail di System → Role & Access Control.
            </p>
          </div>

          {availableRoles.length > 0 && (
            <div className="space-y-2">
              <Label>Tambah Role</Label>
              <div className="flex gap-2">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedRoles).map(([category, roles]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{category}</div>
                        {roles.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddRole} disabled={loading || !selectedRole}>Tambah</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ALL_ROLES } from "@/lib/role-utils";
import { useWorkspace } from "@/hooks/useWorkspace";

export const DEPARTMENTS = [
  "Creative",
  "Social Media",
  "Marketing",
  "Production",
  "Operations",
  "IT",
  "Finance",
  "Human Resources",
  "Sales",
  "Client Services",
  "Executive",
  "Intern",
  "Legal",
  "Customer Service",
];

export interface Position {
  id: string;
  name: string;
  description: string | null;
  department: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  company_id?: string | null;
}

export function usePositions(activeOnly: boolean = true) {
  const { activeWorkspace } = useWorkspace();
  const companyId = activeWorkspace?.id;

  return useQuery({
    queryKey: ["positions", activeOnly, companyId],
    queryFn: async () => {
      let query = supabase
        .from("positions")
        .select("*")
        .order("department", { ascending: true })
        .order("name", { ascending: true });
      
      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      if (companyId) {
        query = query.eq("company_id", companyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Position[];
    },
  });
}

// Fetch positions by company_id directly (for public pages without auth)
export function usePositionsByCompanyId(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ["positions-by-company", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Position[];
    },
    enabled: !!companyId,
  });
}

export function usePositionOptions(activeOnly: boolean = true) {
  const { data: positions, isLoading } = usePositions(activeOnly);
  
  const positionOptions = positions?.map(p => ({
    value: p.name,
    label: p.name,
    department: p.department,
    color: p.color,
  })) || [];
  
  return { positions, positionOptions, isLoading };
}

// Hook untuk mendapatkan roles dari centralized list + positions for dropdown
export function useRoleOptions() {
  const { data: positions, isLoading } = usePositions(true);

  const roleOptions = ALL_ROLES.map((r) => ({
    value: r.value,
    label: r.label,
    department: r.category,
    color: null as string | null,
  }));

  return { 
    roleOptions, 
    positions,
    isLoading 
  };
}

// Hook untuk mendapatkan departments unik dari positions
export function useDepartments() {
  const { data: positions, isLoading } = usePositions(false);

  const departments = positions
    ? [...new Set(positions.map((p) => p.department).filter(Boolean))]
    : DEPARTMENTS;

  return { departments: departments as string[], isLoading };
}

// Helper function untuk mendapatkan warna berdasarkan role/position
export function getPositionColor(positions: Position[] | undefined, roleName: string): string {
  if (!positions) return "#6366f1";
  
  const position = positions.find(
    (p) => p.name.toLowerCase().replace(/\s+/g, "_") === roleName ||
           p.name.toLowerCase() === roleName.toLowerCase()
  );
  
  return position?.color || "#6366f1";
}

// Re-export from centralized role utils for backward compatibility
import { getRoleLabelFromList } from "@/lib/role-utils";

// Helper function untuk mendapatkan label dari role value
export function getRoleLabel(positions: Position[] | undefined, roleValue: string): string {
  // Check centralized list first
  const centralLabel = getRoleLabelFromList(roleValue);
  if (centralLabel !== roleValue.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())) {
    return centralLabel;
  }
  
  if (!positions) return centralLabel;
  
  // Cari di positions table
  const position = positions.find(
    (p) => p.name.toLowerCase().replace(/\s+/g, "_") === roleValue ||
           p.name.toLowerCase() === roleValue.toLowerCase()
  );
  
  return position?.name || centralLabel;
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

/**
 * Fetch clients scoped to the active workspace/company.
 */
export function useCompanyClients() {
  const { activeWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["company-clients", activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("company_id", activeWorkspace.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeWorkspace?.id,
  });
}

/**
 * Fetch projects scoped to the active workspace/company.
 */
export function useCompanyProjects() {
  const { activeWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["company-projects", activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, title")
        .eq("company_id", activeWorkspace.id)
        .order("title");
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeWorkspace?.id,
  });
}

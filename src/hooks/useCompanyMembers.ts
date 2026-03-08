import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

export function useCompanyMembers() {
  const { activeWorkspace } = useWorkspace();

  const { data: memberIds = [], isLoading } = useQuery({
    queryKey: ["company-member-ids", activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("company_members")
        .select("user_id")
        .eq("company_id", activeWorkspace.id);

      if (error) throw error;
      return data?.map(m => m.user_id) || [];
    },
    enabled: !!activeWorkspace?.id,
  });

  return { memberIds, isLoading, companyId: activeWorkspace?.id };
}

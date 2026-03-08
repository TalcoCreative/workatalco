import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";

export function useCompanyUsers() {
  const { memberIds, isLoading: membersLoading } = useCompanyMembers();

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["company-users", memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, status, avatar_url")
        .in("id", memberIds)
        .order("full_name");

      if (error) throw error;
      return data || [];
    },
    enabled: memberIds.length > 0,
  });

  const activeUsers = users.filter(u => u.status !== 'non_active');

  return { 
    users, 
    activeUsers,
    isLoading: membersLoading || usersLoading,
    memberIds,
  };
}

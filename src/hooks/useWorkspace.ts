import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  trial_start: string;
  trial_end: string;
  max_users: number;
  is_active: boolean;
  is_suspended: boolean;
  logo_url: string | null;
  owner_id: string | null;
  memberRole: string;
}

export function useWorkspace() {
  const { companySlug } = useParams<{ companySlug: string }>();

  const { data: workspaces = [], isLoading: workspacesLoading } = useQuery({
    queryKey: ["my-workspaces"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return [];

      const userId = session.session.user.id;

      // Check if platform admin
      const { data: pa } = await supabase
        .from("platform_admins")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (pa) {
        // Platform admin sees all companies
        const { data: allCompanies } = await supabase
          .from("companies")
          .select("id, name, slug, logo_url, subscription_tier, trial_start, trial_end, max_users, is_active, is_suspended, owner_id")
          .order("created_at", { ascending: false });
        return (allCompanies || []).map((c: any) => ({
          ...c,
          memberRole: "platform_admin",
        })) as Workspace[];
      }

      // Regular user
      const { data } = await supabase
        .from("company_members")
        .select("company_id, role, companies(id, name, slug, logo_url, subscription_tier, trial_start, trial_end, max_users, is_active, is_suspended, owner_id)")
        .eq("user_id", userId);
      return (data || []).map((m: any) => ({
        ...m.companies,
        memberRole: m.role,
      })) as Workspace[];
    },
  });

  const activeWorkspace = companySlug
    ? workspaces.find(w => w.slug === companySlug) || workspaces[0] || null
    : workspaces[0] || null;
  const hasMultiple = workspaces.length > 1;

  return {
    workspaces,
    activeWorkspace,
    hasMultiple,
    isLoading: workspacesLoading,
  };
}

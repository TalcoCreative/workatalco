import { useEffect } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function CompanyRoot() {
  const { companySlug } = useParams<{ companySlug: string }>();
  const navigate = useNavigate();

  const { data: membership, isLoading } = useQuery({
    queryKey: ["company-membership", companySlug],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return { found: false, noSession: true };

      const userId = session.session.user.id;

      // Check if platform admin first
      const { data: platformAdmin } = await supabase
        .from("platform_admins")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (platformAdmin) {
        // Platform admin can access any company
        const { data: company } = await supabase
          .from("companies")
          .select("id, name, slug, logo_url, subscription_tier, trial_start, trial_end, max_users, is_active, is_suspended, owner_id")
          .eq("slug", companySlug)
          .maybeSingle();

        if (company) {
          // Ensure membership exists for platform admin
          const { data: existingMember } = await supabase
            .from("company_members")
            .select("id")
            .eq("company_id", company.id)
            .eq("user_id", userId)
            .maybeSingle();

          return {
            found: true,
            workspace: { ...company, memberRole: existingMember ? "owner" : "platform_admin" },
          };
        }
        return { found: false, noSession: false };
      }

      // Regular user: check membership
      const { data } = await supabase
        .from("company_members")
        .select("company_id, role, companies(id, name, slug, logo_url, subscription_tier, trial_start, trial_end, max_users, is_active, is_suspended, owner_id)")
        .eq("user_id", userId);
      const match = (data || []).find((m: any) => m.companies?.slug === companySlug);
      if (!match) return { found: false, noSession: false };
      return { found: true, workspace: { ...match.companies, memberRole: match.role } };
    },
    enabled: !!companySlug,
  });

  // Set document title to company name
  useEffect(() => {
    if (membership?.found && membership.workspace) {
      document.title = `${membership.workspace.name} — WORKA`;
    }
    return () => {
      document.title = "WORKA — Modern Agency Management Platform";
    };
  }, [membership]);

  useEffect(() => {
    if (isLoading) return;
    if (!membership) return;
    
    if (membership.noSession) {
      navigate("/auth", { replace: true });
      return;
    }
    
    if (!membership.found) {
      navigate("/", { replace: true });
    }
  }, [isLoading, membership, companySlug, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!membership?.found) return null;

  // Block access for suspended/deactivated companies
  if (membership.workspace && (!membership.workspace.is_active || membership.workspace.is_suspended)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Workspace Dinonaktifkan</h1>
          <p className="text-muted-foreground">
            Workspace <strong>{membership.workspace.name}</strong> telah dinonaktifkan karena masa trial berakhir tanpa upgrade. Hubungi admin atau upgrade plan Anda untuk mengaktifkan kembali.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="/landing#pricing" className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Upgrade Sekarang
            </a>
            <button onClick={() => navigate("/")} className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

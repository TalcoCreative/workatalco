import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";

export default function WorkspaceRedirect() {
  const navigate = useNavigate();
  const { workspaces, isLoading } = useWorkspace();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate("/auth", { replace: true });
        return;
      }
      setChecking(false);
    };
    check();
  }, [navigate]);

  useEffect(() => {
    if (checking || isLoading) return;
    if (workspaces.length > 0) {
      navigate(`/${workspaces[0].slug}`, { replace: true });
    } else {
      navigate("/landing", { replace: true });
    }
  }, [workspaces, isLoading, checking, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

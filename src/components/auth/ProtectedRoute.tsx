import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { usePermissions, ROUTE_FEATURE_MAP } from "@/hooks/usePermissions";
import { useTierAccess } from "@/hooks/useTierAccess";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { canView, isSuperAdmin, isLoading: permLoading } = usePermissions();
  const { isTierFeature, isLoading: tierLoading } = useTierAccess();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Permission + tier based route protection
  useEffect(() => {
    if (loading || permLoading || tierLoading || !session) return;
    if (isSuperAdmin) return;

    const path = location.pathname;
    const segments = path.split("/").filter(Boolean);
    const strippedPath = segments.length > 1 ? "/" + segments.slice(1).join("/") : "/";

    let featureKey: string | null = null;

    if (ROUTE_FEATURE_MAP[strippedPath]) {
      featureKey = ROUTE_FEATURE_MAP[strippedPath];
    } else {
      const sortedRoutes = Object.keys(ROUTE_FEATURE_MAP).sort((a, b) => b.length - a.length);
      for (const route of sortedRoutes) {
        if (strippedPath.startsWith(route + "/") || strippedPath === route) {
          featureKey = ROUTE_FEATURE_MAP[route];
          break;
        }
      }
    }

    if (featureKey) {
      if (!canView(featureKey)) {
        toast.error("Anda tidak memiliki akses ke halaman ini.");
        const slug = segments[0];
        navigate(slug ? `/${slug}` : "/");
        return;
      }
      if (!isTierFeature(featureKey)) {
        toast.error("Fitur ini tidak tersedia di plan Anda. Upgrade untuk mengakses.");
        const slug = segments[0];
        navigate(slug ? `/${slug}` : "/");
        return;
      }
    }
  }, [location.pathname, loading, permLoading, tierLoading, session, isSuperAdmin, canView, isTierFeature, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { MobileBottomNav } from "./MobileBottomNav";
import { FloatingActionButton } from "./FloatingActionButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrialBanner } from "@/components/saas/TrialBanner";
import { NotesPanel } from "@/components/notes/NotesPanel";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { useState } from "react";
import { StickyNote, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { usePermissions, ROUTE_FEATURE_MAP } from "@/hooks/usePermissions";
import { useTierAccess } from "@/hooks/useTierAccess";
import { useCompanySlug } from "@/hooks/useCompanySlug";
import { useCompanyNavigate } from "@/hooks/useCompanyNavigate";

interface AppLayoutProps {
  children: React.ReactNode;
}

function RoutePermissionGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const slug = useCompanySlug();
  const { canView, isSuperAdmin, isLoading: permLoading } = usePermissions();
  const { isTierFeature, isLoading: tierLoading } = useTierAccess();
  const navigate = useCompanyNavigate();

  if (permLoading || tierLoading) return <>{children}</>;

  // Extract the route path relative to company slug
  const prefix = `/${slug}`;
  let relativePath = location.pathname;
  if (relativePath.startsWith(prefix)) {
    relativePath = relativePath.slice(prefix.length) || "/";
  }

  // Normalize: strip trailing slash, handle sub-routes
  if (relativePath !== "/" && relativePath.endsWith("/")) {
    relativePath = relativePath.slice(0, -1);
  }

  // Find the feature key for this route
  // Try exact match first, then prefix match for sub-routes like /clients/:id, /hr/employee/:id/insight
  let featureKey = ROUTE_FEATURE_MAP[relativePath];

  if (!featureKey) {
    // Try matching parent routes (e.g., /clients/abc -> /clients)
    const segments = relativePath.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 1; i--) {
      const parentPath = "/" + segments.slice(0, i).join("/");
      if (ROUTE_FEATURE_MAP[parentPath]) {
        featureKey = ROUTE_FEATURE_MAP[parentPath];
        break;
      }
    }
  }

  // Special routes that don't need permission checks
  const exemptRoutes = ["/profile", "/billing"];
  if (exemptRoutes.includes(relativePath)) return <>{children}</>;

  // If no feature mapping found, allow (it's likely a profile or system page)
  if (!featureKey) return <>{children}</>;

  // Check access
  const hasRoleAccess = isSuperAdmin || canView(featureKey);
  const hasTierAccess = isSuperAdmin || isTierFeature(featureKey);

  if (!hasRoleAccess || !hasTierAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Akses Ditolak</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          {!hasRoleAccess
            ? "Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi admin untuk mendapatkan akses."
            : "Fitur ini tidak tersedia pada paket langganan Anda saat ini. Upgrade untuk membuka akses."}
        </p>
        <Button onClick={() => navigate("/")} variant="outline" className="mt-2">
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen min-h-[100dvh] w-full overflow-x-hidden">
        {!isMobile && <AppSidebar />}
        <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
          <TrialBanner />
          <Header />
          <main className="flex-1 p-4 sm:p-5 md:p-8 overflow-x-hidden pb-bottom-nav section-atmospheric">
            <RoutePermissionGuard>
              {children}
            </RoutePermissionGuard>
          </main>
        </div>
      </div>
      {isMobile && <MobileBottomNav />}
      <FloatingActionButton />

      {/* Notes FAB */}
      <Button
        size="icon"
        className={`fixed bottom-20 right-4 z-40 h-11 w-11 rounded-full shadow-lg ${notesOpen ? "bg-primary/80" : "bg-primary"}`}
        onClick={() => setNotesOpen(!notesOpen)}
      >
        <StickyNote className="h-5 w-5" />
      </Button>

      <NotesPanel open={notesOpen} onClose={() => setNotesOpen(false)} />
    </SidebarProvider>
  );
}

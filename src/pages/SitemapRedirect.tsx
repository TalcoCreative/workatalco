import { useEffect } from "react";

export default function SitemapRedirect() {
  useEffect(() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const origin = window.location.origin;
    const url = `https://${projectId}.supabase.co/functions/v1/sitemap?origin=${encodeURIComponent(origin)}`;
    window.location.replace(url);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <p className="text-sm text-muted-foreground">Redirecting to sitemap.xml...</p>
    </div>
  );
}

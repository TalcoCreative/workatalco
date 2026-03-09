import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Globe, Search, FileText, Copy, ExternalLink, Save } from "lucide-react";

export function SeoSettingsTab() {
  const queryClient = useQueryClient();
  const [googleVerification, setGoogleVerification] = useState("");
  const [robotsTxt, setRobotsTxt] = useState("");

  const { data: seoSettings } = useQuery({
    queryKey: ["seo-settings"],
    queryFn: async () => {
      const keys = ["google_site_verification", "meta_robots_txt"];
      const { data } = await supabase
        .from("landing_content")
        .select("section, content")
        .in("section", keys);
      const map: Record<string, string> = {};
      (data || []).forEach((r) => {
        const val = r.content;
        map[r.section] = typeof val === "string" ? val : "";
      });
      return map;
    },
  });

  useEffect(() => {
    if (seoSettings) {
      setGoogleVerification(seoSettings.google_site_verification || "");
      setRobotsTxt(seoSettings.meta_robots_txt || "");
    }
  }, [seoSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = [
        { section: "google_site_verification", content: googleVerification.trim() },
        { section: "meta_robots_txt", content: robotsTxt.trim() },
      ];
      for (const entry of entries) {
        const { data: existing } = await supabase
          .from("landing_content")
          .select("id")
          .eq("section", entry.section)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("landing_content")
            .update({ content: entry.content as any })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("landing_content")
            .insert({ section: entry.section, content: entry.content as any });
        }
      }
    },
    onSuccess: () => {
      toast.success("SEO settings berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
    },
    onError: () => toast.error("Gagal menyimpan"),
  });

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const primaryDomain = "https://worka.talco.id";
  const sitemapEdgeFnUrl = `https://${projectId}.supabase.co/functions/v1/sitemap?origin=${encodeURIComponent(primaryDomain)}`;
  const sitemapPageUrl = `${primaryDomain}/sitemap.xml`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Disalin ke clipboard");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">SEO & Search Console</h1>
        <p className="text-sm text-muted-foreground">Kelola verifikasi Google Search Console dan sitemap</p>
      </div>

      {/* Google Search Console Verification */}
      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Google Search Console
          </CardTitle>
          <CardDescription className="text-xs">
            Masukkan kode verifikasi dari Google Search Console. Kode ini akan ditambahkan sebagai meta tag di halaman landing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Verification Code</Label>
            <Input
              value={googleVerification}
              onChange={(e) => setGoogleVerification(e.target.value)}
              placeholder="contoh: xxxxxxxxxxxxx"
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Dapatkan kode ini dari <span className="font-medium">Google Search Console → Settings → Ownership verification → HTML tag</span>. 
              Masukkan value content-nya saja (tanpa tag meta).
            </p>
          </div>

          <div className="rounded-xl bg-muted/50 border border-border/30 p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">Langkah Verifikasi:</p>
            <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Buka <a href="https://search.google.com/search-console" target="_blank" rel="noopener" className="text-primary underline">Google Search Console</a></li>
              <li>Tambahkan property dengan URL: <code className="bg-background px-1 rounded text-[10px]">{window.location.origin}</code></li>
              <li>Pilih metode verifikasi "HTML tag"</li>
              <li>Copy content value dari meta tag yang diberikan</li>
              <li>Paste di kolom di atas dan simpan</li>
              <li>Klik "Verify" di Google Search Console</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Sitemap */}
      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Sitemap XML
          </CardTitle>
          <CardDescription className="text-xs">
            Sitemap otomatis di-generate berdasarkan halaman publik dan blog posts yang dipublish.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Sitemap Page URL</Label>
            <div className="flex gap-2 mb-3">
              <Input value={sitemapPageUrl} readOnly className="font-mono text-xs bg-muted/50" />
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(sitemapPageUrl)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={sitemapPageUrl} target="_blank" rel="noopener">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
            <Label className="text-xs font-medium">Edge Function URL (alternative)</Label>
            <div className="flex gap-2">
              <Input value={sitemapEdgeFnUrl} readOnly className="font-mono text-xs bg-muted/50" />
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(sitemapEdgeFnUrl)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={sitemapEdgeFnUrl} target="_blank" rel="noopener">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Submit URL ini ke Google Search Console di bagian "Sitemaps".
            </p>
          </div>

          <div className="rounded-xl bg-muted/50 border border-border/30 p-3">
            <p className="text-xs font-medium text-foreground mb-2">Halaman yang termasuk di sitemap:</p>
            <div className="flex flex-wrap gap-1.5">
              {["/landing", "/blog", "/blog/*", "/pricing", "/subscribe", "/privacy-policy"].map((p) => (
                <Badge key={p} variant="secondary" className="text-[10px] font-mono">{p}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Robots.txt */}
      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Robots.txt (Custom)
          </CardTitle>
          <CardDescription className="text-xs">
            Override konten robots.txt jika diperlukan. Kosongkan untuk menggunakan default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={robotsTxt}
            onChange={(e) => setRobotsTxt(e.target.value)}
            placeholder={`User-agent: *\nAllow: /\n\nSitemap: ${sitemapEdgeFnUrl}`}
            className="font-mono text-xs min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Menyimpan..." : "Simpan Settings"}
        </Button>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { useCompanyNavigate } from "@/hooks/useCompanyNavigate";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ExternalLink, BarChart3, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

const CHANNEL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  threads: "Threads",
  other: "Other",
};

export default function PublishedContentReport() {
  const navigate = useCompanyNavigate();
  const { memberIds } = useCompanyMembers();
  const now = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [clientFilter, setClientFilter] = useState("all");

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["published-content-clients", memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .in("created_by", memberIds)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: memberIds.length > 0,
  });

  // Fetch published slides with EP and client info
  const { data: publishedSlides, isLoading } = useQuery({
    queryKey: ["published-slides-report", startDate, endDate, clientFilter, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      let query = supabase
        .from("editorial_slides")
        .select(`
          id, status, published_at, publish_links, channels, channel, format, slide_order,
          editorial_plans!inner(id, title, client_id, created_by, clients(id, name))
        `)
        .eq("status", "published")
        .in("editorial_plans.created_by", memberIds);

      if (startDate) query = query.gte("published_at", `${startDate}T00:00:00`);
      if (endDate) query = query.lte("published_at", `${endDate}T23:59:59`);

      const { data, error } = await query.order("published_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: memberIds.length > 0,
  });

  // Filter by client
  const filtered = useMemo(() => {
    if (!publishedSlides) return [];
    if (clientFilter === "all") return publishedSlides;
    return publishedSlides.filter((s: any) => s.editorial_plans?.client_id === clientFilter);
  }, [publishedSlides, clientFilter]);

  // Platform stats
  const platformStats = useMemo(() => {
    const stats: Record<string, { count: number; links: { url: string; title: string; date: string }[] }> = {};
    filtered.forEach((slide: any) => {
      const links = slide.publish_links || [];
      const channels = slide.channels || (slide.channel ? [slide.channel] : []);
      
      channels.forEach((ch: string) => {
        if (!stats[ch]) stats[ch] = { count: 0, links: [] };
        stats[ch].count++;
      });

      links.forEach((link: any) => {
        if (link.platform && link.url) {
          if (!stats[link.platform]) stats[link.platform] = { count: 0, links: [] };
          stats[link.platform].links.push({
            url: link.url,
            title: `${slide.editorial_plans?.clients?.name || ""} - S${slide.slide_order + 1}`,
            date: slide.published_at ? format(new Date(slide.published_at), "dd MMM yyyy") : "",
          });
        }
      });
    });
    return stats;
  }, [filtered]);

  const totalPublished = filtered.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Published Content</h1>
            <p className="text-muted-foreground text-sm">
              Total konten yang sudah dipublikasikan dari Editorial Plan
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Dari Tanggal</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sampai Tanggal</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Client</SelectItem>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{totalPublished}</p>
              <p className="text-sm text-muted-foreground">Total Published</p>
            </CardContent>
          </Card>
          {Object.entries(platformStats).slice(0, 3).map(([platform, data]) => (
            <Card key={platform}>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{data.count}</p>
                <p className="text-sm text-muted-foreground">{CHANNEL_LABELS[platform] || platform}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Per Platform Detail */}
        {Object.entries(platformStats).map(([platform, data]) => (
          <Card key={platform}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {CHANNEL_LABELS[platform] || platform}
                <Badge variant="secondary">{data.count} konten</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.links.length > 0 ? (
                <div className="space-y-2">
                  {data.links.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{link.title}</p>
                        <p className="text-xs text-muted-foreground">{link.date}</p>
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Lihat
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {data.count} konten dipublikasikan (link belum tersedia)
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {totalPublished === 0 && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Belum ada konten yang dipublikasikan</p>
              <p className="text-sm text-muted-foreground">Konten akan muncul setelah status slide diubah ke Published</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

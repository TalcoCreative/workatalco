import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyNavigate } from "@/hooks/useCompanyNavigate";
import { Badge } from "@/components/ui/badge";
import { Send, Instagram, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  in_review: { label: "In Review", className: "bg-amber-500/15 text-amber-600" },
  revision: { label: "Revision", className: "bg-destructive/15 text-destructive" },
  approved: { label: "Approved", className: "bg-emerald-500/15 text-emerald-600" },
  published: { label: "Published", className: "bg-blue-500/15 text-blue-600" },
};

export function TodayPostsWidget() {
  const navigate = useCompanyNavigate();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: slides } = useQuery({
    queryKey: ["today-editorial-slides", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editorial_slides")
        .select("*, editorial_plans(id, title, slug, client_id, clients(id, name))")
        .eq("publish_date", today)
        .order("slide_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const slideIds = useMemo(() => slides?.map((s: any) => s.id) || [], [slides]);

  const { data: slideBlocks } = useQuery({
    queryKey: ["today-slide-blocks", slideIds],
    queryFn: async () => {
      if (slideIds.length === 0) return [];
      const { data, error } = await supabase
        .from("slide_blocks")
        .select("slide_id, content")
        .in("slide_id", slideIds)
        .eq("block_type", "content_meta");
      if (error) throw error;
      return data || [];
    },
    enabled: slideIds.length > 0,
  });

  const slideTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    slideBlocks?.forEach((block: any) => {
      const content = block.content as any;
      if (content?.title) map.set(block.slide_id, content.title);
      else if (content?.caption) map.set(block.slide_id, content.caption.substring(0, 50));
    });
    return map;
  }, [slideBlocks]);

  if (!slides || slides.length === 0) {
    return (
      <div className="floating-card overflow-hidden">
        <div className="flex items-center gap-3 p-5 sm:p-6 pb-3 sm:pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10">
            <Send className="h-4 w-4 text-sky-500" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold">Postingan Tayang Hari Ini</h3>
            <p className="text-xs text-muted-foreground">Jadwal posting hari ini</p>
          </div>
        </div>
        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <Send className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Tidak ada postingan</p>
            <p className="text-xs mt-0.5">Tidak ada postingan yang dijadwalkan tayang hari ini.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="floating-card overflow-hidden">
      <div className="flex items-center justify-between p-5 sm:p-6 pb-3 sm:pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10">
            <Send className="h-4 w-4 text-sky-500" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold">Postingan Tayang Hari Ini</h3>
            <p className="text-xs text-muted-foreground">Jadwal posting hari ini</p>
          </div>
        </div>
        <Badge variant="secondary" className="rounded-full px-2.5 text-xs font-semibold">
          {slides.length}
        </Badge>
      </div>
      <div className="px-5 sm:px-6 pb-5 sm:pb-6">
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {slides.map((slide: any) => {
            const title = slideTitleMap.get(slide.id) || `Slide ${slide.slide_order + 1}`;
            const clientName = slide.editorial_plans?.clients?.name;
            const epTitle = slide.editorial_plans?.title;
            const channels = slide.channels?.length > 0 ? slide.channels : slide.channel ? [slide.channel] : [];
            const cfg = statusConfig[slide.status] || statusConfig.draft;

            return (
              <button
                key={slide.id}
                className="w-full text-left p-3 sm:p-4 rounded-2xl border-0 bg-muted/30 hover:bg-muted/60 transition-all duration-200 cursor-pointer group"
                onClick={() => navigate(`/editorial-plan/${slide.ep_id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {clientName} • {epTitle}
                    </p>
                  </div>
                  <Badge className={`${cfg.className} border-0 text-[10px] sm:text-xs rounded-full px-2`}>
                    {cfg.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  {channels.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Instagram className="h-3 w-3" />
                      {channels.join(", ")}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

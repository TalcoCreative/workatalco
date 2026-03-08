import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useCompanyNavigate } from "@/hooks/useCompanyNavigate";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Eye,
  ArrowLeft,
  GripVertical,
  MessageSquare,
  Calendar,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SlideEditor } from "@/components/editorial-plan/SlideEditor";
import { SlideStatusBadge } from "@/components/editorial-plan/SlideStatusBadge";
import { EPCommentsPanel } from "@/components/editorial-plan/EPCommentsPanel";
import { EPCalendarView } from "@/components/editorial-plan/EPCalendarView";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Slide {
  id: string;
  ep_id: string;
  slide_order: number;
  status: "proposed" | "approved" | "published" | "revise";
  approved_at: string | null;
  published_at: string | null;
  publish_date: string | null;
  channel: string | null;
  channels: string[] | null;
  format: string | null;
  slug: string | null;
  publish_links: any[] | null;
  created_at: string;
  created_by: string | null;
}

interface EditorialPlanData {
  id: string;
  title: string;
  slug: string;
  period: string | null;
  client_id: string;
  clients?: {
    id: string;
    name: string;
  };
}

export default function EditorialPlanEditor() {
  const { clientSlug, epSlug } = useParams();
  const navigate = useCompanyNavigate();
  const queryClient = useQueryClient();
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number | null>(null); // null = jadwal view
  const [showComments, setShowComments] = useState(false);
  const [slidePickerOpen, setSlidePickerOpen] = useState(false);

  // Fetch EP data
  const { data: ep, isLoading: epLoading } = useQuery({
    queryKey: ["editorial-plan", clientSlug, epSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editorial_plans")
        .select(`
          *,
          clients(id, name)
        `)
        .eq("slug", epSlug)
        .single();

      if (error) throw error;
      return data as EditorialPlanData;
    },
  });

  // Fetch slides
  const { data: slides, isLoading: slidesLoading, refetch: refetchSlides } = useQuery({
    queryKey: ["editorial-slides", ep?.id],
    queryFn: async () => {
      if (!ep?.id) return [];
      const { data, error } = await supabase
        .from("editorial_slides")
        .select("*")
        .eq("ep_id", ep.id)
        .order("slide_order", { ascending: true });

      if (error) throw error;
      return data as Slide[];
    },
    enabled: !!ep?.id,
  });

  const currentSlide = currentSlideIndex !== null ? slides?.[currentSlideIndex] : undefined;

  // Add slide mutation
  const addSlideMutation = useMutation({
    mutationFn: async () => {
      if (!ep?.id) throw new Error("No EP");

      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id || null;

      const newOrder = (slides?.length || 0);
      const slug = `slide-${newOrder + 1}`;
      const { data: slide, error } = await supabase
        .from("editorial_slides")
        .insert({
          ep_id: ep.id,
          slide_order: newOrder,
          status: "proposed",
          slug,
          channels: [],
          publish_links: [],
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Add default blocks
      const defaultBlocks: Array<{
        slide_id: string;
        block_type: "content_meta" | "image" | "video" | "status" | "internal_notes" | "external_notes";
        block_order: number;
        content: any;
        is_internal: boolean;
      }> = [
        {
          slide_id: slide.id,
          block_type: "status",
          block_order: 0,
          content: {},
          is_internal: false,
        },
        {
          slide_id: slide.id,
          block_type: "content_meta",
          block_order: 1,
          content: {
            title: "",
            copywriting: "",
            caption: "",
            format: "single_post",
            channel: "instagram",
          },
          is_internal: false,
        },
        {
          slide_id: slide.id,
          block_type: "image",
          block_order: 2,
          content: { images: [] },
          is_internal: false,
        },
      ];

      await supabase.from("slide_blocks").insert(defaultBlocks);
      return slide;
    },
    onSuccess: () => {
      refetchSlides();
      toast.success("Slide baru ditambahkan");
      setCurrentSlideIndex((slides?.length || 0));
    },
    onError: () => {
      toast.error("Gagal menambah slide");
    },
  });

  // Delete slide mutation
  const deleteSlideMutation = useMutation({
    mutationFn: async (slideId: string) => {
      const { error } = await supabase
        .from("editorial_slides")
        .delete()
        .eq("id", slideId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchSlides();
      toast.success("Slide dihapus");
      if (currentSlideIndex > 0) {
        setCurrentSlideIndex(currentSlideIndex - 1);
      }
    },
    onError: () => {
      toast.error("Gagal menghapus slide");
    },
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "ArrowLeft") {
        if (currentSlideIndex === null) return;
        if (currentSlideIndex === 0) setCurrentSlideIndex(null);
        else setCurrentSlideIndex(currentSlideIndex - 1);
      } else if (e.key === "ArrowRight") {
        if (currentSlideIndex === null && slides && slides.length > 0) {
          setCurrentSlideIndex(0);
        } else if (currentSlideIndex !== null && slides && currentSlideIndex < slides.length - 1) {
          setCurrentSlideIndex(currentSlideIndex + 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlideIndex, slides]);

  if (epLoading || slidesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!ep) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">EP tidak ditemukan</h2>
          <Button onClick={() => navigate("/editorial-plan")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  const getClientSlug = () => {
    return ep.clients?.name.toLowerCase().replace(/\s+/g, "-") || clientSlug;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/editorial-plan")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{ep.title}</h1>
              <p className="text-sm text-muted-foreground">
                {ep.clients?.name} {ep.period && `• ${ep.period}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Comments
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`${window.location.origin}/ep/${getClientSlug()}/${ep.slug}`, "_blank")}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Slide Navigation Bar */}
          <div className="border-b bg-muted/30 shrink-0 px-4 py-2">
            <div className="flex items-center gap-2">
              {/* Jadwal button */}
              <button
                onClick={() => setCurrentSlideIndex(null)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors shrink-0 font-medium",
                  currentSlideIndex === null
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                Jadwal
              </button>

              {/* Add Slide button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addSlideMutation.mutate()}
                disabled={addSlideMutation.isPending}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Slide
              </Button>

              <div className="w-px h-6 bg-border shrink-0" />

              {/* Slide Picker Dropdown */}
              {slides && slides.length > 0 && (
                <Popover open={slidePickerOpen} onOpenChange={setSlidePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 min-w-[160px] justify-between"
                    >
                      <span className="truncate">
                        {currentSlideIndex !== null
                          ? `Slide ${currentSlideIndex + 1} / ${slides.length}`
                          : `${slides.length} Slides`
                        }
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0" align="start">
                    <div className="max-h-[300px] overflow-y-auto p-1">
                        {slides.map((slide, index) => (
                          <button
                            key={slide.id}
                            onClick={() => {
                              setCurrentSlideIndex(index);
                              setSlidePickerOpen(false);
                            }}
                            className={cn(
                              "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors text-left",
                              currentSlideIndex === index
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-muted"
                            )}
                          >
                            <Check className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              currentSlideIndex === index ? "opacity-100" : "opacity-0"
                            )} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span>Slide {index + 1}</span>
                                <SlideStatusBadge status={slide.status} size="sm" />
                              </div>
                              {slide.publish_date && (
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(slide.publish_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              )}
                            </div>
                            {slide.channel && (
                              <span className="text-xs text-muted-foreground capitalize shrink-0">{slide.channel}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                </Popover>
              )}

              {/* Prev / Next navigation */}
              {slides && slides.length > 0 && currentSlideIndex !== null && (
                <div className="flex items-center gap-1 ml-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (currentSlideIndex === 0) setCurrentSlideIndex(null);
                      else setCurrentSlideIndex(currentSlideIndex - 1);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                    disabled={currentSlideIndex === slides.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Current View: Jadwal or Slide Editor */}
          <div className="flex-1 relative overflow-y-auto">
            {currentSlideIndex === null ? (
              <div className="p-4">
                {slides && slides.length > 0 ? (
                  <EPCalendarView
                    slides={slides}
                    onSlideClick={(index) => setCurrentSlideIndex(index)}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center py-20">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-4">Belum ada slide</p>
                      <Button onClick={() => addSlideMutation.mutate()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Slide Pertama
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : currentSlide ? (
              <SlideEditor
                slide={currentSlide}
                epId={ep.id}
                isEditable={true}
                onStatusChange={() => refetchSlides()}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">Belum ada slide</p>
                  <Button onClick={() => addSlideMutation.mutate()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Slide Pertama
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer Bar - Always visible */}
          <div className="border-t bg-card px-4 py-2 shrink-0">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Status badges / change status */}
              <div className="flex items-center gap-2">
                {currentSlideIndex !== null && currentSlide ? (
                  <>
                    <span className="text-xs text-muted-foreground mr-1">Status:</span>
                    {(["proposed", "revise", "approved", "published"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={async () => {
                          const updates: any = { status: s };
                          if (s === "approved") updates.approved_at = new Date().toISOString();
                          if (s === "published") updates.published_at = new Date().toISOString();
                          const { error } = await supabase
                            .from("editorial_slides")
                            .update(updates)
                            .eq("id", currentSlide.id);
                          if (!error) {
                            refetchSlides();
                            toast.success(`Status diubah ke ${s}`);
                          }
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                          currentSlide.status === s
                            ? s === "proposed" ? "bg-yellow-100 text-yellow-800 border-yellow-300 ring-2 ring-yellow-400/30"
                            : s === "revise" ? "bg-orange-100 text-orange-800 border-orange-300 ring-2 ring-orange-400/30"
                            : s === "approved" ? "bg-green-100 text-green-800 border-green-300 ring-2 ring-green-400/30"
                            : "bg-blue-100 text-blue-800 border-blue-300 ring-2 ring-blue-400/30"
                            : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                        )}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {slides?.length || 0} slides total
                  </span>
                )}
              </div>

              {/* Center: Prev/Next navigation */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() => {
                    if (currentSlideIndex === null && slides && slides.length > 0) {
                      setCurrentSlideIndex(0);
                    } else if (currentSlideIndex !== null) {
                      if (currentSlideIndex === 0) setCurrentSlideIndex(null);
                      else setCurrentSlideIndex(currentSlideIndex - 1);
                    }
                  }}
                  disabled={currentSlideIndex === null && (!slides || slides.length === 0)}
                >
                  <ChevronUp className="h-4 w-4" />
                  Prev
                </Button>
                <span className="text-xs text-muted-foreground min-w-[60px] text-center">
                  {currentSlideIndex !== null
                    ? `${currentSlideIndex + 1} / ${slides?.length || 0}`
                    : "Jadwal"
                  }
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() => {
                    if (currentSlideIndex === null && slides && slides.length > 0) {
                      setCurrentSlideIndex(0);
                    } else if (currentSlideIndex !== null && slides && currentSlideIndex < slides.length - 1) {
                      setCurrentSlideIndex(currentSlideIndex + 1);
                    }
                  }}
                  disabled={currentSlideIndex !== null && slides && currentSlideIndex === slides.length - 1}
                >
                  Next
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Right: Delete */}
              <div className="flex items-center">
                {slides && slides.length > 1 && currentSlideIndex !== null && currentSlide ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Hapus slide ini?")) {
                        deleteSlideMutation.mutate(currentSlide.id);
                      }
                    }}
                    className="text-destructive hover:text-destructive h-8"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Hapus
                  </Button>
                ) : (
                  <div className="w-[80px]" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Comments Panel */}
        {showComments && ep && (
          <EPCommentsPanel
            epId={ep.id}
            currentSlideId={currentSlide?.id}
            onClose={() => setShowComments(false)}
          />
        )}
      </div>
    </div>
  );
}

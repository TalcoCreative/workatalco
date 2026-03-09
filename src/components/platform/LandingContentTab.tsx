import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Save, Plus, Trash2, ChevronDown, ChevronUp, GripVertical,
  Type, MessageSquare, Star, HelpCircle, Zap, Layout, Image,
  Users, FileText, Megaphone,
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

type SectionData = Record<string, any>;

const SECTION_META: Record<string, { label: string; icon: any; description: string }> = {
  hero: { label: "Hero Section", icon: Zap, description: "Judul utama, subtitle, badge, CTA, dan statistik" },
  trust_bar: { label: "Trust Bar", icon: Users, description: "Daftar nama perusahaan yang ditampilkan" },
  features: { label: "Features", icon: Layout, description: "Daftar fitur produk beserta deskripsi" },
  product_showcase: { label: "Product Showcase", icon: Image, description: "Screenshot produk dan deskripsi" },
  how_it_works: { label: "How It Works", icon: FileText, description: "Langkah-langkah memulai" },
  pricing: { label: "Pricing Section", icon: Megaphone, description: "Judul, subtitle, dan free trial banner" },
  testimonials: { label: "Testimonials", icon: Star, description: "Testimoni dari pengguna" },
  why_worka: { label: "Why WORKA", icon: MessageSquare, description: "Alasan menggunakan WORKA" },
  faq: { label: "FAQ", icon: HelpCircle, description: "Pertanyaan yang sering diajukan" },
  final_cta: { label: "Final CTA", icon: Megaphone, description: "Call-to-action terakhir di halaman" },
  footer: { label: "Footer", icon: Type, description: "Teks dan link di footer" },
};

const SECTION_ORDER = ["hero", "trust_bar", "features", "product_showcase", "how_it_works", "pricing", "testimonials", "why_worka", "faq", "final_cta", "footer"];

export function LandingContentTab() {
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<SectionData>({});

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["landing-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_content")
        .select("*")
        .order("section");
      if (error) throw error;
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ section, content }: { section: string; content: any }) => {
      const { error } = await supabase
        .from("landing_content")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("section", section);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Konten berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["landing-content"] });
      setEditingSection(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getSectionData = (section: string): any => {
    const found = sections.find((s: any) => s.section === section);
    return found?.content || {};
  };

  const startEdit = (section: string) => {
    setEditingSection(section);
    setEditData(JSON.parse(JSON.stringify(getSectionData(section))));
  };

  const handleSave = () => {
    if (!editingSection) return;
    updateMutation.mutate({ section: editingSection, content: editData });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Landing Page Editor</h2>
          <p className="text-sm text-muted-foreground">Edit semua konten di halaman landing page</p>
        </div>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {SECTION_ORDER.map((sectionKey) => {
          const meta = SECTION_META[sectionKey];
          if (!meta) return null;
          const data = getSectionData(sectionKey);
          const isEditing = editingSection === sectionKey;

          return (
            <AccordionItem key={sectionKey} value={sectionKey} className="border border-border/30 rounded-xl overflow-hidden bg-card/50">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-3 text-left">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <meta.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                {!isEditing ? (
                  <div className="space-y-3">
                    <SectionPreview sectionKey={sectionKey} data={data} />
                    <Button size="sm" onClick={() => startEdit(sectionKey)} className="gap-2">
                      <Type className="h-3.5 w-3.5" /> Edit Konten
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <SectionEditor sectionKey={sectionKey} data={editData} onChange={setEditData} />
                    <div className="flex gap-2 pt-2 border-t border-border/20">
                      <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
                        <Save className="h-3.5 w-3.5" /> {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Batal</Button>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function SectionPreview({ sectionKey, data }: { sectionKey: string; data: any }) {
  switch (sectionKey) {
    case "hero":
      return (
        <div className="rounded-xl bg-muted/20 p-4 space-y-1 text-sm">
          <p><span className="text-muted-foreground">Badge:</span> <span className="font-medium">{data.badge_text}</span></p>
          <p><span className="text-muted-foreground">Title:</span> <span className="font-medium">{data.title_line1} {data.title_line2}</span></p>
          <p><span className="text-muted-foreground">Subtitle:</span> <span className="font-medium text-xs">{data.subtitle?.substring(0, 80)}...</span></p>
          <p><span className="text-muted-foreground">Stats:</span> {data.stats?.map((s: any, i: number) => <Badge key={i} variant="outline" className="ml-1 text-xs">{s.value}{s.suffix} {s.label}</Badge>)}</p>
        </div>
      );
    case "trust_bar":
      return (
        <div className="rounded-xl bg-muted/20 p-4 text-sm">
          <p className="text-muted-foreground mb-1">{data.title}</p>
          <div className="flex flex-wrap gap-2">{data.companies?.map((c: string, i: number) => <Badge key={i} variant="outline">{c}</Badge>)}</div>
        </div>
      );
    case "features":
      return (
        <div className="rounded-xl bg-muted/20 p-4 text-sm space-y-1">
          <p><span className="text-muted-foreground">Judul:</span> <span className="font-medium">{data.title}</span></p>
          <p><span className="text-muted-foreground">Jumlah fitur:</span> <span className="font-medium">{data.items?.length || 0}</span></p>
        </div>
      );
    case "testimonials":
      return (
        <div className="rounded-xl bg-muted/20 p-4 text-sm space-y-1">
          <p><span className="text-muted-foreground">Jumlah testimoni:</span> <span className="font-medium">{data.items?.length || 0}</span></p>
          {data.items?.map((t: any, i: number) => <p key={i} className="text-xs text-muted-foreground">• {t.name} — {t.role}</p>)}
        </div>
      );
    case "faq":
      return (
        <div className="rounded-xl bg-muted/20 p-4 text-sm space-y-1">
          <p><span className="text-muted-foreground">Jumlah FAQ:</span> <span className="font-medium">{data.items?.length || 0}</span></p>
        </div>
      );
    default:
      return (
        <div className="rounded-xl bg-muted/20 p-4 text-sm">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{JSON.stringify(data, null, 2).substring(0, 300)}</pre>
        </div>
      );
  }
}

function SectionEditor({ sectionKey, data, onChange }: { sectionKey: string; data: any; onChange: (d: any) => void }) {
  const update = (key: string, value: any) => onChange({ ...data, [key]: value });

  switch (sectionKey) {
    case "hero":
      return (
        <div className="space-y-4">
          <Field label="Badge Text" value={data.badge_text || ""} onChange={(v) => update("badge_text", v)} />
          <Field label="Title Line 1" value={data.title_line1 || ""} onChange={(v) => update("title_line1", v)} />
          <Field label="Title Line 2 (Highlighted)" value={data.title_line2 || ""} onChange={(v) => update("title_line2", v)} />
          <Field label="Subtitle" value={data.subtitle || ""} onChange={(v) => update("subtitle", v)} multiline />
          <Field label="CTA Primary Text" value={data.cta_primary || ""} onChange={(v) => update("cta_primary", v)} />
          <Field label="CTA Secondary Text" value={data.cta_secondary || ""} onChange={(v) => update("cta_secondary", v)} />
          <div>
            <Label className="text-xs font-semibold mb-2 block">Statistics</Label>
            {data.stats?.map((stat: any, i: number) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <Input className="h-8 text-sm" value={stat.value} type="number" placeholder="Value"
                  onChange={(e) => {
                    const stats = [...(data.stats || [])];
                    stats[i] = { ...stats[i], value: parseInt(e.target.value) || 0 };
                    update("stats", stats);
                  }}
                />
                <Input className="h-8 text-sm" value={stat.suffix} placeholder="Suffix (+, K+, %)"
                  onChange={(e) => {
                    const stats = [...(data.stats || [])];
                    stats[i] = { ...stats[i], suffix: e.target.value };
                    update("stats", stats);
                  }}
                />
                <Input className="h-8 text-sm" value={stat.label} placeholder="Label"
                  onChange={(e) => {
                    const stats = [...(data.stats || [])];
                    stats[i] = { ...stats[i], label: e.target.value };
                    update("stats", stats);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      );

    case "trust_bar":
      return (
        <div className="space-y-4">
          <Field label="Section Title" value={data.title || ""} onChange={(v) => update("title", v)} />
          <div>
            <Label className="text-xs font-semibold mb-2 block">Company Names</Label>
            {data.companies?.map((c: string, i: number) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input className="h-8 text-sm" value={c}
                  onChange={(e) => {
                    const arr = [...(data.companies || [])];
                    arr[i] = e.target.value;
                    update("companies", arr);
                  }}
                />
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => {
                  update("companies", data.companies.filter((_: any, j: number) => j !== i));
                }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5 mt-1" onClick={() => update("companies", [...(data.companies || []), "New Company"])}>
              <Plus className="h-3 w-3" /> Tambah
            </Button>
          </div>
        </div>
      );

    case "features":
      return (
        <div className="space-y-4">
          <Field label="Badge" value={data.badge || ""} onChange={(v) => update("badge", v)} />
          <Field label="Section Title" value={data.title || ""} onChange={(v) => update("title", v)} />
          <Field label="Highlight Word" value={data.title_highlight || ""} onChange={(v) => update("title_highlight", v)} />
          <Field label="Subtitle" value={data.subtitle || ""} onChange={(v) => update("subtitle", v)} multiline />
          <div>
            <Label className="text-xs font-semibold mb-2 block">Feature Items ({data.items?.length || 0})</Label>
            {data.items?.map((item: any, i: number) => (
              <Card key={i} className="mb-3 border-border/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{item.icon || "Icon"}</Badge>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => {
                      update("items", data.items.filter((_: any, j: number) => j !== i));
                    }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <Input className="h-8 text-sm" value={item.title} placeholder="Feature title"
                    onChange={(e) => {
                      const items = [...data.items];
                      items[i] = { ...items[i], title: e.target.value };
                      update("items", items);
                    }}
                  />
                  <Textarea className="text-sm min-h-[60px]" value={item.desc} placeholder="Description"
                    onChange={(e) => {
                      const items = [...data.items];
                      items[i] = { ...items[i], desc: e.target.value };
                      update("items", items);
                    }}
                  />
                  <Input className="h-8 text-sm" value={item.icon} placeholder="Icon name (Briefcase, Users, Calendar...)"
                    onChange={(e) => {
                      const items = [...data.items];
                      items[i] = { ...items[i], icon: e.target.value };
                      update("items", items);
                    }}
                  />
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
              update("items", [...(data.items || []), { icon: "Star", title: "New Feature", desc: "Description here" }]);
            }}><Plus className="h-3 w-3" /> Tambah Feature</Button>
          </div>
        </div>
      );

    case "product_showcase":
      return (
        <div className="space-y-4">
          <Field label="Badge" value={data.badge || ""} onChange={(v) => update("badge", v)} />
          <Field label="Section Title" value={data.title || ""} onChange={(v) => update("title", v)} />
          <Field label="Highlight Word" value={data.title_highlight || ""} onChange={(v) => update("title_highlight", v)} />
          <Field label="Subtitle" value={data.subtitle || ""} onChange={(v) => update("subtitle", v)} />
          <div>
            <Label className="text-xs font-semibold mb-2 block">Screenshots</Label>
            {data.screenshots?.map((s: any, i: number) => (
              <Card key={i} className="mb-3 border-border/20">
                <CardContent className="p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input className="h-8 text-sm" value={s.title} placeholder="Title"
                      onChange={(e) => {
                        const arr = [...data.screenshots];
                        arr[i] = { ...arr[i], title: e.target.value };
                        update("screenshots", arr);
                      }}
                    />
                    <Input className="h-8 text-sm" value={s.tag} placeholder="Tag"
                      onChange={(e) => {
                        const arr = [...data.screenshots];
                        arr[i] = { ...arr[i], tag: e.target.value };
                        update("screenshots", arr);
                      }}
                    />
                  </div>
                  <Input className="h-8 text-sm" value={s.imgKey} placeholder="Image Key (screenshot-dashboard)"
                    onChange={(e) => {
                      const arr = [...data.screenshots];
                      arr[i] = { ...arr[i], imgKey: e.target.value };
                      update("screenshots", arr);
                    }}
                  />
                  <Textarea className="text-sm min-h-[50px]" value={s.desc} placeholder="Description"
                    onChange={(e) => {
                      const arr = [...data.screenshots];
                      arr[i] = { ...arr[i], desc: e.target.value };
                      update("screenshots", arr);
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );

    case "how_it_works":
      return (
        <div className="space-y-4">
          <Field label="Section Title" value={data.title || ""} onChange={(v) => update("title", v)} />
          <Field label="Highlight Word" value={data.title_highlight || ""} onChange={(v) => update("title_highlight", v)} />
          <Field label="Subtitle" value={data.subtitle || ""} onChange={(v) => update("subtitle", v)} />
          <div>
            <Label className="text-xs font-semibold mb-2 block">Steps</Label>
            {data.steps?.map((s: any, i: number) => (
              <div key={i} className="grid grid-cols-[60px_1fr_1fr] gap-2 mb-2">
                <Input className="h-8 text-sm" value={s.step} placeholder="01"
                  onChange={(e) => {
                    const arr = [...data.steps];
                    arr[i] = { ...arr[i], step: e.target.value };
                    update("steps", arr);
                  }}
                />
                <Input className="h-8 text-sm" value={s.title} placeholder="Title"
                  onChange={(e) => {
                    const arr = [...data.steps];
                    arr[i] = { ...arr[i], title: e.target.value };
                    update("steps", arr);
                  }}
                />
                <Input className="h-8 text-sm" value={s.desc} placeholder="Description"
                  onChange={(e) => {
                    const arr = [...data.steps];
                    arr[i] = { ...arr[i], desc: e.target.value };
                    update("steps", arr);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      );

    case "pricing":
      return (
        <div className="space-y-4">
          <Field label="Badge" value={data.badge || ""} onChange={(v) => update("badge", v)} />
          <Field label="Section Title" value={data.title || ""} onChange={(v) => update("title", v)} />
          <Field label="Highlight Word" value={data.title_highlight || ""} onChange={(v) => update("title_highlight", v)} />
          <Field label="Subtitle" value={data.subtitle || ""} onChange={(v) => update("subtitle", v)} />
          <Field label="Free Trial Title" value={data.free_trial_title || ""} onChange={(v) => update("free_trial_title", v)} />
          <Field label="Free Trial Subtitle" value={data.free_trial_subtitle || ""} onChange={(v) => update("free_trial_subtitle", v)} />
          <Field label="Free Trial CTA" value={data.free_trial_cta || ""} onChange={(v) => update("free_trial_cta", v)} />
          <p className="text-xs text-muted-foreground italic">💡 Harga produk dikelola di tab Products</p>
        </div>
      );

    case "testimonials":
      return (
        <div className="space-y-4">
          <Field label="Section Title" value={data.title || ""} onChange={(v) => update("title", v)} />
          <Field label="Highlight Word" value={data.title_highlight || ""} onChange={(v) => update("title_highlight", v)} />
          <div>
            <Label className="text-xs font-semibold mb-2 block">Testimonials</Label>
            {data.items?.map((t: any, i: number) => (
              <Card key={i} className="mb-3 border-border/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2 flex-1">
                      <Input className="h-8 text-sm w-12" value={t.avatar} placeholder="A"
                        onChange={(e) => {
                          const arr = [...data.items];
                          arr[i] = { ...arr[i], avatar: e.target.value };
                          update("items", arr);
                        }}
                      />
                      <Input className="h-8 text-sm" value={t.name} placeholder="Name"
                        onChange={(e) => {
                          const arr = [...data.items];
                          arr[i] = { ...arr[i], name: e.target.value };
                          update("items", arr);
                        }}
                      />
                      <Input className="h-8 text-sm" value={t.role} placeholder="Role"
                        onChange={(e) => {
                          const arr = [...data.items];
                          arr[i] = { ...arr[i], role: e.target.value };
                          update("items", arr);
                        }}
                      />
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive ml-2" onClick={() => {
                      update("items", data.items.filter((_: any, j: number) => j !== i));
                    }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <Textarea className="text-sm min-h-[60px]" value={t.text} placeholder="Testimonial text"
                    onChange={(e) => {
                      const arr = [...data.items];
                      arr[i] = { ...arr[i], text: e.target.value };
                      update("items", arr);
                    }}
                  />
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
              update("items", [...(data.items || []), { name: "New Person", role: "Role", text: "Testimonial...", avatar: "N" }]);
            }}><Plus className="h-3 w-3" /> Tambah Testimoni</Button>
          </div>
        </div>
      );

    case "why_worka":
      return (
        <div className="space-y-4">
          <Field label="Section Title" value={data.title || ""} onChange={(v) => update("title", v)} />
          <Field label="Highlight Word" value={data.title_highlight || ""} onChange={(v) => update("title_highlight", v)} />
          <div>
            <Label className="text-xs font-semibold mb-2 block">Items</Label>
            {data.items?.map((item: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_2fr] gap-2 mb-2 items-start">
                <Input className="h-8 text-sm" value={item.title} placeholder="Title"
                  onChange={(e) => {
                    const arr = [...data.items];
                    arr[i] = { ...arr[i], title: e.target.value };
                    update("items", arr);
                  }}
                />
                <div className="flex gap-2">
                  <Textarea className="text-sm min-h-[32px]" value={item.desc} placeholder="Description"
                    onChange={(e) => {
                      const arr = [...data.items];
                      arr[i] = { ...arr[i], desc: e.target.value };
                      update("items", arr);
                    }}
                  />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive shrink-0" onClick={() => {
                    update("items", data.items.filter((_: any, j: number) => j !== i));
                  }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
              update("items", [...(data.items || []), { title: "New Item?", desc: "Description here" }]);
            }}><Plus className="h-3 w-3" /> Tambah</Button>
          </div>
        </div>
      );

    case "faq":
      return (
        <div className="space-y-4">
          <Field label="Section Title" value={data.title || ""} onChange={(v) => update("title", v)} />
          <div>
            <Label className="text-xs font-semibold mb-2 block">FAQ Items</Label>
            {data.items?.map((faq: any, i: number) => (
              <Card key={i} className="mb-3 border-border/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">#{i + 1}</Badge>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => {
                      update("items", data.items.filter((_: any, j: number) => j !== i));
                    }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <Input className="h-8 text-sm" value={faq.q} placeholder="Question"
                    onChange={(e) => {
                      const arr = [...data.items];
                      arr[i] = { ...arr[i], q: e.target.value };
                      update("items", arr);
                    }}
                  />
                  <Textarea className="text-sm min-h-[60px]" value={faq.a} placeholder="Answer"
                    onChange={(e) => {
                      const arr = [...data.items];
                      arr[i] = { ...arr[i], a: e.target.value };
                      update("items", arr);
                    }}
                  />
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
              update("items", [...(data.items || []), { q: "New question?", a: "Answer here" }]);
            }}><Plus className="h-3 w-3" /> Tambah FAQ</Button>
          </div>
        </div>
      );

    case "final_cta":
      return (
        <div className="space-y-4">
          <Field label="Badge Text" value={data.badge || ""} onChange={(v) => update("badge", v)} />
          <Field label="Title" value={data.title || ""} onChange={(v) => update("title", v)} />
          <Field label="Highlight Word" value={data.title_highlight || ""} onChange={(v) => update("title_highlight", v)} />
          <Field label="Subtitle" value={data.subtitle || ""} onChange={(v) => update("subtitle", v)} />
          <Field label="CTA Primary" value={data.cta_primary || ""} onChange={(v) => update("cta_primary", v)} />
          <Field label="CTA Secondary" value={data.cta_secondary || ""} onChange={(v) => update("cta_secondary", v)} />
        </div>
      );

    case "footer":
      return (
        <div className="space-y-4">
          <Field label="Description" value={data.description || ""} onChange={(v) => update("description", v)} multiline />
          <div>
            <Label className="text-xs font-semibold mb-2 block">Product Links</Label>
            {data.product_links?.map((link: any, i: number) => (
              <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                <Input className="h-8 text-sm" value={link.label} placeholder="Label"
                  onChange={(e) => {
                    const arr = [...data.product_links];
                    arr[i] = { ...arr[i], label: e.target.value };
                    update("product_links", arr);
                  }}
                />
                <Input className="h-8 text-sm" value={link.href} placeholder="Link (/blog, #features)"
                  onChange={(e) => {
                    const arr = [...data.product_links];
                    arr[i] = { ...arr[i], href: e.target.value };
                    update("product_links", arr);
                  }}
                />
              </div>
            ))}
          </div>
          <div>
            <Label className="text-xs font-semibold mb-2 block">Legal Links</Label>
            {data.legal_links?.map((link: any, i: number) => (
              <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                <Input className="h-8 text-sm" value={link.label} placeholder="Label"
                  onChange={(e) => {
                    const arr = [...data.legal_links];
                    arr[i] = { ...arr[i], label: e.target.value };
                    update("legal_links", arr);
                  }}
                />
                <Input className="h-8 text-sm" value={link.href} placeholder="Link"
                  onChange={(e) => {
                    const arr = [...data.legal_links];
                    arr[i] = { ...arr[i], href: e.target.value };
                    update("legal_links", arr);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div>
          <Label className="text-xs font-semibold mb-2 block">Raw JSON</Label>
          <Textarea
            className="font-mono text-xs min-h-[200px]"
            value={JSON.stringify(data, null, 2)}
            onChange={(e) => {
              try { onChange(JSON.parse(e.target.value)); } catch {}
            }}
          />
        </div>
      );
  }
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      {multiline ? (
        <Textarea className="text-sm min-h-[80px]" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input className="h-9 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

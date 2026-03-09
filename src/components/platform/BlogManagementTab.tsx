import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Eye, EyeOff, Upload, X, ExternalLink, ImageIcon, Clock, User, Calendar } from "lucide-react";

export function BlogManagementTab() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);
  const [editorTab, setEditorTab] = useState<"edit" | "preview">("edit");
  const [uploading, setUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "", slug: "", content: "", cover_image: "", author: "WORKA Team",
    is_published: false, meta_title: "", meta_description: "", og_image: "",
    tags: "", excerpt: "",
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

  const openCreate = () => {
    setEditPost(null);
    setEditorTab("edit");
    setForm({ title: "", slug: "", content: "", cover_image: "", author: "WORKA Team",
      is_published: false, meta_title: "", meta_description: "", og_image: "", tags: "", excerpt: "" });
    setEditOpen(true);
  };

  const openEdit = (post: any) => {
    setEditPost(post);
    setEditorTab("edit");
    setForm({
      title: post.title, slug: post.slug, content: post.content,
      cover_image: post.cover_image || "", author: post.author, is_published: post.is_published,
      meta_title: post.meta_title || "", meta_description: post.meta_description || "",
      og_image: post.og_image || "", tags: (post.tags || []).join(", "), excerpt: post.excerpt || "",
    });
    setEditOpen(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `blog-cover-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("landing-assets")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("landing-assets")
        .getPublicUrl(fileName);

      setForm(f => ({ ...f, cover_image: urlData.publicUrl, og_image: f.og_image || urlData.publicUrl }));
      toast.success("Cover image uploaded!");
    } catch (err: any) {
      toast.error("Upload gagal: " + err.message);
    } finally {
      setUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.slug) throw new Error("Title and slug are required");
      const tagsArray = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
      const payload: any = {
        title: form.title, slug: form.slug, content: form.content,
        cover_image: form.cover_image || null, author: form.author || "WORKA Team",
        is_published: form.is_published, published_at: form.is_published ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(), meta_title: form.meta_title || null,
        meta_description: form.meta_description || null, og_image: form.og_image || null,
        tags: tagsArray, excerpt: form.excerpt || null,
      };
      if (editPost) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", editPost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editPost ? "Post updated" : "Post created");
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await supabase.from("blog_posts").update({
        is_published: publish, published_at: publish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.publish ? "Post published" : "Post unpublished");
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
  });

  const readingTime = Math.max(1, Math.ceil((form.content?.replace(/<[^>]*>/g, '').length || 0) / 1000));
  const tagsArray = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Blog Posts ({posts.length})</CardTitle>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Post
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Belum ada blog post</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cover</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.cover_image ? (
                        <img src={p.cover_image} alt="" className="h-10 w-16 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-16 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm max-w-[200px] truncate">{p.title}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">/{p.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.author}</TableCell>
                    <TableCell>
                      {p.is_published ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Published</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(parseISO(p.updated_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublish.mutate({ id: p.id, publish: !p.is_published })}>
                          {p.is_published ? <EyeOff className="h-3.5 w-3.5 text-warning" /> : <Eye className="h-3.5 w-3.5 text-emerald-500" />}
                        </Button>
                        {p.is_published && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(p.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editPost ? "Edit Post" : "Create New Post"}</DialogTitle>
            </DialogHeader>

            <Tabs value={editorTab} onValueChange={(v) => setEditorTab(v as "edit" | "preview")}>
              <TabsList className="w-full">
                <TabsTrigger value="edit" className="flex-1 gap-2"><Pencil className="h-3.5 w-3.5" /> Editor</TabsTrigger>
                <TabsTrigger value="preview" className="flex-1 gap-2"><Eye className="h-3.5 w-3.5" /> Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="space-y-4 mt-4">
                {/* Cover Image Upload */}
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                  {form.cover_image ? (
                    <div className="relative rounded-xl overflow-hidden border border-border/50">
                      <img src={form.cover_image} alt="Cover" className="w-full h-48 object-cover" />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          type="button" size="icon" variant="secondary"
                          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                          onClick={() => coverInputRef.current?.click()}
                          disabled={uploading}
                        >
                          <Upload className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button" size="icon" variant="secondary"
                          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                          onClick={() => setForm(f => ({ ...f, cover_image: "" }))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full h-36 rounded-xl border-2 border-dashed border-border/50 bg-muted/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      {uploading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Klik untuk upload cover image</span>
                          <span className="text-[10px] text-muted-foreground">JPG, PNG, WebP • Maks 5MB</span>
                        </>
                      )}
                    </button>
                  )}
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-muted-foreground">Atau masukkan URL:</span>
                    <Input
                      value={form.cover_image}
                      onChange={(e) => setForm(f => ({ ...f, cover_image: e.target.value }))}
                      placeholder="https://..."
                      className="text-xs h-8 flex-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Title *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm(f => ({ ...f, title: e.target.value, slug: editPost ? f.slug : generateSlug(e.target.value) }))}
                      placeholder="How to Manage Your Agency Effectively"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug *</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Author</Label>
                    <Input value={form.author} onChange={(e) => setForm(f => ({ ...f, author: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Excerpt (ringkasan singkat untuk SEO)</Label>
                  <Textarea
                    value={form.excerpt}
                    onChange={(e) => setForm(f => ({ ...f, excerpt: e.target.value }))}
                    rows={2}
                    placeholder="Ringkasan singkat artikel..."
                    maxLength={300}
                  />
                  <p className="text-[10px] text-muted-foreground">{form.excerpt.length}/300 characters</p>
                </div>
                <div className="space-y-2">
                  <Label>Tags (pisahkan dengan koma)</Label>
                  <Input value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="agency, management, tips" />
                </div>

                <div className="border-t border-border/30 pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">SEO Settings</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Meta Title (max 60)</Label>
                        <Input value={form.meta_title} onChange={(e) => setForm(f => ({ ...f, meta_title: e.target.value }))} placeholder={form.title || "SEO title..."} maxLength={60} />
                        <p className="text-[10px] text-muted-foreground">{form.meta_title.length}/60</p>
                      </div>
                      <div className="space-y-2">
                        <Label>OG Image URL</Label>
                        <Input value={form.og_image} onChange={(e) => setForm(f => ({ ...f, og_image: e.target.value }))} placeholder="https://..." />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Meta Description (max 160)</Label>
                      <Textarea value={form.meta_description} onChange={(e) => setForm(f => ({ ...f, meta_description: e.target.value }))} rows={2} placeholder="Deskripsi untuk hasil pencarian Google..." maxLength={160} />
                      <p className="text-[10px] text-muted-foreground">{form.meta_description.length}/160</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Content (HTML)</Label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                    rows={14}
                    placeholder="<h2>Introduction</h2><p>Write your blog content here...</p>"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_published} onCheckedChange={(v) => setForm(f => ({ ...f, is_published: v }))} />
                  <Label>Publish immediately</Label>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                {/* Live preview mimicking BlogPost page */}
                <div className="rounded-xl border border-border/50 bg-background overflow-hidden">
                  {/* Cover */}
                  {form.cover_image ? (
                    <div className="w-full aspect-video overflow-hidden">
                      <img src={form.cover_image} alt={form.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <span className="text-5xl font-bold text-primary/20">W</span>
                    </div>
                  )}

                  <div className="p-6 md:p-8 max-w-3xl mx-auto">
                    {tagsArray.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {tagsArray.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-primary border-primary/30 bg-primary/5 text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-4 leading-tight tracking-tight">
                      {form.title || "Judul Artikel"}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-6 pb-6 border-b border-border/30">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {form.author || "Author"}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(), "dd MMMM yyyy")}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {readingTime} min read</span>
                    </div>

                    {form.excerpt && (
                      <p className="text-sm text-muted-foreground italic mb-6 border-l-2 border-primary/30 pl-4">{form.excerpt}</p>
                    )}

                    {form.content ? (
                      <div
                        className="prose prose-sm prose-neutral dark:prose-invert max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-p:leading-relaxed prose-a:text-primary prose-img:rounded-xl"
                        dangerouslySetInnerHTML={{ __html: form.content }}
                      />
                    ) : (
                      <p className="text-muted-foreground text-sm">Konten artikel akan muncul di sini...</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editPost ? "Update Post" : "Create Post"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

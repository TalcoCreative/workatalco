import { useState } from "react";
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
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

export function BlogManagementTab() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);
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
    setForm({ title: "", slug: "", content: "", cover_image: "", author: "WORKA Team",
      is_published: false, meta_title: "", meta_description: "", og_image: "", tags: "", excerpt: "" });
    setEditOpen(true);
  };

  const openEdit = (post: any) => {
    setEditPost(post);
    setForm({
      title: post.title, slug: post.slug, content: post.content,
      cover_image: post.cover_image || "", author: post.author, is_published: post.is_published,
      meta_title: post.meta_title || "", meta_description: post.meta_description || "",
      og_image: post.og_image || "", tags: (post.tags || []).join(", "), excerpt: post.excerpt || "",
    });
    setEditOpen(true);
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
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{p.slug}</TableCell>
                    <TableCell className="text-muted-foreground">{p.author}</TableCell>
                    <TableCell>
                      {p.is_published ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Published</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">Draft</Badge>
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
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editPost ? "Edit Post" : "Create New Post"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cover Image URL</Label>
                  <Input value={form.cover_image} onChange={(e) => setForm(f => ({ ...f, cover_image: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>OG Image URL (for social sharing)</Label>
                  <Input value={form.og_image} onChange={(e) => setForm(f => ({ ...f, og_image: e.target.value }))} placeholder="https://..." />
                </div>
              </div>

              <div className="border-t border-border/30 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">SEO Settings</p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Meta Title (max 60 chars)</Label>
                    <Input
                      value={form.meta_title}
                      onChange={(e) => setForm(f => ({ ...f, meta_title: e.target.value }))}
                      placeholder={form.title || "SEO title..."}
                      maxLength={60}
                    />
                    <p className="text-[10px] text-muted-foreground">{form.meta_title.length}/60 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Description (max 160 chars)</Label>
                    <Textarea
                      value={form.meta_description}
                      onChange={(e) => setForm(f => ({ ...f, meta_description: e.target.value }))}
                      rows={2}
                      placeholder="Deskripsi untuk hasil pencarian Google..."
                      maxLength={160}
                    />
                    <p className="text-[10px] text-muted-foreground">{form.meta_description.length}/160 characters</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content (HTML)</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={12}
                  placeholder="<h2>Introduction</h2><p>Write your blog content here...</p>"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm(f => ({ ...f, is_published: v }))} />
                <Label>Publish immediately</Label>
              </div>
            </div>
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

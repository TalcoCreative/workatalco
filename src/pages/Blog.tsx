import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, User, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";

export default function Blog() {
  const [search, setSearch] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["public-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = posts.filter((p: any) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.content?.toLowerCase().includes(search.toLowerCase())
  );

  // JSON-LD for blog listing
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "WORKA Blog",
    "description": "Insights, tips, dan best practices untuk mengelola creative agency dan perusahaan jasa Anda.",
    "url": window.location.href,
    "publisher": {
      "@type": "Organization",
      "name": "WORKA",
      "logo": { "@type": "ImageObject", "url": `${window.location.origin}/favicon.ico` }
    },
    "blogPost": filtered.map((p: any) => ({
      "@type": "BlogPosting",
      "headline": p.title,
      "url": `${window.location.origin}/blog/${p.slug}`,
      "datePublished": p.published_at,
      "author": { "@type": "Person", "name": p.author },
      ...(p.cover_image && { "image": p.cover_image }),
    }))
  };

  return (
    <>
      <Helmet>
        <title>Blog — WORKA | Tips & Insights untuk Creative Agency</title>
        <meta name="description" content="Insights, tips, dan best practices untuk mengelola creative agency dan perusahaan jasa. Baca artikel terbaru dari tim WORKA." />
        <meta property="og:title" content="Blog — WORKA" />
        <meta property="og:description" content="Insights dan tips untuk mengelola creative agency Anda." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        <link rel="canonical" href={window.location.href} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/30 bg-background/60 backdrop-blur-2xl sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
            <Link to="/landing" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Link>
            <Link to="/landing" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-glow-primary">W</div>
              <span className="font-extrabold text-foreground">WORKA</span>
            </Link>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">Blog</Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">WORKA Blog</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Insights, tips, dan best practices untuk mengelola agensi kreatif Anda.
            </p>
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari artikel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12 rounded-xl"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-border/30 animate-pulse">
                  <div className="h-48 bg-muted rounded-t-xl" />
                  <CardContent className="p-6 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-muted-foreground text-lg">{search ? "Tidak ada artikel yang cocok." : "Belum ada artikel. Stay tuned!"}</p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((post: any) => (
                <Link key={post.id} to={`/blog/${post.slug}`}>
                  <article>
                    <Card className="border-border/30 overflow-hidden group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 h-full">
                      {post.cover_image ? (
                        <div className="h-48 overflow-hidden">
                          <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <span className="text-4xl font-bold text-primary/20">W</span>
                        </div>
                      )}
                      <CardContent className="p-6">
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {post.tags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">{tag}</Badge>
                            ))}
                          </div>
                        )}
                        <h2 className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h2>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {post.excerpt || post.content?.replace(/<[^>]*>/g, '').substring(0, 120)}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {post.author}</span>
                          {post.published_at && (
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(parseISO(post.published_at), "dd MMM yyyy")}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </main>

        <footer className="border-t border-border/30 bg-muted/20 px-6 py-8">
          <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} WORKA. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  );
}

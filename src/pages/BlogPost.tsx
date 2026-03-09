import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, User, Clock, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { Helmet } from "react-helmet";
import { toast } from "sonner";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Reading time estimate
  const readingTime = post ? Math.max(1, Math.ceil((post.content?.replace(/<[^>]*>/g, '').length || 0) / 1000)) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Artikel Tidak Ditemukan</h1>
          <Link to="/blog" className="text-primary hover:underline">← Kembali ke Blog</Link>
        </div>
      </div>
    );
  }

  const metaTitle = post.meta_title || post.title;
  const metaDesc = post.meta_description || post.excerpt || post.content?.replace(/<[^>]*>/g, '').substring(0, 160);
  const ogImage = post.og_image || post.cover_image;
  const canonicalUrl = `${window.location.origin}/blog/${post.slug}`;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": metaDesc,
    "url": canonicalUrl,
    "datePublished": post.published_at,
    "dateModified": post.updated_at,
    "author": { "@type": "Person", "name": post.author },
    "publisher": {
      "@type": "Organization",
      "name": "WORKA",
      "logo": { "@type": "ImageObject", "url": `${window.location.origin}/favicon.ico` }
    },
    ...(ogImage && { "image": ogImage }),
    "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl },
  };

  return (
    <>
      <Helmet>
        <title>{metaTitle} — WORKA Blog</title>
        <meta name="description" content={metaDesc} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDesc} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <link rel="canonical" href={canonicalUrl} />
        <meta name="article:published_time" content={post.published_at} />
        <meta name="article:modified_time" content={post.updated_at} />
        <meta name="article:author" content={post.author} />
        {post.tags?.map((tag: string) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/30 bg-background/60 backdrop-blur-2xl sticky top-0 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
            <Link to="/blog" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              <ArrowLeft className="h-4 w-4" /> Blog
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8">
                <Share2 className="h-4 w-4" />
              </Button>
              <Link to="/landing" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-glow-primary">W</div>
                <span className="font-extrabold text-foreground hidden sm:inline">WORKA</span>
              </Link>
            </div>
          </div>
        </header>

        <article className="max-w-4xl mx-auto px-6 py-12 md:py-16">
          {/* Cover Image - Full width above title */}
          {post.cover_image && (
            <div className="rounded-2xl overflow-hidden mb-10 aspect-video shadow-lg">
              <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" loading="eager" />
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-primary border-primary/30 bg-primary/5 text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-6 leading-tight tracking-tight">{post.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-10 pb-10 border-b border-border/30">
            <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {post.author}</span>
            {post.published_at && (
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {format(parseISO(post.published_at), "dd MMMM yyyy")}</span>
            )}
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {readingTime} min read</span>
          </div>

          <div
            className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-p:leading-relaxed prose-a:text-primary prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        {/* CTA */}
        <section className="border-t border-border/30 bg-muted/20 px-6 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-extrabold text-foreground mb-4">Tertarik mencoba WORKA?</h2>
            <p className="text-muted-foreground mb-6">Mulai 14 hari free trial tanpa kartu kredit.</p>
            <Link to="/subscribe">
              <Button size="lg" className="shadow-glow-primary h-12 px-8 rounded-xl font-semibold">Daftar Sekarang</Button>
            </Link>
          </div>
        </section>

        <footer className="border-t border-border/30 bg-muted/20 px-6 py-8">
          <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} WORKA. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  );
}

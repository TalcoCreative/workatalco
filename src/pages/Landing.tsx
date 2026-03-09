import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowRight, CheckCircle2, ChevronDown, Users, Calendar, FileText,
  Briefcase, Monitor, Zap, Shield, Globe, Star, Play, Layers,
  Receipt, Video, UserSearch, Sparkles, ArrowUpRight, Minus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";

// Static fallbacks
import screenshotDashboardFallback from "@/assets/screenshot-dashboard.jpg";
import screenshotMobileFallback from "@/assets/screenshot-mobile.jpg";
import screenshotHRFallback from "@/assets/screenshot-hr.jpg";
import screenshotScheduleFallback from "@/assets/screenshot-schedule.jpg";
import screenshotFinanceFallback from "@/assets/screenshot-finance.jpg";

const STATIC_FALLBACKS: Record<string, string> = {
  "screenshot-dashboard": screenshotDashboardFallback,
  "screenshot-mobile": screenshotMobileFallback,
  "screenshot-hr": screenshotHRFallback,
  "screenshot-schedule": screenshotScheduleFallback,
  "screenshot-finance": screenshotFinanceFallback,
};

/* ─── Fallback Data ─── */
const FEATURES_FALLBACK = [
  { icon: "Briefcase", title: "Project & Task Management", desc: "Kanban board, timeline, deadline tracking, dan resource allocation untuk seluruh project tim kreatif Anda." },
  { icon: "Users", title: "HR & Team Analytics", desc: "Attendance, cuti, performa karyawan, dan workforce analytics. Dirancang khusus untuk tim agensi." },
  { icon: "Calendar", title: "Social Media & Editorial", desc: "Editorial planning, content calendar, dan social media management untuk creative agency." },
  { icon: "Receipt", title: "Finance & Recording", desc: "Pencatatan income, expense, payroll, reimbursement, dan laporan keuangan terintegrasi." },
  { icon: "Monitor", title: "Executive Dashboard", desc: "Overview level CEO dengan KPI, revenue tracking, dan performa tim real-time." },
  { icon: "FileText", title: "Client Hub & CRM", desc: "Kelola klien, kontrak, kuota, pembayaran, dan shared dashboard terorganisir." },
  { icon: "Video", title: "Shooting & Event", desc: "Jadwalkan shooting dan event. Track crew, vendor, checklist, dan dokumen." },
  { icon: "UserSearch", title: "Recruitment System", desc: "Pipeline rekrutmen dari lamaran hingga onboarding, form builder, dan assessment." },
  { icon: "Sparkles", title: "AI Content Builder", desc: "Generate caption, artikel, dan copy kreatif secara instan dengan AI." },
];

const SCREENSHOTS_FALLBACK = [
  { title: "Dashboard & Projects", imgKey: "screenshot-dashboard", desc: "Real-time KPIs, project tracking, dan kanban board untuk mengelola seluruh workflow tim.", tag: "Core" },
  { title: "Schedule & Calendar", imgKey: "screenshot-schedule", desc: "Unified calendar dengan tasks, meetings, shootings, dan events dalam satu tampilan.", tag: "Planning" },
  { title: "HR & People Analytics", imgKey: "screenshot-hr", desc: "Dashboard attendance, leave management, performa tim, dan workforce statistics.", tag: "HR" },
  { title: "Finance Center", imgKey: "screenshot-finance", desc: "Pencatatan income, expense, payroll, dan laporan keuangan untuk bisnis Anda.", tag: "Finance" },
];

const TESTIMONIALS_FALLBACK = [
  { name: "Andi Pratama", role: "CEO, Studio Kreatif", text: "Akhirnya satu tool yang bisa handle semua dari project tracking sampai payroll. Produktivitas tim naik 40%.", avatar: "A" },
  { name: "Sarah Chen", role: "COO, MediaHaus", text: "Fitur editorial planning dan client hub-nya game changer banget untuk content agency kami.", avatar: "S" },
  { name: "Budi Santoso", role: "Founder, PixelCraft", text: "Pindah dari 5 tools berbeda ke WORKA menghemat jam kerja kami setiap minggu.", avatar: "B" },
];

const FAQS_FALLBACK = [
  { q: "Berapa lama free trial-nya?", a: "Setiap workspace baru mendapat 14 hari free trial dengan maksimal 3 user. Tanpa kartu kredit." },
  { q: "Bisa upgrade atau downgrade kapan saja?", a: "Ya, Anda bisa mengubah tier subscription kapan saja. Perubahan langsung berlaku." },
  { q: "Apakah data saya aman?", a: "Tentu. Kami menggunakan enkripsi enterprise-grade, row-level security, dan isolasi data antar workspace." },
  { q: "Bagaimana sistem billing-nya?", a: "Billing per-user per-bulan dalam Rupiah (IDR). Anda hanya membayar untuk user aktif." },
  { q: "Cocok untuk agensi kreatif?", a: "WORKA dirancang khusus untuk creative agency, production house, dan perusahaan jasa kreatif." },
  { q: "Apakah support pembayaran lokal?", a: "Ya, kami mendukung payment gateway Indonesia untuk transaksi Rupiah yang seamless." },
];

const ICON_MAP: Record<string, any> = {
  Briefcase, Users, Calendar, Receipt, Monitor, FileText, Video, UserSearch, Sparkles,
  Globe, Shield, Layers, Star, Zap, Play, ArrowRight,
};

const formatRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const formatShort = (n: number) => {
  if (n >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `Rp${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return `Rp${n}`;
};

/* ─── Hooks ─── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handler = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? window.scrollY / h : 0);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return progress;
}

function useParallax(speed = 0.3) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const handler = () => setOffset(window.scrollY * speed);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [speed]);
  return offset;
}

/* ─── Components ─── */
function AnimateIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-[900ms] ease-out ${inView ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-12 blur-[2px]'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView();
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─── Main ─── */
export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [userCounts, setUserCounts] = useState<Record<number, number>>({});
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [session, setSession] = useState<Session | null>(null);
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const scrollProgress = useScrollProgress();
  const heroParallax = useParallax(0.15);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setActiveScreenshot(p => (p + 1) % PRODUCT_SCREENSHOTS.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: (e.clientX / window.innerWidth - 0.5) * 20, y: (e.clientY / window.innerHeight - 0.5) * 20 });
  }, []);

  const { data: blogPosts = [] } = useQuery({
    queryKey: ["landing-blog-posts"],
    queryFn: async () => {
      const { data } = await supabase.from("blog_posts").select("id, title, slug, cover_image, author, published_at, content").eq("is_published", true).order("published_at", { ascending: false }).limit(3);
      return data || [];
    },
  });

  const { data: landingImages = [] } = useQuery({
    queryKey: ["landing-images-public"],
    queryFn: async () => {
      const { data } = await supabase.from("landing_images").select("image_key, image_url");
      return data || [];
    },
  });

  const { data: pricingProducts = [] } = useQuery({
    queryKey: ["landing-pricing-products"],
    queryFn: async () => {
      const { data } = await supabase.from("subscription_products").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: landingContent = [] } = useQuery({
    queryKey: ["landing-content-public"],
    queryFn: async () => {
      const { data } = await supabase.from("landing_content").select("section, content");
      return data || [];
    },
  });

  const getContent = (section: string): any => {
    const found = landingContent.find((c: any) => c.section === section);
    return found?.content || {};
  };

  const googleVerification = (() => {
    const found = landingContent.find((c: any) => c.section === "google_site_verification");
    return typeof found?.content === "string" ? found.content : "";
  })();

  // Derived dynamic content with fallbacks
  const heroContent = getContent("hero");
  const trustContent = getContent("trust_bar");
  const featuresContent = getContent("features");
  const showcaseContent = getContent("product_showcase");
  const howContent = getContent("how_it_works");
  const pricingContent = getContent("pricing");
  const testimonialsContent = getContent("testimonials");
  const whyContent = getContent("why_worka");
  const faqContent = getContent("faq");
  const ctaContent = getContent("final_cta");
  const footerContent = getContent("footer");

  const FEATURES = (featuresContent.items || FEATURES_FALLBACK).map((f: any) => ({
    ...f,
    icon: ICON_MAP[f.icon] || Star,
  }));
  const PRODUCT_SCREENSHOTS = showcaseContent.screenshots || SCREENSHOTS_FALLBACK;
  const TESTIMONIALS = testimonialsContent.items || TESTIMONIALS_FALLBACK;
  const FAQS = faqContent.items || FAQS_FALLBACK;

  const getImg = (key: string) => {
    const found = landingImages.find((img: any) => img.image_key === key);
    return (found?.image_url && !found.image_url.startsWith("/assets")) ? found.image_url : STATIC_FALLBACKS[key] || "";
  };

  // Demo submit removed — now on /request-demo page

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden" onMouseMove={handleMouseMove}>
      {googleVerification && (
        <Helmet>
          <meta name="google-site-verification" content={googleVerification} />
        </Helmet>
      )}

      {/* ══ SCROLL PROGRESS BAR ══ */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[2px]">
        <div className="h-full bg-gradient-to-r from-primary via-primary to-primary/60 transition-none" style={{ width: `${scrollProgress * 100}%` }} />
      </div>

      {/* ══ NAV ══ */}
      <nav className="sticky top-0 z-50 border-b border-border/20 bg-background/70 backdrop-blur-2xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-extrabold text-sm shadow-glow-primary transition-transform duration-300 group-hover:scale-110">W</div>
            <span className="text-xl font-extrabold tracking-tight text-foreground">WORKA</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {[
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "Blog", href: "/blog" },
              { label: "FAQ", href: "#faq" },
            ].map(l =>
              l.href.startsWith("/")
                ? <Link key={l.href} to={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">{l.label}</Link>
                : <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">{l.label}</a>
            )}
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <Link to="/"><Button size="sm" className="shadow-glow-primary rounded-xl font-semibold">Dashboard</Button></Link>
                <Button variant="ghost" size="sm" className="font-medium text-muted-foreground" onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}>Logout</Button>
              </>
            ) : (
              <>
                <Link to="/auth"><Button variant="ghost" size="sm" className="font-medium hidden sm:inline-flex">Login</Button></Link>
                <Link to="/signup"><Button size="sm" className="shadow-glow-primary rounded-xl font-semibold">Free Trial</Button></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section className="relative overflow-hidden px-6 pt-16 pb-4 md:pt-28 md:pb-8">
        {/* Animated gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-primary/8 blur-[150px] animate-pulse-soft" />
          <div className="absolute top-20 -left-40 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px]" style={{ transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)` }} />
          <div className="absolute top-40 -right-40 w-[350px] h-[350px] rounded-full bg-violet-500/5 blur-[100px]" style={{ transform: `translate(${mousePos.x * -0.3}px, ${mousePos.y * -0.3}px)` }} />
        </div>

        <div className="relative mx-auto max-w-5xl text-center" style={{ transform: `translateY(${heroParallax * -0.5}px)` }}>
          <AnimateIn>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5 text-sm text-primary font-semibold backdrop-blur-xl">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              {heroContent.badge_text || "14 Hari Free Trial — Tanpa Kartu Kredit"}
            </div>
          </AnimateIn>

          <AnimateIn delay={120}>
            <h1 className="mb-6 text-[2.75rem] font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-6xl md:text-[5rem]">
              {heroContent.title_line1 || "Satu Platform untuk"}
              <br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-primary/90 to-primary/60 bg-clip-text text-transparent">
                  {heroContent.title_line2 || "Tim Kreatif Modern"}
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none"><path d="M2 8C50 2 100 2 150 6C200 10 250 4 298 7" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" opacity="0.3" /></svg>
              </span>
            </h1>
          </AnimateIn>

          <AnimateIn delay={240}>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed"
               dangerouslySetInnerHTML={{ __html: heroContent.subtitle || "Kelola Projects, HR, Content, Clients, dan Finance dalam satu workspace. Dirancang khusus untuk <strong class='text-foreground font-semibold'>creative agency</strong> dan perusahaan jasa." }}
            />
          </AnimateIn>

          <AnimateIn delay={360}>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/signup">
                <Button size="lg" className="gap-2 px-10 shadow-glow-primary text-base h-14 rounded-2xl font-bold group">
                  {heroContent.cta_primary || "Mulai Free Trial"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/request-demo">
                <Button size="lg" variant="outline" className="gap-2 px-8 text-base h-14 rounded-2xl font-semibold border-border/50 hover:bg-card hover:shadow-soft-lg transition-all">
                  <Play className="h-4 w-4" /> {heroContent.cta_secondary || "Request Demo"}
                </Button>
              </Link>
            </div>
          </AnimateIn>

          {/* Stats bar */}
          <AnimateIn delay={480}>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-14 text-center">
              {(heroContent.stats || [
                { value: 200, suffix: "+", label: "Tim Aktif" },
                { value: 50, suffix: "K+", label: "Tasks Dikelola" },
                { value: 99, suffix: "%", label: "Uptime" },
              ]).map((s: any, i: number) => (
                <div key={i}>
                  <div className="text-2xl md:text-3xl font-extrabold text-foreground"><CountUp target={s.value} suffix={s.suffix} /></div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </AnimateIn>
        </div>

        {/* Hero Screenshot — 3D perspective mockup */}
        <AnimateIn delay={600} className="mt-16 md:mt-20">
          <div className="mx-auto max-w-6xl perspective-[2000px]">
            <div
              className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-border/30 shadow-soft-xl bg-card/80 backdrop-blur-sm transition-transform duration-700 ease-out"
              style={{ transform: `rotateX(${2 - scrollProgress * 8}deg) rotateY(${mousePos.x * 0.05}deg)` }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border/15 bg-muted/20">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[hsl(0_62%_54%/0.7)]" />
                  <div className="w-3 h-3 rounded-full bg-[hsl(38_82%_52%/0.7)]" />
                  <div className="w-3 h-3 rounded-full bg-[hsl(152_48%_46%/0.7)]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-6 py-1.5 rounded-lg bg-muted/40 text-[11px] text-muted-foreground font-mono flex items-center gap-2">
                    <Shield className="h-3 w-3 text-success" /> app.worka.id
                  </div>
                </div>
              </div>
              <img src={getImg("screenshot-dashboard")} alt="WORKA Dashboard" className="w-full h-auto" loading="eager" />

              {/* Floating glow overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </AnimateIn>
      </section>

      {/* ══ TRUST BAR ══ */}
      <section className="px-6 py-14 border-y border-border/15">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground/50 mb-8">{trustContent.title || "Dipercaya oleh Agensi Kreatif di Indonesia"}</p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-20">
            {(trustContent.companies || ["StudioKreatif", "MediaHaus", "PixelCraft", "NusaDigital", "KreasiLab"]).map((n: string) => (
              <div key={n} className="text-xl font-bold text-foreground tracking-tight">{n}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES — Bento Grid ══ */}
      <section id="features" className="px-6 py-28 md:py-36">
        <div className="mx-auto max-w-6xl">
          <AnimateIn className="mb-20 text-center">
            <Badge variant="outline" className="mb-5 text-primary border-primary/30 bg-primary/5 text-xs font-bold tracking-wider uppercase">{featuresContent.badge || "Features"}</Badge>
            <h2 className="mb-5 text-3xl font-extrabold text-foreground md:text-[3.25rem] leading-tight tracking-tight">
              {(featuresContent.title || "Semua yang Tim Anda Butuhkan").replace(featuresContent.title_highlight || "Butuhkan", "|||").split("|||").map((part: string, idx: number) => idx === 0 ? part : <><span key={idx} className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{featuresContent.title_highlight || "Butuhkan"}</span>{part}</>)}
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground text-lg">{featuresContent.subtitle || "Satu platform untuk menjalankan seluruh operasional — dari project hingga payroll."}</p>
          </AnimateIn>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <AnimateIn key={i} delay={i * 70}>
                <Card className="group relative overflow-hidden border-border/20 bg-card/70 backdrop-blur-sm transition-all duration-500 hover:shadow-soft-xl hover:-translate-y-2 hover:border-primary/15 h-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="relative p-7">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-glow-primary group-hover:scale-110 group-hover:rotate-3">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRODUCT SHOWCASE — Cinematic ══ */}
      <section className="relative px-6 py-28 md:py-36 bg-gradient-to-b from-muted/30 via-muted/10 to-background overflow-hidden">
        {/* Ambient bg */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_60%,hsl(var(--primary)/0.06),transparent)]" />

        <div className="relative mx-auto max-w-7xl">
          <AnimateIn className="mb-16 text-center">
            <Badge variant="outline" className="mb-5 text-primary border-primary/30 bg-primary/5 text-xs font-bold tracking-wider uppercase">{showcaseContent.badge || "Product"}</Badge>
            <h2 className="mb-5 text-3xl font-extrabold text-foreground md:text-[3.25rem] leading-tight tracking-tight">
              {(showcaseContent.title || "Interface yang Powerful").replace(showcaseContent.title_highlight || "Powerful", "|||").split("|||").map((part: string, idx: number) => idx === 0 ? part : <><span key={idx} className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{showcaseContent.title_highlight || "Powerful"}</span>{part}</>)}
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground text-lg">{showcaseContent.subtitle || "Desain modern yang dirancang untuk produktivitas maksimal."}</p>
          </AnimateIn>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {PRODUCT_SCREENSHOTS.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveScreenshot(i)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  i === activeScreenshot
                    ? 'bg-primary text-primary-foreground shadow-glow-primary'
                    : 'bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground border border-border/20'
                }`}
              >
                {s.tag} — {s.title}
              </button>
            ))}
          </div>

          {/* Main showcase */}
          <AnimateIn>
            <div className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-border/20 shadow-soft-xl bg-card/50 backdrop-blur-sm">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border/15 bg-muted/20">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[hsl(0_62%_54%/0.5)]" />
                  <div className="w-3 h-3 rounded-full bg-[hsl(38_82%_52%/0.5)]" />
                  <div className="w-3 h-3 rounded-full bg-[hsl(152_48%_46%/0.5)]" />
                </div>
              </div>
              <div className="relative">
                {PRODUCT_SCREENSHOTS.map((s, i) => (
                  <img
                    key={i}
                    src={getImg(s.imgKey)}
                    alt={s.title}
                    className={`w-full h-auto transition-all duration-700 ${i === activeScreenshot ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                ))}
              </div>
              {/* Gradient overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent p-6 md:p-10">
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-1">{PRODUCT_SCREENSHOTS[activeScreenshot].title}</h3>
                <p className="text-sm text-muted-foreground max-w-lg">{PRODUCT_SCREENSHOTS[activeScreenshot].desc}</p>
              </div>
            </div>
          </AnimateIn>

          {/* Mobile floating mockup */}
          <AnimateIn delay={300} className="mt-20 flex justify-center">
            <div className="relative group">
              <div className="w-[240px] md:w-[280px] rounded-[2.5rem] border-[8px] border-foreground/8 overflow-hidden shadow-soft-xl bg-card transition-transform duration-700 group-hover:scale-105">
                <img src={getImg("screenshot-mobile")} alt="WORKA Mobile" className="w-full h-auto" loading="lazy" />
              </div>
              {/* Floating badge */}
              <div className="absolute -right-12 md:-right-20 top-8 bg-card/90 backdrop-blur-xl border border-border/20 rounded-2xl px-5 py-3 shadow-soft-lg hidden sm:block animate-float">
                <p className="text-xs font-bold text-primary flex items-center gap-1.5"><Zap className="h-3 w-3" /> Mobile Ready</p>
                <p className="text-[10px] text-muted-foreground">Full-featured on any device</p>
              </div>
              <div className="absolute -left-12 md:-left-20 bottom-16 bg-card/90 backdrop-blur-xl border border-border/20 rounded-2xl px-5 py-3 shadow-soft-lg hidden sm:block animate-float" style={{ animationDelay: '1.5s' }}>
                <p className="text-xs font-bold text-foreground">Offline-capable</p>
                <p className="text-[10px] text-muted-foreground">Sync when connected</p>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="px-6 py-28 md:py-36">
        <div className="mx-auto max-w-5xl">
          <AnimateIn className="mb-20 text-center">
            <h2 className="mb-5 text-3xl font-extrabold text-foreground md:text-[3.25rem] leading-tight tracking-tight">
              {(howContent.title || "Mulai dalam Hitungan Menit").replace(howContent.title_highlight || "Hitungan Menit", "|||").split("|||").map((part: string, idx: number) => idx === 0 ? part : <><span key={idx} className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{howContent.title_highlight || "Hitungan Menit"}</span>{part}</>)}
            </h2>
            <p className="text-muted-foreground text-lg">{howContent.subtitle || "Empat langkah untuk mentransformasi operasi bisnis Anda."}</p>
          </AnimateIn>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(howContent.steps || [
              { step: "01", title: "Daftar Akun", desc: "Buat workspace perusahaan dalam hitungan detik." },
              { step: "02", title: "Setup Workspace", desc: "Konfigurasi branding, roles, dan permission." },
              { step: "03", title: "Undang Tim", desc: "Tambahkan anggota dan atur akses granular." },
              { step: "04", title: "Mulai Bekerja", desc: "Semuanya siap — langsung produktif." },
            ]).map((s: any, i: number) => (
              <AnimateIn key={i} delay={i * 120}>
                <div className="relative text-center group p-6 rounded-2xl border border-border/15 bg-card/40 hover:bg-card/80 hover:shadow-soft-lg transition-all duration-500 h-full">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-2xl font-extrabold text-primary transition-all duration-500 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-glow-primary group-hover:scale-110">
                    {s.step}
                  </div>
                  <h3 className="mb-2 text-base font-bold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" className="relative px-6 py-28 md:py-36 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-muted/30 to-background" />
        <div className="relative mx-auto max-w-6xl">
          <AnimateIn className="mb-20 text-center">
            <Badge variant="outline" className="mb-5 text-primary border-primary/30 bg-primary/5 text-xs font-bold tracking-wider uppercase">{pricingContent.badge || "Pricing"}</Badge>
            <h2 className="mb-5 text-3xl font-extrabold text-foreground md:text-[3.25rem] leading-tight tracking-tight">
              {(pricingContent.title || "Transparan, Tanpa Biaya Tersembunyi").replace(pricingContent.title_highlight || "Tanpa Biaya Tersembunyi", "|||").split("|||").map((part: string, idx: number) => idx === 0 ? part : <><span key={idx} className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{pricingContent.title_highlight || "Tanpa Biaya Tersembunyi"}</span>{part}</>)}
            </h2>
            <p className="text-muted-foreground text-lg">{pricingContent.subtitle || "Bayar per user. Scale sesuai pertumbuhan. Semua dalam IDR."}</p>
          </AnimateIn>

          {/* Free Trial Banner */}
          <AnimateIn className="mb-10">
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <Badge className="mb-2 bg-primary/10 text-primary border-primary/20 font-bold text-[10px] uppercase tracking-wider">Free Trial</Badge>
                <h3 className="text-xl font-bold text-foreground">{pricingContent.free_trial_title || "Coba Gratis 14 Hari — Akses Enterprise"}</h3>
                <p className="text-sm text-muted-foreground mt-1">{pricingContent.free_trial_subtitle || "Akses semua fitur premium tanpa kartu kredit. Maksimal 3 user."}</p>
              </div>
              <Link to="/signup">
                <Button size="lg" className="gap-2 px-8 shadow-glow-primary rounded-2xl font-bold whitespace-nowrap">
                  <Sparkles className="h-4 w-4" /> {pricingContent.free_trial_cta || "Mulai Free Trial"}
                </Button>
              </Link>
            </div>
          </AnimateIn>

          {/* Billing Toggle */}
          <AnimateIn className="flex items-center justify-center gap-3 mb-10">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground shadow-glow-primary"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                billingCycle === "annual"
                  ? "bg-primary text-primary-foreground shadow-glow-primary"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 font-bold">Hemat</Badge>
            </button>
          </AnimateIn>

          <div className="grid gap-6 lg:grid-cols-3 items-start">
            {pricingProducts.map((t: any, i: number) => {
              const users = userCounts[i] ?? (t.default_users || 3);
              const annualMultiplier = t.annual_multiplier || 10;
              const isAnnual = billingCycle === "annual";
              const monthlyPerUser = t.price_per_user;
              const annualPerUser = Math.round((monthlyPerUser * annualMultiplier) / 12);
              const displayPerUser = isAnnual ? annualPerUser : monthlyPerUser;
              const monthlyTotal = monthlyPerUser * users;
              const annualTotalFull = monthlyPerUser * users * 12;
              const annualTotalDiscounted = monthlyPerUser * users * annualMultiplier;
              const features: string[] = Array.isArray(t.features) ? t.features : [];
              const excluded: string[] = Array.isArray(t.not_included) ? t.not_included : [];
              const isPopular = t.is_popular === true;

              return (
                <AnimateIn key={t.id} delay={i * 100}>
                  <Card className={`relative overflow-hidden transition-all duration-500 hover:shadow-soft-xl hover:-translate-y-2 h-full ${
                    isPopular
                      ? "ring-2 ring-primary shadow-glow-primary border-primary/20 bg-card"
                      : "border-border/20 bg-card/70"
                  }`}>
                    {isPopular && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-primary/60" />
                    )}
                    <CardContent className="p-8 md:p-10">
                      {isPopular && (
                        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 font-bold text-[10px] uppercase tracking-wider">Most Popular</Badge>
                      )}
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t.description}</p>
                      <h3 className="mt-2 text-2xl font-extrabold text-foreground">{t.name}</h3>

                      <div className="mt-6 flex items-baseline gap-1">
                        {isAnnual && annualMultiplier < 12 && (
                          <span className="text-lg text-muted-foreground line-through mr-1">{formatShort(monthlyPerUser)}</span>
                        )}
                        {!isAnnual && t.original_price_per_user && t.original_price_per_user > monthlyPerUser && (
                          <span className="text-lg text-muted-foreground line-through mr-1">{formatShort(t.original_price_per_user)}</span>
                        )}
                        <span className="text-5xl font-extrabold text-foreground tracking-tight">{formatShort(displayPerUser)}</span>
                        <span className="text-sm text-muted-foreground">/ user / bulan</span>
                      </div>
                      {isAnnual && annualMultiplier < 12 && (
                        <p className="text-xs text-emerald-500 font-bold mt-1">
                          Bayar {annualMultiplier} bulan untuk 12 bulan — hemat {Math.round(((12 - annualMultiplier) / 12) * 100)}%
                        </p>
                      )}

                      {/* Interactive calculator */}
                      <div className="mt-6 rounded-2xl bg-muted/30 border border-border/15 p-5 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                            <Users className="h-3.5 w-3.5" /> {users} users
                          </span>
                          <div className="text-right">
                            {isAnnual ? (
                              <div>
                                <span className="text-xs text-muted-foreground line-through mr-1.5">{formatRupiah(annualTotalFull)}</span>
                                <span className="font-bold text-foreground text-lg">
                                  {formatRupiah(annualTotalDiscounted)}<span className="text-xs font-normal text-muted-foreground">/thn</span>
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-foreground text-lg">
                                {formatRupiah(monthlyTotal)}<span className="text-xs font-normal text-muted-foreground">/bln</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <Slider value={[users]} onValueChange={(v) => setUserCounts(prev => ({ ...prev, [i]: v[0] }))} min={1} max={t.max_users} step={1} className="w-full" />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                          <span>1 user</span><span>Max {t.max_users}</span>
                        </div>
                      </div>

                      <Link to="/subscribe">
                        <Button className={`mt-7 w-full h-13 rounded-xl font-bold text-sm ${isPopular ? "shadow-glow-primary" : ""}`} variant={isPopular ? "default" : "outline"} size="lg">
                          Pilih {t.name} <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>

                      <ul className="mt-8 space-y-3">
                        {features.map((f: string, fi: number) => (
                          <li key={fi} className="flex items-start gap-2.5 text-sm text-foreground">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                          </li>
                        ))}
                        {excluded.map((f: string, fi: number) => (
                          <li key={fi} className="flex items-start gap-2.5 text-sm text-muted-foreground/30">
                            <Minus className="mt-0.5 h-4 w-4 shrink-0 opacity-40" /> <span className="line-through">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </AnimateIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section className="px-6 py-28 md:py-36">
        <div className="mx-auto max-w-5xl">
          <AnimateIn className="mb-16 text-center">
            <h2 className="mb-5 text-3xl font-extrabold text-foreground md:text-[3.25rem] leading-tight tracking-tight">
              {(testimonialsContent.title || "Kata Mereka tentang WORKA").replace(testimonialsContent.title_highlight || "WORKA", "|||").split("|||").map((part: string, idx: number) => idx === 0 ? part : <><span key={idx} className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{testimonialsContent.title_highlight || "WORKA"}</span>{part}</>)}
            </h2>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <AnimateIn key={i} delay={i * 100}>
                <Card className="border-border/15 bg-card/70 h-full hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-500 group">
                  <CardContent className="p-8">
                    <div className="mb-5 flex gap-1">
                      {[1,2,3,4,5].map(s => <Star key={s} className="h-4 w-4 fill-warning text-warning" />)}
                    </div>
                    <p className="mb-8 text-foreground leading-relaxed">"{t.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{t.avatar}</div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BLOG ══ */}
      {blogPosts.length > 0 && (
        <section className="px-6 py-24 bg-gradient-to-b from-muted/20 to-background">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5 text-xs font-bold tracking-wider uppercase">Blog</Badge>
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Artikel Terbaru</h2>
              </div>
              <Link to="/blog"><Button variant="outline" className="gap-2 rounded-xl font-semibold hidden sm:flex">Lihat Semua <ArrowUpRight className="h-4 w-4" /></Button></Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {blogPosts.map((post: any) => (
                <Link key={post.id} to={`/blog/${post.slug}`}>
                  <Card className="border-border/15 overflow-hidden group hover:shadow-soft-xl transition-all duration-500 hover:-translate-y-2 h-full">
                    {post.cover_image ? (
                      <div className="h-48 overflow-hidden">
                        <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <span className="text-5xl font-bold text-primary/15">W</span>
                      </div>
                    )}
                    <CardContent className="p-6">
                      <h3 className="font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h3>
                      <p className="text-xs text-muted-foreground mt-3">
                        {post.author} {post.published_at && `• ${format(parseISO(post.published_at), "dd MMM yyyy")}`}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ WHY WORKA ══ */}
      <section className="px-6 py-28 md:py-36">
        <div className="mx-auto max-w-5xl">
          <AnimateIn className="mb-16 text-center">
            <h2 className="mb-5 text-3xl font-extrabold text-foreground md:text-[3.25rem] leading-tight tracking-tight">
              {(whyContent.title || "Kenapa Tim Anda Butuh WORKA?").replace(whyContent.title_highlight || "WORKA?", "|||").split("|||").map((part: string, idx: number) => idx === 0 ? part : <><span key={idx} className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{whyContent.title_highlight || "WORKA?"}</span>{part}</>)}
            </h2>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-3">
            {(whyContent.items || [
              { title: "Tools Berantakan?", desc: "Berhenti pindah antara Trello, Sheets, WhatsApp group, dan spreadsheet. Sentralisasi semuanya." },
              { title: "Komunikasi Hilang?", desc: "Tidak ada lagi brief hilang, deadline terlewat, atau feedback client terlupakan." },
              { title: "HR Manual?", desc: "Otomatisasi absensi, cuti, performance review, dan rekap payroll secara real-time." },
            ]).map((p: any, i: number) => {
              const WhyIcon = [Layers, Globe, Shield][i] || Layers;
              return (
              <AnimateIn key={i} delay={i * 100}>
                <Card className="border-border/15 bg-card/70 h-full group hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-500">
                  <CardContent className="p-8 text-center">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/8 text-destructive transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                      <WhyIcon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-3 font-bold text-foreground text-lg">{p.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  </CardContent>
                </Card>
              </AnimateIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section id="faq" className="px-6 py-28 md:py-36 bg-gradient-to-b from-muted/20 to-background">
        <div className="mx-auto max-w-3xl">
          <AnimateIn className="mb-16 text-center">
            <h2 className="mb-5 text-3xl font-extrabold text-foreground md:text-[3.25rem] leading-tight tracking-tight">{faqContent.title || "Pertanyaan Umum"}</h2>
          </AnimateIn>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <AnimateIn key={i} delay={i * 50}>
                <div
                  className={`rounded-2xl border transition-all duration-300 cursor-pointer ${
                    openFaq === i ? 'border-primary/20 bg-card shadow-soft-lg' : 'border-border/15 bg-card/60 hover:bg-card/80 hover:shadow-soft'
                  }`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <div className="flex items-center justify-between p-6">
                    <h3 className="font-semibold text-foreground pr-4">{f.q}</h3>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </div>
                  <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 pb-6' : 'max-h-0'}`}>
                    <p className="px-6 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section className="px-6 py-28 md:py-36 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,hsl(var(--primary)/0.08),transparent)]" />
        <AnimateIn className="relative mx-auto max-w-3xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm text-primary font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> {ctaContent.badge || "Ready to transform your agency?"}
          </div>
          <h2 className="mb-6 text-3xl font-extrabold text-foreground md:text-[3.25rem] leading-tight tracking-tight">
            {(ctaContent.title || "Mulai Kelola Bisnis Anda Sekarang").replace(ctaContent.title_highlight || "Sekarang", "|||").split("|||").map((part: string, idx: number) => idx === 0 ? part : <><span key={idx} className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{ctaContent.title_highlight || "Sekarang"}</span>{part}</>)}
          </h2>
          <p className="mb-10 text-lg text-muted-foreground">{ctaContent.subtitle || "Setup dalam 2 menit. 14 hari free trial. Tanpa kartu kredit."}</p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/subscribe">
              <Button size="lg" className="gap-2 px-10 shadow-glow-primary text-base h-14 rounded-2xl font-bold group">
                {ctaContent.cta_primary || "Daftar Sekarang"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/request-demo">
              <Button size="lg" variant="outline" className="gap-2 px-8 text-base h-14 rounded-2xl font-semibold border-border/40">
                <Play className="h-4 w-4" /> {ctaContent.cta_secondary || "Request Demo"}
              </Button>
            </Link>
          </div>
        </AnimateIn>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="border-t border-border/15 bg-muted/10 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-glow-primary">W</div>
                <span className="font-extrabold text-foreground text-lg">WORKA</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                {footerContent.description || "Platform all-in-one untuk mengelola operasional creative agency dan perusahaan jasa modern."}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-4 text-xs uppercase tracking-[0.15em]">Product</h4>
              <div className="space-y-3">
                {(footerContent.product_links || [
                  { label: "Features", href: "#features" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "Blog", href: "/blog" },
                ]).map((link: any, i: number) =>
                  link.href.startsWith("/")
                    ? <Link key={i} to={link.href} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
                    : <a key={i} href={link.href} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</a>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-4 text-xs uppercase tracking-[0.15em]">Legal</h4>
              <div className="space-y-3">
                {(footerContent.legal_links || [
                  { label: "Privacy Policy", href: "/privacy-policy" },
                  { label: "FAQ", href: "#faq" },
                ]).map((link: any, i: number) =>
                  link.href.startsWith("/")
                    ? <Link key={i} to={link.href} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
                    : <a key={i} href={link.href} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</a>
                )}
              </div>
            </div>
          </div>
          <div className="mt-14 pt-8 border-t border-border/10 text-center">
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} WORKA. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

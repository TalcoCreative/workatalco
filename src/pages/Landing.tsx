import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, Check, Layers, Shield, TrendingUp,
  ChevronDown, Play,
} from "lucide-react";

import heroMockup from "@/assets/hero-mockup.jpg";
import featureTasks from "@/assets/feature-tasks.jpg";
import featureTeams from "@/assets/feature-teams.jpg";
import featureWorkspaces from "@/assets/feature-workspaces.jpg";
import featureClients from "@/assets/feature-clients.jpg";
import ScrollMorphHero from "@/components/ui/scroll-morph-hero";
import FeaturedShowcase from "@/components/ui/featured-showcase";

/* ─── Intersection Observer Hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── Fade-in wrapper ─── */
function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Pricing helpers ─── */
const formatRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

/* ─── Main ─── */
export default function Landing() {
  const [session, setSession] = useState<Session | null>(null);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) { setCompanySlug(null); return; }
    supabase
      .from("company_members")
      .select("company_id, companies(slug)")
      .eq("user_id", session.user.id)
      .limit(1)
      .then(({ data }) => {
        const slug = (data?.[0] as any)?.companies?.slug;
        if (slug) setCompanySlug(slug);
      });
  }, [session?.user?.id]);

  const { data: pricingProducts = [] } = useQuery({
    queryKey: ["landing-pricing"],
    queryFn: async () => {
      const { data } = await supabase.from("subscription_products").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: scrollHeroContent } = useQuery({
    queryKey: ["landing-content", "scroll_morph_hero"],
    queryFn: async () => {
      const { data } = await supabase
        .from("landing_content")
        .select("content")
        .eq("section", "scroll_morph_hero")
        .maybeSingle();
      return (data?.content as any) || null;
    },
  });

  const { data: showcaseContent } = useQuery({
    queryKey: ["landing-content", "featured_showcase"],
    queryFn: async () => {
      const { data } = await supabase
        .from("landing_content")
        .select("content")
        .eq("section", "featured_showcase")
        .maybeSingle();
      return (data?.content as any) || null;
    },
  });

  const { data: faqContent } = useQuery({
    queryKey: ["landing-content", "faq"],
    queryFn: async () => {
      const { data } = await supabase
        .from("landing_content")
        .select("content")
        .eq("section", "faq")
        .maybeSingle();
      return (data?.content as any) || null;
    },
  });

  const { data: ctaContent } = useQuery({
    queryKey: ["landing-content", "final_cta"],
    queryFn: async () => {
      const { data } = await supabase
        .from("landing_content")
        .select("content")
        .eq("section", "final_cta")
        .maybeSingle();
      return (data?.content as any) || null;
    },
  });

  const FAQS = (faqContent?.items as Array<{q:string;a:string}>) || [
    { q: "How long is the free trial?", a: "Every new workspace gets 14 days free trial with up to 3 users. No credit card required." },
    { q: "Can I manage multiple companies?", a: "Yes. Each company gets its own isolated workspace with separate data, teams, and settings." },
    { q: "Is my data secure?", a: "Absolutely. We use enterprise-grade encryption, row-level security, and full data isolation between workspaces." },
    { q: "How does billing work?", a: "Billing is per-user per-month in IDR. You only pay for active users." },
    { q: "Can I upgrade or downgrade anytime?", a: "Yes. Changes take effect immediately with no lock-in contracts." },
  ];

  const FEATURES = [
    { title: "Tasks, organized.", sub: "Assign, track, and manage everything clearly.", img: featureTasks },
    { title: "Teams, aligned.", sub: "Attendance, performance, and people analytics in one view.", img: featureTeams },
    { title: "Companies, separated.", sub: "Each company gets its own isolated workspace.", img: featureWorkspaces },
    { title: "Clients, structured.", sub: "Contracts, payments, quotas, and dashboards per client.", img: featureClients },
  ];

  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden">
      <Helmet>
        <title>Worka — Run multiple companies without the chaos</title>
        <meta name="description" content="Manage clients, teams, and tasks in one place with fully isolated workspaces. The premium operating system for modern businesses." />
      </Helmet>

      {/* ═══ NAV ═══ */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-14">
          <Link to="/landing" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-white font-bold text-sm">W</div>
            <span className="text-lg font-bold tracking-tight">Worka</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "FAQ", href: "#faq" },
              { label: "Blog", href: "/blog" },
            ].map(l =>
              l.href.startsWith("/")
                ? <Link key={l.href} to={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
                : <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</a>
            )}
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <Link to={companySlug ? `/${companySlug}` : "/auth"}>
                <Button size="sm" className="rounded-full px-5 font-medium">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth"><Button variant="ghost" size="sm" className="hidden sm:inline-flex text-sm">Sign in</Button></Link>
                <Link to="/auth"><Button size="sm" className="rounded-full px-5 font-medium">Start Free</Button></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ SECTION 1: HERO ═══ */}
      {scrollHeroContent?.enabled !== false && (
        <section className="relative">
          <ScrollMorphHero
            introTitle={scrollHeroContent?.intro_title}
            introHint={scrollHeroContent?.intro_hint}
            title={scrollHeroContent?.title}
            subtitle={scrollHeroContent?.subtitle}
            icons={scrollHeroContent?.icons}
          />
        </section>
      )}

      {/* ═══ SECTION 1.5: FEATURED SHOWCASE (CMS) ═══ */}
      {showcaseContent?.enabled !== false && (showcaseContent?.tabs?.length ?? 0) > 0 && (
        <FadeIn>
          <FeaturedShowcase
            title={showcaseContent?.title}
            subtitle={showcaseContent?.subtitle}
            tabs={showcaseContent?.tabs || []}
          />
        </FadeIn>
      )}

      {/* ═══ SECTION 1b: CLASSIC HERO ═══ */}
      <section className="relative px-6 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn>
            <h1 className="text-4xl sm:text-5xl md:text-[3.75rem] font-bold leading-[1.1] tracking-tight text-foreground">
              Run multiple companies.
              <br />
              <span className="text-muted-foreground">Without the chaos.</span>
            </h1>
          </FadeIn>
          <FadeIn delay={100}>
            <p className="mt-6 mx-auto max-w-xl text-lg text-muted-foreground leading-relaxed">
              Manage clients, teams, and tasks in one place — with fully isolated workspaces.
            </p>
          </FadeIn>
          <FadeIn delay={200}>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="rounded-full px-8 h-12 text-base font-semibold">
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/request-demo">
                <Button variant="outline" size="lg" className="rounded-full px-8 h-12 text-base font-medium gap-2">
                  <Play className="h-4 w-4" />
                  Watch Demo
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
        {/* Hero Mockup */}
        <FadeIn delay={400} className="mt-16 md:mt-20 mx-auto max-w-5xl">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/10 border border-border/20">
            <img src={heroMockup} alt="Worka Dashboard" className="w-full" width={1440} height={900} />
          </div>
        </FadeIn>
      </section>

      {/* ═══ SECTION 2: PROBLEM ═══ */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-foreground">
              Too many clients.
            </p>
          </FadeIn>
          <FadeIn delay={150}>
            <p className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-muted-foreground/60">
              Too many tools.
            </p>
          </FadeIn>
          <FadeIn delay={300}>
            <p className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-muted-foreground/30">
              Too much confusion.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ═══ SECTION 3: SHIFT ═══ */}
      <section className="px-6 py-24 md:py-32 bg-foreground text-white">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-snug opacity-60">
              You don't need more tools.
            </p>
          </FadeIn>
          <FadeIn delay={150}>
            <p className="mt-6 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
              You need one system.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ═══ SECTION 4: PRODUCT INTRO ═══ */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">Introducing</p>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">Meet Worka.</h2>
            <p className="mt-4 text-xl text-muted-foreground">One workspace per company. Everything stays organized.</p>
          </FadeIn>
        </div>
      </section>

      {/* ═══ SECTION 5: FEATURES ═══ */}
      <section id="features" className="px-6 pb-16">
        <div className="mx-auto max-w-6xl space-y-24 md:space-y-32">
          {FEATURES.map((f, i) => (
            <FadeIn key={i}>
              <div className={`flex flex-col gap-10 md:gap-16 items-center ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"}`}>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-3xl sm:text-4xl font-bold tracking-tight">{f.title}</h3>
                  <p className="mt-3 text-lg text-muted-foreground">{f.sub}</p>
                </div>
                <div className="flex-1">
                  <div className="rounded-2xl overflow-hidden shadow-xl shadow-black/8 border border-border/20">
                    <img src={f.img} alt={f.title} className="w-full" loading="lazy" width={1200} height={800} />
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ═══ SECTION 6: SYSTEM VIEW ═══ */}
      <section className="px-6 py-24 md:py-32 bg-muted/40">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Everything, in sync.</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Tasks, schedules, finances, HR, clients, and content — all connected in one unified system. No more switching tabs.
            </p>
          </FadeIn>
          <FadeIn delay={200}>
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                "Project Management", "HR & Attendance", "Finance & Payroll", "Client CRM",
                "Content Calendar", "Recruitment", "Asset Tracking", "Analytics",
              ].map((label, i) => (
                <div key={i} className="rounded-xl bg-white border border-border/30 p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ SECTION 7: VALUE PROPS ═══ */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <div className="grid md:grid-cols-3 gap-10">
              {[
                { icon: Layers, title: "Isolated Workspaces", desc: "Each company is a separate world — data, teams, and settings never cross." },
                { icon: Shield, title: "All-in-One System", desc: "Replace 5+ tools with one platform. Everything from tasks to payroll." },
                { icon: TrendingUp, title: "Built to Scale", desc: "From solo founders to 100+ person agencies. Worka grows with you." },
              ].map((v, i) => (
                <div key={i} className="text-center md:text-left">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-foreground/5 mb-4">
                    <v.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">{v.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ SECTION 8: PRICING ═══ */}
      <section id="pricing" className="px-6 py-24 md:py-32 bg-muted/40">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, transparent pricing.</h2>
              <p className="mt-3 text-lg text-muted-foreground">Start free. Upgrade when you're ready.</p>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div className="grid md:grid-cols-3 gap-6">
              {(pricingProducts.length > 0 ? pricingProducts : [
                { name: "Starter", price_per_user: 0, max_users: 3, features: ["3 Users", "Core Features", "14-Day Trial"], is_highlighted: false },
                { name: "Pro", price_per_user: 49000, max_users: 25, features: ["Up to 25 Users", "All Features", "Priority Support"], is_highlighted: true },
                { name: "Business", price_per_user: 79000, max_users: 100, features: ["Up to 100 Users", "Custom Roles", "Dedicated Support"], is_highlighted: false },
              ]).map((plan: any, i: number) => {
                const isHighlighted = plan.is_highlighted;
                const features = plan.features || [];
                return (
                  <div
                    key={i}
                    className={`rounded-2xl p-8 transition-shadow ${
                      isHighlighted
                        ? "bg-foreground text-white shadow-2xl shadow-black/20 ring-1 ring-foreground"
                        : "bg-white border border-border/40 shadow-sm hover:shadow-md"
                    }`}
                  >
                    <p className={`text-sm font-semibold uppercase tracking-wider ${isHighlighted ? "text-white/60" : "text-muted-foreground"}`}>
                      {plan.name}
                    </p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {plan.price_per_user === 0 ? "Free" : formatRupiah(plan.price_per_user)}
                      </span>
                      {plan.price_per_user > 0 && (
                        <span className={`text-sm ${isHighlighted ? "text-white/50" : "text-muted-foreground"}`}>/user/mo</span>
                      )}
                    </div>
                    <ul className="mt-8 space-y-3">
                      {(typeof features === "string" ? JSON.parse(features) : features).map((f: string, fi: number) => (
                        <li key={fi} className="flex items-center gap-3 text-sm">
                          <Check className={`h-4 w-4 flex-shrink-0 ${isHighlighted ? "text-white/70" : "text-primary"}`} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/auth" className="block mt-8">
                      <Button
                        className={`w-full rounded-full h-11 font-medium ${
                          isHighlighted
                            ? "bg-white text-foreground hover:bg-white/90"
                            : ""
                        }`}
                        variant={isHighlighted ? "secondary" : "outline"}
                      >
                        Get Started
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ SECTION 9: STATEMENT ═══ */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Switch company.
              <br />
              <span className="text-muted-foreground">Not tools.</span>
            </h2>
          </FadeIn>
        </div>
      </section>

      {/* ═══ SECTION 10: FAQ ═══ */}
      <section id="faq" className="px-6 py-24 md:py-32 bg-muted/40">
        <div className="mx-auto max-w-2xl">
          <FadeIn>
            <h2 className="text-3xl font-bold text-center mb-3">{faqContent?.title || "Frequently asked questions"}</h2>
            {faqContent?.subtitle && (
              <p className="text-center text-muted-foreground mb-12">{faqContent.subtitle}</p>
            )}
          </FadeIn>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <FadeIn key={i} delay={i * 50}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left rounded-xl bg-white border border-border/30 px-6 py-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-sm">{faq.q}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </div>
                  {openFaq === i && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  )}
                </button>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 11: FINAL CTA ═══ */}
      <section className="px-6 py-24 md:py-32 bg-foreground text-white">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              {ctaContent?.title || "Start your workspace"}
              {ctaContent?.title_highlight && (<><br /><span className="text-white/70">{ctaContent.title_highlight}</span></>)}
              {!ctaContent?.title_highlight && !ctaContent?.title && (<><br />in minutes.</>)}
            </h2>
            <p className="mt-4 text-lg text-white/60">
              {ctaContent?.subtitle || "14-day free trial. No credit card required."}
            </p>
            <div className="mt-10">
              <Link to="/auth">
                <Button size="lg" className="rounded-full px-10 h-12 text-base font-semibold bg-white text-foreground hover:bg-white/90">
                  {ctaContent?.cta_primary || "Try Worka Free"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="px-6 py-12 border-t border-border/20">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-white font-bold text-xs">W</div>
            <span className="font-semibold">Worka</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link to="/request-demo" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Worka. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

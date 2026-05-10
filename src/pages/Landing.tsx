import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

import ScrollMorphHero from "@/components/ui/scroll-morph-hero";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import LandingPricingCard, { LandingPlan } from "@/components/ui/landing-pricing-card";

export default function Landing() {
  const [session, setSession] = useState<Session | null>(null);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
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

  const { data: scrollHeroContent } = useQuery({
    queryKey: ["landing-content", "scroll_morph_hero"],
    queryFn: async () => {
      const { data } = await supabase.from("landing_content").select("content").eq("section", "scroll_morph_hero").maybeSingle();
      return (data?.content as any) || null;
    },
  });

  const { data: scrollAnimContent } = useQuery({
    queryKey: ["landing-content", "scroll_animation"],
    queryFn: async () => {
      const { data } = await supabase.from("landing_content").select("content").eq("section", "scroll_animation").maybeSingle();
      return (data?.content as any) || null;
    },
  });

  const { data: pricingContent } = useQuery({
    queryKey: ["landing-content", "pricing"],
    queryFn: async () => {
      const { data } = await supabase.from("landing_content").select("content").eq("section", "pricing").maybeSingle();
      return (data?.content as any) || null;
    },
  });

  const { data: pricingProducts = [] } = useQuery({
    queryKey: ["landing-pricing"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const plans: LandingPlan[] = (pricingProducts || []).map((p: any) => {
    const monthly = Number(p.price_per_user) || 0;
    const annualMultiplier = Number(p.annual_multiplier) || 10;
    const yearlyEffective = Math.round((monthly * annualMultiplier) / 12);
    const features = Array.isArray(p.features)
      ? p.features
      : (typeof p.features === "string" ? (() => { try { return JSON.parse(p.features); } catch { return []; } })() : []);
    return {
      id: p.id,
      name: p.name,
      description: p.description || undefined,
      monthlyPrice: monthly,
      yearlyPrice: yearlyEffective,
      features,
      defaultUsers: p.default_users || 3,
      maxUsers: p.max_users || 100,
    };
  });

  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden">
      <Helmet>
        <title>Worka — Run multiple companies without the chaos</title>
        <meta name="description" content="Manage clients, teams, and tasks in one place with fully isolated workspaces. The premium operating system for modern businesses." />
      </Helmet>

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-14">
          <Link to="/landing" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-white font-bold text-sm">W</div>
            <span className="text-lg font-bold tracking-tight">Worka</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
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

      {/* SECTION 1: HERO */}
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

      {/* SECTION 2: SCROLL ANIMATION */}
      {scrollAnimContent?.enabled !== false && (
        <section className="relative">
          <ContainerScroll
            titleComponent={
              <>
                <h2 className="text-4xl font-semibold text-foreground">
                  {scrollAnimContent?.title_top || "Unleash the power of"}<br />
                  <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none">
                    {scrollAnimContent?.title_highlight || "Scroll Animations"}
                  </span>
                </h2>
              </>
            }
          >
            <img
              src={scrollAnimContent?.image_url || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=2400&q=80"}
              alt="Worka product"
              className="mx-auto rounded-2xl object-cover h-full w-full object-left-top"
              draggable={false}
            />
          </ContainerScroll>
        </section>
      )}

      {/* SECTION 3: PRICING */}
      <section id="pricing" className="px-6 py-20 md:py-28 bg-muted/40">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {pricingContent?.title || "Simple, transparent pricing."}
            </h2>
            {pricingContent?.subtitle && (
              <p className="mt-3 text-lg text-muted-foreground">{pricingContent.subtitle}</p>
            )}
          </div>
          <LandingPricingCard
            plans={plans}
            title={pricingContent?.card_title || "Pilih Plan Anda"}
            subtitle={pricingContent?.card_subtitle || "Bayar per user, scale sesuai kebutuhan."}
            ctaLabel={pricingContent?.free_trial_cta || "Mulai Free Trial"}
            onSelect={() => navigate("/auth")}
          />
        </div>
      </section>

      {/* FOOTER */}
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

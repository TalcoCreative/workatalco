"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ShowcaseTab {
  icon: string;
  title: string;
  description: string;
  image: string;
}

export interface FeaturedShowcaseProps {
  title?: string;
  subtitle?: string;
  tabs: ShowcaseTab[];
  className?: string;
}

export default function FeaturedShowcase({
  title = "Built for the way modern teams work.",
  subtitle = "Worka brings every part of your operation into one calm, focused workspace.",
  tabs,
  className,
}: FeaturedShowcaseProps) {
  const [active, setActive] = React.useState(0);
  const safeTabs = tabs && tabs.length > 0 ? tabs : [];
  const current = safeTabs[active] ?? safeTabs[0];

  return (
    <section className={cn("px-6 py-24 md:py-32 bg-white", className)}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-3 gap-3">
          {safeTabs.map((tab, i) => {
            const Icon = (LucideIcons as any)[tab.icon] || Sparkles;
            const selected = i === active;
            return (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={cn(
                  "relative text-left rounded-2xl p-6 border transition-all overflow-hidden",
                  selected
                    ? "border-foreground/20 bg-muted/40 shadow-sm"
                    : "border-border/40 bg-white hover:border-border/60 hover:bg-muted/20"
                )}
              >
                {selected && (
                  <motion.div
                    layoutId="featured-active-bar"
                    className="absolute left-0 top-0 h-full w-1 bg-foreground"
                  />
                )}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-white">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-semibold text-base">{tab.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {tab.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-10 relative rounded-3xl overflow-hidden border border-border/30 shadow-2xl shadow-black/10 bg-muted/30 aspect-[16/9]">
          <AnimatePresence mode="wait">
            {current && (
              <motion.img
                key={current.image + active}
                src={current.image}
                alt={current.title}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
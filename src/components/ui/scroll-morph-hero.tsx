"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useTransform, useSpring, useMotionValue } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { Sparkles } from "lucide-react";

type AnimationPhase = "scatter" | "line" | "circle" | "bottom-strip";

export interface ScrollMorphIcon {
  name: string; // lucide icon name
  label?: string;
}

export interface ScrollMorphHeroProps {
  introTitle?: string;
  introHint?: string;
  title?: string;
  subtitle?: string;
  icons?: ScrollMorphIcon[];
  className?: string;
}

const IMG_WIDTH = 88;
const IMG_HEIGHT = 88;
const MAX_SCROLL = 3000;

const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

function IconCard({
  iconName,
  label,
  target,
}: {
  iconName: string;
  label?: string;
  target: { x: number; y: number; rotation: number; scale: number; opacity: number };
}) {
  const Icon = (LucideIcons as any)[iconName] || Sparkles;
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 flex flex-col items-center justify-center rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5"
      style={{
        width: IMG_WIDTH,
        height: IMG_HEIGHT,
        marginLeft: -IMG_WIDTH / 2,
        marginTop: -IMG_HEIGHT / 2,
      }}
      animate={{
        x: target.x,
        y: target.y,
        rotate: target.rotation,
        scale: target.scale,
        opacity: target.opacity,
      }}
      transition={{ type: "spring", stiffness: 80, damping: 18, mass: 0.8 }}
    >
      <Icon className="h-9 w-9 text-foreground" strokeWidth={1.75} />
      {label && (
        <span className="text-[10px] mt-1 text-muted-foreground font-medium tracking-tight max-w-[78px] truncate">
          {label}
        </span>
      )}
    </motion.div>
  );
}

export default function ScrollMorphHero({
  introTitle = "One system. Every company.",
  introHint = "SCROLL TO EXPLORE",
  title = "Built for modern operations.",
  subtitle = "Manage every part of your business in one calm, connected workspace.",
  icons,
  className = "",
}: ScrollMorphHeroProps) {
  const ICONS: ScrollMorphIcon[] = (icons && icons.length > 0)
    ? icons
    : [
        { name: "LayoutDashboard", label: "Dashboard" },
        { name: "CheckSquare", label: "Tasks" },
        { name: "Users", label: "Teams" },
        { name: "Briefcase", label: "Clients" },
        { name: "Calendar", label: "Schedule" },
        { name: "Wallet", label: "Finance" },
        { name: "FileText", label: "Letters" },
        { name: "Megaphone", label: "Marketing" },
        { name: "Camera", label: "Shoots" },
        { name: "BarChart3", label: "Reports" },
        { name: "MessageSquare", label: "Notes" },
        { name: "Bell", label: "Alerts" },
        { name: "Building2", label: "HR" },
        { name: "Star", label: "KOL" },
        { name: "Package", label: "Assets" },
        { name: "Mail", label: "Email" },
        { name: "Shield", label: "Roles" },
        { name: "Sparkles", label: "AI" },
      ];
  const TOTAL = ICONS.length;

  const [introPhase, setIntroPhase] = useState<AnimationPhase>("scatter");
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const e of entries) {
        setContainerSize({ width: e.contentRect.width, height: e.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    setContainerSize({
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
    });
    return () => observer.disconnect();
  }, []);

  const virtualScroll = useMotionValue(0);
  const scrollRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      // only intercept while in morphing range
      if (scrollRef.current >= MAX_SCROLL && e.deltaY > 0) return;
      if (scrollRef.current <= 0 && e.deltaY < 0) return;
      e.preventDefault();
      const next = Math.min(Math.max(scrollRef.current + e.deltaY, 0), MAX_SCROLL);
      scrollRef.current = next;
      virtualScroll.set(next);
    };
    let touchY = 0;
    const onTS = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
    const onTM = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      const dy = touchY - y;
      touchY = y;
      const next = Math.min(Math.max(scrollRef.current + dy, 0), MAX_SCROLL);
      if (next !== scrollRef.current) {
        scrollRef.current = next;
        virtualScroll.set(next);
      }
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("touchstart", onTS, { passive: true });
    container.addEventListener("touchmove", onTM, { passive: true });
    return () => {
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTS);
      container.removeEventListener("touchmove", onTM);
    };
  }, [virtualScroll]);

  const morphProgress = useTransform(virtualScroll, [0, 600], [0, 1]);
  const smoothMorph = useSpring(morphProgress, { stiffness: 40, damping: 20 });
  const scrollRotate = useTransform(virtualScroll, [600, 3000], [0, 360]);
  const smoothScrollRotate = useSpring(scrollRotate, { stiffness: 40, damping: 20 });

  useEffect(() => {
    const t1 = setTimeout(() => setIntroPhase("line"), 400);
    const t2 = setTimeout(() => setIntroPhase("circle"), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const scatterPositions = useMemo(
    () => ICONS.map(() => ({
      x: (Math.random() - 0.5) * 1200,
      y: (Math.random() - 0.5) * 800,
      rotation: (Math.random() - 0.5) * 180,
      scale: 0.6,
      opacity: 0,
    })),
    [TOTAL]
  );

  const [morphValue, setMorphValue] = useState(0);
  const [rotateValue, setRotateValue] = useState(0);

  useEffect(() => {
    const u1 = smoothMorph.on("change", setMorphValue);
    const u2 = smoothScrollRotate.on("change", setRotateValue);
    return () => { u1(); u2(); };
  }, [smoothMorph, smoothScrollRotate]);

  const contentOpacity = useTransform(smoothMorph, [0.7, 1], [0, 1]);
  const introOpacity = useTransform(smoothMorph, [0, 0.4], [1, 0]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-screen min-h-[680px] overflow-hidden bg-gradient-to-b from-white via-white to-muted/30 ${className}`}
    >
      {/* Intro text */}
      <motion.div
        style={{ opacity: introOpacity }}
        className="absolute inset-x-0 top-16 md:top-24 z-10 text-center px-6 pointer-events-none"
      >
        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground max-w-5xl mx-auto leading-[1.05]">
          {introTitle}
        </h2>
        <p className="mt-5 text-xs sm:text-sm tracking-[0.3em] text-muted-foreground/70 font-medium">
          {introHint}
        </p>
      </motion.div>

      {/* Arc-active text */}
      <motion.div
        style={{ opacity: contentOpacity }}
        className="absolute inset-x-0 top-16 md:top-24 z-10 text-center px-6 pointer-events-none"
      >
        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground max-w-5xl mx-auto leading-[1.05]">
          {title}
        </h2>
        <p className="mt-5 mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
      </motion.div>

      {/* Icons stage */}
      <div className="absolute inset-0">
        {ICONS.map((icon, i) => {
          let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

          if (introPhase === "scatter") {
            target = scatterPositions[i];
          } else if (introPhase === "line") {
            const spacing = 76;
            const totalW = TOTAL * spacing;
            target = { x: i * spacing - totalW / 2, y: 0, rotation: 0, scale: 1, opacity: 1 };
          } else {
            const isMobile = containerSize.width < 768;
            const minDim = Math.min(containerSize.width, containerSize.height);

            const circleRadius = Math.min(minDim * 0.36, 360);
            const cAngle = (i / TOTAL) * 360;
            const cRad = (cAngle * Math.PI) / 180;
            const circlePos = {
              x: Math.cos(cRad) * circleRadius,
              y: Math.sin(cRad) * circleRadius,
              rotation: 0,
            };

            const baseRadius = Math.min(containerSize.width, containerSize.height * 1.5);
            const arcRadius = baseRadius * (isMobile ? 1.4 : 1.1);
            const arcApexY = containerSize.height * (isMobile ? 0.45 : 0.4);
            const arcCenterY = arcApexY + arcRadius;

            const spreadAngle = isMobile ? 110 : 140;
            const startAngle = -90 - spreadAngle / 2;
            const step = spreadAngle / (TOTAL - 1);

            const scrollProgress = Math.min(Math.max(rotateValue / 360, 0), 1);
            const maxRotation = spreadAngle * 0.8;
            const boundedRotation = -scrollProgress * maxRotation;

            const aAngle = startAngle + i * step + boundedRotation;
            const aRad = (aAngle * Math.PI) / 180;
            const arcPos = {
              x: Math.cos(aRad) * arcRadius,
              y: Math.sin(aRad) * arcRadius + arcCenterY - containerSize.height / 2,
              rotation: 0,
              scale: isMobile ? 1.1 : 1.3,
            };

            target = {
              x: lerp(circlePos.x, arcPos.x, morphValue),
              y: lerp(circlePos.y, arcPos.y, morphValue),
              rotation: 0,
              scale: lerp(1, arcPos.scale, morphValue),
              opacity: 1,
            };
          }

          return (
            <IconCard
              key={`${icon.name}-${i}`}
              iconName={icon.name}
              label={icon.label}
              target={target}
            />
          );
        })}
      </div>
    </div>
  );
}
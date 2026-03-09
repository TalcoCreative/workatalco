import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { TourStep } from "@/hooks/useOnboarding";

interface TourOverlayProps {
  active: boolean;
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay({ active, steps, currentStep, onNext, onPrev, onSkip }: TourOverlayProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];

  const updateRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const r = el.getBoundingClientRect();
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!active) return;
    // Small delay for page render
    const t = setTimeout(updateRect, 300);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [active, currentStep, updateRect]);

  if (!active || !step) return null;

  const padding = 8;
  const hasTarget = targetRect !== null;

  // Calculate tooltip position
  let tooltipStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 10002,
    maxWidth: 380,
  };

  if (hasTarget) {
    const centerX = targetRect.left + targetRect.width / 2;
    const bottom = targetRect.top + targetRect.height;
    const spaceBelow = window.innerHeight - bottom;
    const spaceAbove = targetRect.top;

    if (spaceBelow > 200) {
      tooltipStyle.top = bottom + 16;
      tooltipStyle.left = Math.max(16, Math.min(centerX - 190, window.innerWidth - 396));
    } else if (spaceAbove > 200) {
      tooltipStyle.bottom = window.innerHeight - targetRect.top + 16;
      tooltipStyle.left = Math.max(16, Math.min(centerX - 190, window.innerWidth - 396));
    } else {
      tooltipStyle.top = "50%";
      tooltipStyle.left = "50%";
      tooltipStyle.transform = "translate(-50%, -50%)";
    }
  } else {
    tooltipStyle.top = "50%";
    tooltipStyle.left = "50%";
    tooltipStyle.transform = "translate(-50%, -50%)";
  }

  return createPortal(
    <>
      {/* Overlay with cutout */}
      <div className="fixed inset-0 z-[10000] pointer-events-none">
        <svg className="w-full h-full pointer-events-auto" style={{ position: "fixed", inset: 0 }}>
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {hasTarget && (
                <rect
                  x={targetRect.left - padding}
                  y={targetRect.top - padding}
                  width={targetRect.width + padding * 2}
                  height={targetRect.height + padding * 2}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.55)"
            mask="url(#tour-mask)"
            onClick={onSkip}
          />
        </svg>
      </div>

      {/* Highlight border */}
      {hasTarget && (
        <div
          className="fixed z-[10001] rounded-xl border-2 border-primary/70 pointer-events-none"
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            boxShadow: "0 0 0 4px hsl(var(--primary) / 0.15)",
            transition: "all 0.3s ease",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="bg-card border border-border/60 rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1 pr-4">
            <h3 className="font-semibold text-foreground text-base">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
          </div>
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground font-medium">
            {currentStep + 1} / {steps.length}
          </span>

          {/* Progress dots */}
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep ? "w-4 bg-primary" : i < currentStep ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-1.5">
            {currentStep > 0 && (
              <Button size="sm" variant="ghost" onClick={onPrev} className="h-8 px-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" onClick={onNext} className="h-8 px-4 gap-1">
              {currentStep === steps.length - 1 ? "Selesai" : "Lanjut"}
              {currentStep < steps.length - 1 && <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

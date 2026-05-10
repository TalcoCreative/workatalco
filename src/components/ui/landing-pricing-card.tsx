"use client";

import { Check, Minus, Plus, Users } from "lucide-react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { useState } from "react";

export interface LandingPlan {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: number; // per user / month (IDR)
  yearlyPrice: number;  // per user / month effective when billed yearly
  features: string[];
  defaultUsers?: number;
  maxUsers?: number;
}

interface LandingPricingCardProps {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  onSelect?: (planId: string, users: number, cycle: "monthly" | "yearly") => void;
  plans: LandingPlan[];
  defaultPlanId?: string;
}

const TRANSITION = { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.8 };

const formatRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

export default function LandingPricingCard({
  title = "Select a Plan",
  subtitle,
  ctaLabel = "Get Started",
  onSelect,
  plans,
  defaultPlanId,
}: LandingPricingCardProps) {
  const initial = defaultPlanId || plans[Math.min(1, plans.length - 1)]?.id || plans[0]?.id;
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState(initial);
  const [userCount, setUserCount] = useState(3);

  if (!plans?.length) return null;

  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6 bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-border/40">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>

        <LayoutGroup>
          <div className="bg-muted/60 rounded-xl p-1 flex h-11 w-full sm:w-auto">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`flex-1 sm:px-5 h-full rounded-lg text-sm font-medium relative transition-colors duration-300 ${
                billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {billingCycle === "monthly" && (
                <motion.div
                  layoutId="billing-pill"
                  className="absolute inset-0 bg-background rounded-lg shadow-sm"
                  transition={TRANSITION}
                />
              )}
              <span className="relative">Monthly</span>
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`flex-1 sm:px-5 h-full rounded-lg text-sm font-medium relative transition-colors duration-300 flex items-center justify-center gap-2 ${
                billingCycle === "yearly" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {billingCycle === "yearly" && (
                <motion.div
                  layoutId="billing-pill"
                  className="absolute inset-0 bg-background rounded-lg shadow-sm"
                  transition={TRANSITION}
                />
              )}
              <span className="relative">Yearly</span>
              <span className="relative text-[10px] font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                HEMAT
              </span>
            </button>
          </div>
        </LayoutGroup>
      </div>

      <div className="space-y-2">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
          const totalUsers = Math.max(1, Math.min(userCount, plan.maxUsers || 999));
          const lineTotal = price * totalUsers;

          return (
            <motion.div
              key={plan.id}
              layout
              transition={TRANSITION}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative cursor-pointer rounded-2xl border transition-colors ${
                isSelected
                  ? "border-foreground bg-muted/30"
                  : "border-border/50 bg-background hover:border-border"
              }`}
            >
              <div className="p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? "border-foreground bg-foreground" : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && <div className="h-2 w-2 rounded-full bg-background" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{plan.name}</p>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground truncate">{plan.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-foreground tabular-nums">{formatRp(price)}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      / user / {billingCycle === "monthly" ? "bulan" : "bulan"}
                    </p>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isSelected && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={TRANSITION}
                      className="overflow-hidden"
                    >
                      <div className="pt-5 mt-5 border-t border-border/50 space-y-4">
                        <ul className="space-y-2">
                          {plan.features.map((f, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                              <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">Users</p>
                              <p className="text-xs text-muted-foreground">
                                Total: {formatRp(lineTotal)} / bulan
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-background rounded-lg p-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setUserCount(Math.max(1, userCount - 1));
                              }}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums">
                              {totalUsers}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setUserCount(Math.min(plan.maxUsers || 999, userCount + 1));
                              }}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect?.(plan.id, totalUsers, billingCycle);
                          }}
                          className="w-full h-11 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 transition-opacity"
                        >
                          {ctaLabel}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

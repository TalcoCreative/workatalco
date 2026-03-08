import { useWorkspace } from "@/hooks/useWorkspace";
import { differenceInDays, parseISO } from "date-fns";
import { AlertTriangle, Clock } from "lucide-react";

export function TrialBanner() {
  const { activeWorkspace, isLoading } = useWorkspace();

  if (isLoading || !activeWorkspace) return null;

  const { subscription_tier, trial_end, is_suspended } = activeWorkspace;

  if (is_suspended) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm bg-destructive/10 text-destructive border-b border-destructive/20">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="font-medium">Workspace disuspend — Hubungi admin platform untuk mengaktifkan kembali.</span>
      </div>
    );
  }

  if (subscription_tier !== "trial") return null;
  if (!trial_end) return null;

  const trialEnd = parseISO(trial_end);
  const daysLeft = Math.max(0, differenceInDays(trialEnd, new Date()));
  const isExpired = daysLeft === 0;

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
      isExpired
        ? "bg-destructive/10 text-destructive border-b border-destructive/20"
        : "bg-warning/10 text-warning-foreground border-b border-warning/20"
    }`}>
      <div className="flex items-center gap-2">
        {isExpired ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
        <span className="font-medium">
          {isExpired
            ? "Trial berakhir — Upgrade untuk membuat project, task, dan upload file."
            : `Trial Aktif — ${daysLeft} hari tersisa`}
        </span>
      </div>
      <a
        href="/landing#pricing"
        className="shrink-0 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Upgrade Now
      </a>
    </div>
  );
}

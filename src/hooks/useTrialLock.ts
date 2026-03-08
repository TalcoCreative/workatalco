import { useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { useWorkspace } from "./useWorkspace";
import { toast } from "sonner";

export function useTrialLock() {
  const { activeWorkspace, isLoading } = useWorkspace();

  const trialInfo = useMemo(() => {
    if (!activeWorkspace) return { isTrialExpired: false, daysLeft: 0, isTrial: false, tier: "trial" };

    const tier = activeWorkspace.subscription_tier;
    const isTrial = tier === "trial";
    const isSuspended = activeWorkspace.is_suspended;

    if (!isTrial) {
      return { isTrialExpired: false, daysLeft: 999, isTrial: false, tier, isSuspended };
    }

    const trialEnd = parseISO(activeWorkspace.trial_end);
    const daysLeft = Math.max(0, differenceInDays(trialEnd, new Date()));
    const isTrialExpired = daysLeft === 0;

    return { isTrialExpired, daysLeft, isTrial: true, tier, isSuspended };
  }, [activeWorkspace]);

  const guardAction = (actionName?: string): boolean => {
    if (trialInfo.isSuspended) {
      toast.error("Workspace telah disuspend. Hubungi admin platform.");
      return false;
    }
    if (trialInfo.isTrial && trialInfo.isTrialExpired) {
      toast.error(`Trial telah berakhir. Upgrade untuk ${actionName || "melanjutkan"}.`);
      return false;
    }
    return true;
  };

  return {
    ...trialInfo,
    isLoading,
    guardAction,
  };
}

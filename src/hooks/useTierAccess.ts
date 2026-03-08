import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "./useWorkspace";

export function useTierAccess() {
  const { activeWorkspace, isLoading: wsLoading } = useWorkspace();
  const tier = activeWorkspace?.subscription_tier || "trial";

  const { data: allowedFeatures = [], isLoading: featLoading } = useQuery({
    queryKey: ["tier-features", tier],
    queryFn: async () => {
      const { data } = await supabase
        .from("tier_features")
        .select("feature_key")
        .eq("tier", tier);
      return (data || []).map((r: any) => r.feature_key);
    },
    enabled: !!tier,
  });

  const isTierFeature = (featureKey: string): boolean => {
    // Enterprise and FnF get all access
    if (tier === "enterprise" || tier === "fnf") return true;
    return allowedFeatures.includes(featureKey);
  };

  return {
    tier,
    allowedFeatures,
    isTierFeature,
    isLoading: wsLoading || featLoading,
  };
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface WorkspaceSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceSwitcher({ open, onOpenChange }: WorkspaceSwitcherProps) {
  const navigate = useNavigate();

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ["my-workspaces"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return [];
      const { data } = await supabase
        .from("company_members")
        .select("company_id, role, companies(id, name, slug, logo_url, subscription_tier)")
        .eq("user_id", session.session.user.id);
      return (data || []).map((m: any) => ({ ...m.companies, memberRole: m.role }));
    },
    enabled: open,
  });

  const handleSelect = (slug: string) => {
    onOpenChange(false);
    navigate(`/${slug}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Workspace</DialogTitle>
          <DialogDescription>Select a workspace to continue.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-6">Loading workspaces...</p>}
          {workspaces?.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-6">No workspaces found.</p>
          )}
          {workspaces?.map((ws: any) => (
            <button
              key={ws.id}
              onClick={() => handleSelect(ws.slug)}
              className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-4 text-left transition-all hover:border-primary/30 hover:shadow-soft"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{ws.name}</p>
                <p className="text-xs text-muted-foreground">/{ws.slug} · {ws.subscription_tier}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

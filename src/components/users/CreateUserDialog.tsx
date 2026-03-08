import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoleOptions } from "@/hooks/usePositions";
import { useTrialLock } from "@/hooks/useTrialLock";
import { useWorkspace } from "@/hooks/useWorkspace";
import { CreditCard, CheckCircle } from "lucide-react";

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: any) => void;
    };
  }
}

const TIER_PRICES: Record<string, number> = {
  trial: 0,
  starter: 7000,
  professional: 21000,
  enterprise: 25000,
  fnf: 0,
};

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const { roleOptions } = useRoleOptions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { guardAction } = useTrialLock();
  const { activeWorkspace } = useWorkspace();

  // Fetch current member count
  const { data: currentMemberCount = 0 } = useQuery({
    queryKey: ["company-member-count", activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return 0;
      const { count, error } = await supabase
        .from("company_members")
        .select("id", { count: "exact", head: true })
        .eq("company_id", activeWorkspace.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!activeWorkspace?.id && open,
  });

  // Load Midtrans Snap
  useEffect(() => {
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
    if (!clientKey) return;
    if (document.getElementById("midtrans-snap-user")) return;
    const script = document.createElement("script");
    script.id = "midtrans-snap-user";
    script.src = "https://app.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    document.head.appendChild(script);
  }, []);

  const tier = activeWorkspace?.subscription_tier || "trial";
  const maxUsers = activeWorkspace?.max_users || 3;
  const hasQuota = currentMemberCount < maxUsers;
  const pricePerUser = TIER_PRICES[tier] || 0;
  const needsPayment = !hasQuota && pricePerUser > 0;
  const formatRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardAction("menambah user baru")) return;
    setLoading(true);

    try {
      if (needsPayment) {
        // Over quota on paid tier → Midtrans payment first
        const { data: snapData, error: snapError } = await supabase.functions.invoke("midtrans-create-transaction", {
          body: {
            companyId: activeWorkspace?.id,
            tier,
            userCount: 1,
          },
        });

        if (snapError) throw snapError;
        if (snapData?.error) throw new Error(snapData.error);

        if (snapData?.token && window.snap) {
          window.snap.pay(snapData.token, {
            onSuccess: async () => {
              toast.success("Pembayaran berhasil! Membuat user...");
              // Increment max_users after payment
              await supabase
                .from("companies")
                .update({ max_users: maxUsers + 1 })
                .eq("id", activeWorkspace!.id);
              await createUser();
            },
            onPending: () => {
              toast.info("Menunggu pembayaran. User akan dibuat setelah pembayaran dikonfirmasi.");
              setLoading(false);
            },
            onError: () => {
              toast.error("Pembayaran gagal.");
              setLoading(false);
            },
            onClose: () => {
              toast.info("Pembayaran belum selesai.");
              setLoading(false);
            },
          });
          return;
        }
      }

      // Has quota or free tier → create directly
      await createUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
      setLoading(false);
    }
  };

  const createUser = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email, password, fullName, role, companyId: activeWorkspace?.id },
      });

      if (error) throw error;

      toast.success("User created successfully!");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({ queryKey: ["company-member-count"] });
      queryClient.invalidateQueries({ queryKey: ["my-workspaces"] });
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setRole("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quota / Payment info */}
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-2">
            {hasQuota ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Kuota tersedia ({currentMemberCount}/{maxUsers}) — gratis tanpa biaya tambahan</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Kuota penuh ({currentMemberCount}/{maxUsers}) — biaya tambah user
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{tier} Plan</span>
                  <span className="font-bold text-foreground">{formatRupiah(pricePerUser)}/user/bulan</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Pembayaran via Midtrans akan muncul setelah submit.
                </p>
              </>
            )}
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {needsPayment && <CreditCard className="h-4 w-4" />}
            {loading ? "Processing..." : needsPayment ? `Bayar & Create User (${formatRupiah(pricePerUser)})` : "Create User"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

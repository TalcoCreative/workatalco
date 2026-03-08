import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useCompanySlug } from "@/hooks/useCompanySlug";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  CreditCard, Users, Crown, CheckCircle2, ArrowRight, Zap,
  AlertTriangle, Calendar, TrendingUp, Shield, Sparkles,
} from "lucide-react";
import { format } from "date-fns";

const TIERS = [
  {
    key: "starter",
    name: "Starter",
    subtitle: "Project Management",
    pricePerUser: 7000,
    maxUsers: 10,
    features: ["Projects & Tasks", "Schedule & Calendar", "Client Management", "Team Collaboration", "File Storage 5GB"],
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-500/10",
  },
  {
    key: "professional",
    name: "Professional",
    subtitle: "Operational Agency",
    pricePerUser: 21000,
    maxUsers: 30,
    features: ["Everything in Starter", "HR Dashboard & Analytics", "Leave & Attendance", "Meeting Management", "Asset Management", "Event Management", "Shooting Schedule", "Reports & Export"],
    color: "bg-primary",
    textColor: "text-primary",
    bgColor: "bg-primary/10",
    popular: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    subtitle: "Full ERP",
    pricePerUser: 25000,
    maxUsers: 100,
    features: ["Everything in Professional", "Finance Center", "Income & Balance Sheet", "CEO Dashboard", "Sales & Prospects", "Recruitment System", "KOL Database", "Social Media Management", "Priority Support"],
    color: "bg-emerald-500",
    textColor: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
  },
];

const formatRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: any) => void;
    };
  }
}

export default function Billing() {
  const { activeWorkspace } = useWorkspace();
  const slug = useCompanySlug();
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [userCount, setUserCount] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load Midtrans Snap.js
  useEffect(() => {
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
    if (!clientKey) return;
    
    if (document.getElementById("midtrans-snap")) return;
    const script = document.createElement("script");
    script.id = "midtrans-snap";
    script.src = "https://app.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    document.head.appendChild(script);
  }, []);

  const currentTier = activeWorkspace?.subscription_tier || "trial";
  const currentMaxUsers = activeWorkspace?.max_users || 3;

  // Get member count
  const { data: memberCount = 0 } = useQuery({
    queryKey: ["billing-member-count", activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace) return 0;
      const { count } = await supabase
        .from("company_members")
        .select("id", { count: "exact", head: true })
        .eq("company_id", activeWorkspace.id);
      return count || 0;
    },
    enabled: !!activeWorkspace,
  });

  // Get payment history
  const { data: payments = [] } = useQuery({
    queryKey: ["billing-payments", activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace) return [];
      const { data } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("company_id", activeWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!activeWorkspace,
  });

  // Get subscription
  const { data: subscription } = useQuery({
    queryKey: ["billing-subscription", activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("company_id", activeWorkspace.id)
        .maybeSingle();
      return data;
    },
    enabled: !!activeWorkspace,
  });

  const handleSubscribe = async (tierKey: string, users: number) => {
    if (!activeWorkspace) return;
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("midtrans-create-transaction", {
        body: {
          companyId: activeWorkspace.id,
          tier: tierKey,
          userCount: users,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (window.snap && data.token) {
        window.snap.pay(data.token, {
          onSuccess: () => {
            toast.success("Pembayaran berhasil! Subscription aktif.");
            queryClient.invalidateQueries({ queryKey: ["billing-subscription"] });
            queryClient.invalidateQueries({ queryKey: ["my-workspaces"] });
            setSelectedTier(null);
          },
          onPending: () => {
            toast.info("Menunggu pembayaran...");
          },
          onError: () => {
            toast.error("Pembayaran gagal.");
          },
          onClose: () => {
            setIsProcessing(false);
          },
        });
      } else if (data.redirect_url) {
        window.open(data.redirect_url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat transaksi");
    } finally {
      setIsProcessing(false);
    }
  };

  const usagePercent = Math.min((memberCount / currentMaxUsers) * 100, 100);
  const isAtLimit = memberCount >= currentMaxUsers;
  const currentTierInfo = TIERS.find(t => t.key === currentTier);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-sm text-muted-foreground">Kelola subscription dan pembayaran workspace Anda</p>
        </div>

        {/* Current Plan Status */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${currentTierInfo?.bgColor || "bg-warning/10"}`}>
                    <Crown className={`h-6 w-6 ${currentTierInfo?.textColor || "text-warning"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-foreground capitalize">{currentTier} Plan</h2>
                      {currentTier === "trial" && (
                        <Badge variant="outline" className="text-warning border-warning/30">Trial</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentTier === "trial"
                        ? "14 hari trial gratis"
                        : `${formatRupiah(currentTierInfo?.pricePerUser || 0)} / user / bulan`}
                    </p>
                  </div>
                </div>

                {/* User Capacity */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Kapasitas User
                    </span>
                    <span className="font-semibold">{memberCount} / {currentMaxUsers}</span>
                  </div>
                  <Progress value={usagePercent} className="h-2.5" />
                  {isAtLimit && (
                    <Alert className="border-destructive/30 bg-destructive/5">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <AlertDescription className="text-destructive text-sm">
                        Batas user tercapai! Upgrade plan untuk menambah anggota tim.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {subscription && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Berlaku hingga: {format(new Date(subscription.current_period_end), "dd MMM yyyy")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade Plans */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {currentTier === "trial" ? "Pilih Plan" : "Upgrade Plan"}
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {TIERS.map((tier) => {
              const isCurrentTier = tier.key === currentTier;
              const users = selectedTier === tier.key ? userCount : (isCurrentTier ? currentMaxUsers : Math.max(memberCount, 3));
              const totalPrice = tier.pricePerUser * users;

              return (
                <Card
                  key={tier.key}
                  className={`relative overflow-hidden transition-all duration-300 ${
                    tier.popular ? "ring-2 ring-primary shadow-md" : "border-border/50"
                  } ${isCurrentTier ? "opacity-70" : "hover:shadow-lg hover:-translate-y-0.5"}`}
                >
                  {tier.popular && (
                    <div className="absolute right-0 top-0 rounded-bl-xl bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">
                      POPULAR
                    </div>
                  )}
                  <CardContent className="p-6 space-y-5">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tier.subtitle}</p>
                      <h3 className="text-xl font-bold text-foreground mt-1">{tier.name}</h3>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl font-extrabold text-foreground">
                          {formatRupiah(tier.pricePerUser)}
                        </span>
                        <span className="text-xs text-muted-foreground">/ user / bln</span>
                      </div>
                    </div>

                    {/* User Slider */}
                    <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {users} users
                        </span>
                        <span className="font-bold text-foreground">
                          {formatRupiah(totalPrice)}
                          <span className="text-[10px] font-normal text-muted-foreground">/bln</span>
                        </span>
                      </div>
                      {!isCurrentTier && (
                        <>
                          <Slider
                            value={[selectedTier === tier.key ? userCount : Math.max(memberCount, 3)]}
                            onValueChange={(v) => {
                              setSelectedTier(tier.key);
                              setUserCount(v[0]);
                            }}
                            min={Math.max(memberCount, 1)}
                            max={tier.maxUsers}
                            step={1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{Math.max(memberCount, 1)} min</span>
                            <span>Max {tier.maxUsers}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <Button
                      className="w-full gap-2"
                      variant={tier.popular ? "default" : "outline"}
                      disabled={isCurrentTier || isProcessing}
                      onClick={() => handleSubscribe(tier.key, selectedTier === tier.key ? userCount : Math.max(memberCount, 3))}
                    >
                      {isCurrentTier ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Plan Saat Ini
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" /> Bayar Sekarang
                        </>
                      )}
                    </Button>

                    <ul className="space-y-2">
                      {tier.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-xs text-foreground">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Riwayat Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground capitalize">{p.tier} Plan — {p.user_count} users</p>
                      <p className="text-xs text-muted-foreground">{p.midtrans_order_id}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">{formatRupiah(p.amount)}</p>
                      <Badge
                        variant="outline"
                        className={
                          p.status === "paid"
                            ? "text-emerald-600 border-emerald-300 bg-emerald-50"
                            : p.status === "pending"
                            ? "text-warning border-warning/30 bg-warning/5"
                            : "text-destructive border-destructive/30 bg-destructive/5"
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { Building2, ChevronRight, AlertTriangle, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const navigate = useNavigate();

  const checkWorkspacesAndRedirect = async (sess: Session) => {
    const userId = sess.user.id;
    const { data: pa } = await supabase
      .from("platform_admins")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (pa) {
      const { data: allCompanies } = await supabase
        .from("companies")
        .select("id, name, slug, subscription_tier, is_active")
        .order("created_at", { ascending: false });
      const ws = (allCompanies || []).map((c: any) => ({ ...c, memberRole: "platform_admin" }));
      if (ws.length === 0) {
        navigate("/platform-admin", { replace: true });
        return;
      } else if (ws.length === 1) {
        navigate(`/${ws[0].slug}`, { replace: true });
        return;
      } else {
        setWorkspaces(ws);
        setShowPicker(true);
        return;
      }
    }

    const { data } = await supabase
      .from("company_members")
      .select("company_id, role, companies(id, name, slug, subscription_tier, is_active)")
      .eq("user_id", userId);

    const ws = (data || []).map((m: any) => ({ ...m.companies, memberRole: m.role }));

    if (ws.length === 0) {
      navigate("/landing");
    } else if (ws.length === 1) {
      const company = ws[0];
      // Check if company is inactive (payment pending) and not trial
      if (!company.is_active && company.subscription_tier !== "trial") {
        // Check for pending payment transaction
        const { data: pendingTxn } = await supabase
          .from("payment_transactions")
          .select("snap_token, snap_redirect_url, midtrans_order_id")
          .eq("company_id", company.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingTxn) {
          setPendingPayment({ company, txn: pendingTxn });
          return;
        }
      }
      navigate(`/${company.slug}`, { replace: true });
    } else {
      // Filter out inactive non-trial companies
      const activeWs = ws.filter((w: any) => w.is_active || w.subscription_tier === "trial");
      if (activeWs.length === 0) {
        toast.error("Semua workspace Anda belum aktif. Silakan selesaikan pembayaran.");
        return;
      }
      setWorkspaces(activeWs);
      setShowPicker(true);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session) {
          checkWorkspacesAndRedirect(session);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkWorkspacesAndRedirect(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load Midtrans Snap
  useEffect(() => {
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
    if (!clientKey) return;
    if (document.getElementById("midtrans-snap-auth")) return;
    const script = document.createElement("script");
    script.id = "midtrans-snap-auth";
    script.src = "https://app.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    document.head.appendChild(script);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Login berhasil!");
    } catch (error: any) {
      toast.error(error.message || "Email atau password salah");
    } finally {
      setLoading(false);
    }
  };

  const handleRetryPayment = () => {
    if (!pendingPayment?.txn?.snap_token) {
      if (pendingPayment?.txn?.snap_redirect_url) {
        window.location.href = pendingPayment.txn.snap_redirect_url;
      }
      return;
    }

    if ((window as any).snap) {
      (window as any).snap.pay(pendingPayment.txn.snap_token, {
        onSuccess: () => {
          toast.success("Pembayaran berhasil! Workspace aktif.");
          navigate(`/${pendingPayment.company.slug}`, { replace: true });
        },
        onPending: () => {
          toast.info("Menunggu pembayaran...");
        },
        onError: () => {
          toast.error("Pembayaran gagal.");
        },
        onClose: () => {
          toast.info("Pembayaran belum selesai.");
        },
      });
    } else if (pendingPayment.txn.snap_redirect_url) {
      window.location.href = pendingPayment.txn.snap_redirect_url;
    }
  };

  const selectWorkspace = (slug: string) => {
    setShowPicker(false);
    navigate(`/${slug}`, { replace: true });
  };

  const tierBadge: Record<string, string> = {
    starter: "bg-blue-500/10 text-blue-600",
    professional: "bg-primary/10 text-primary",
    enterprise: "bg-emerald-500/10 text-emerald-600",
  };

  // Pending Payment Screen
  if (pendingPayment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10">
              <AlertTriangle className="h-7 w-7 text-warning" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">Pembayaran Pending</CardTitle>
            <CardDescription>
              Workspace <strong>{pendingPayment.company.name}</strong> belum aktif. Selesaikan pembayaran untuk mengakses workspace Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Workspace</span>
                <span className="font-medium">{pendingPayment.company.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <Badge variant="outline" className="capitalize">{pendingPayment.company.subscription_tier}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order ID</span>
                <code className="text-xs">{pendingPayment.txn.midtrans_order_id}</code>
              </div>
            </div>

            <Button className="w-full gap-2" onClick={handleRetryPayment}>
              <CreditCard className="h-4 w-4" />
              Bayar Sekarang
            </Button>

            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={async () => {
                await supabase.auth.signOut();
                setPendingPayment(null);
                setSession(null);
              }}
            >
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showPicker) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-foreground">Choose Workspace</CardTitle>
            <CardDescription>Select a workspace to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {workspaces.map((ws: any) => (
              <button
                key={ws.id}
                onClick={() => selectWorkspace(ws.slug)}
                className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{ws.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">/{ws.slug}</p>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${tierBadge[ws.subscription_tier] || ""}`}>
                      {ws.subscription_tier}
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-extrabold text-lg">W</div>
          <CardTitle className="text-2xl font-bold text-foreground">WORKA</CardTitle>
          <CardDescription className="text-base">Sign in to your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <a href="/subscribe" className="text-sm text-muted-foreground hover:text-primary">
              Belum punya akun? Daftar Sekarang
            </a>
            <div>
              <a href="/landing" className="text-xs text-muted-foreground hover:text-primary">← Kembali ke halaman utama</a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
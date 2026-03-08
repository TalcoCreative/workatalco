import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Shield,
  Zap,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Link,
  Bell,
} from "lucide-react";

export function IntegrationsTab() {
  const queryClient = useQueryClient();
  const [showServerKey, setShowServerKey] = useState(false);
  const [showClientKey, setShowClientKey] = useState(false);
  const [testing, setTesting] = useState(false);

  // Fetch integration config
  const { data: midtrans, isLoading } = useQuery({
    queryKey: ["platform-integration-midtrans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_integrations")
        .select("*")
        .eq("provider", "midtrans")
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch current secrets
  const { data: secrets } = useQuery({
    queryKey: ["platform-midtrans-secrets"],
    queryFn: async () => {
      // We can't read secret values directly, but we know they exist from the config
      return {
        serverKey: "MIDTRANS_SERVER_KEY",
        clientKey: "MIDTRANS_CLIENT_KEY",
      };
    },
  });

  // Toggle enabled
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("platform_integrations")
        .update({ is_enabled: enabled })
        .eq("provider", "midtrans");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-integration-midtrans"] });
      toast.success("Status integrasi diperbarui");
    },
  });

  // Update config
  const updateConfigMutation = useMutation({
    mutationFn: async (config: Record<string, any>) => {
      const { error } = await supabase
        .from("platform_integrations")
        .update({ config })
        .eq("provider", "midtrans");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-integration-midtrans"] });
      toast.success("Konfigurasi disimpan");
    },
  });

  // Test connection
  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("midtrans-create-transaction", {
        body: {
          test: true,
          order_id: `test-${Date.now()}`,
          gross_amount: 1000,
          customer_name: "Test User",
          customer_email: "test@test.com",
        },
      });

      if (error) throw error;

      // Update test status
      await supabase
        .from("platform_integrations")
        .update({
          last_tested_at: new Date().toISOString(),
          test_status: data?.token ? "success" : "failed",
        })
        .eq("provider", "midtrans");

      queryClient.invalidateQueries({ queryKey: ["platform-integration-midtrans"] });

      if (data?.token) {
        toast.success("Koneksi Midtrans berhasil! Token diterima.");
      } else {
        toast.error("Test gagal: Tidak mendapat token");
      }
    } catch (err: any) {
      await supabase
        .from("platform_integrations")
        .update({
          last_tested_at: new Date().toISOString(),
          test_status: "failed",
        })
        .eq("provider", "midtrans");

      queryClient.invalidateQueries({ queryKey: ["platform-integration-midtrans"] });
      toast.error(`Test gagal: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const config = (midtrans?.config as Record<string, any>) || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground">Kelola integrasi payment gateway dan layanan lainnya</p>
      </div>

      {/* Midtrans Card */}
      <Card className="border-border/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Midtrans Payment Gateway</CardTitle>
                <CardDescription>Integrasi pembayaran untuk subscription</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {midtrans?.test_status === "success" && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </Badge>
              )}
              {midtrans?.test_status === "failed" && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                  <XCircle className="h-3 w-3" /> Failed
                </Badge>
              )}
              {midtrans?.test_status === "untested" && (
                <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
                  Untested
                </Badge>
              )}
              <Switch
                checked={midtrans?.is_enabled || false}
                onCheckedChange={(val) => toggleMutation.mutate(val)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Environment</Label>
            <Select
              value={config.environment || "sandbox"}
              onValueChange={(val) => updateConfigMutation.mutate({ ...config, environment: val })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">🧪 Sandbox (Testing)</SelectItem>
                <SelectItem value="production">🚀 Production (Live)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {config.environment === "production"
                ? "⚠️ Mode production — transaksi akan memotong saldo nyata"
                : "Mode sandbox — untuk testing, tidak ada charge nyata"
              }
            </p>
          </div>

          {/* API Keys Display */}
          <div className="space-y-4">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">API Keys (Stored as Secrets)</Label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    Server Key
                  </Label>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowServerKey(!showServerKey)}>
                    {showServerKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 font-mono truncate">
                    {showServerKey ? "MIDTRANS_SERVER_KEY" : "••••••••••••••••"}
                  </code>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Set</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">Stored securely as environment secret</p>
              </div>

              <div className="rounded-xl border border-border/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    Client Key
                  </Label>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowClientKey(!showClientKey)}>
                    {showClientKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 font-mono truncate">
                    {showClientKey ? "MIDTRANS_CLIENT_KEY" : "••••••••••••••••"}
                  </code>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Set</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">Stored securely as environment secret</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" />
              API keys dikelola melalui WORKA Cloud secrets. Untuk mengubah, hubungi administrator platform.
            </p>
          </div>

          {/* Test Connection */}
          <div className="border-t border-border/30 pt-4 space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connection Test</Label>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleTestConnection}
                disabled={testing}
                className="gap-2"
              >
                {testing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Testing...</>
                ) : (
                  <><RefreshCw className="h-4 w-4" /> Test Koneksi</>
                )}
              </Button>

              {midtrans?.last_tested_at && (
                <span className="text-xs text-muted-foreground">
                  Last test: {new Date(midtrans.last_tested_at).toLocaleString("id-ID")}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Test akan mencoba membuat token transaksi Rp 1.000 di mode {config.environment || "sandbox"} untuk memverifikasi kredensial.
            </p>
          </div>

          {/* Notification URLs */}
          <div className="border-t border-border/30 pt-4 space-y-4">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              URL Notifikasi (Webhook)
            </Label>
            <p className="text-xs text-muted-foreground">
              Salin URL di bawah ini dan masukkan ke <strong>Settings → Configuration → Payment Notification URL</strong> di Midtrans Dashboard.
            </p>

            {/* Payment Notification URL */}
            <div className="rounded-xl border border-border/30 p-4 space-y-2">
              <Label className="text-sm flex items-center gap-1.5">
                <Link className="h-3.5 w-3.5 text-muted-foreground" />
                URL Notifikasi Pembayaran
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Untuk menerima notifikasi HTTP status pembayaran (sukses, gagal, pending, dll.)
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-3 py-2 rounded-lg flex-1 font-mono truncate select-all">
                  {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/midtrans-webhook`}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/midtrans-webhook`);
                    toast.success("URL disalin ke clipboard");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Recurring Payment Notification URL */}
            <div className="rounded-xl border border-border/30 p-4 space-y-2">
              <Label className="text-sm flex items-center gap-1.5">
                <Link className="h-3.5 w-3.5 text-muted-foreground" />
                URL Notifikasi Pembayaran Berulang
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Untuk menerima notifikasi HTTP pembayaran berulang (recurring) yang berhasil/gagal.
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-3 py-2 rounded-lg flex-1 font-mono truncate select-all">
                  {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/midtrans-webhook`}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/midtrans-webhook`);
                    toast.success("URL disalin ke clipboard");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Pay Account Notification URL */}
            <div className="rounded-xl border border-border/30 p-4 space-y-2">
              <Label className="text-sm flex items-center gap-1.5">
                <Link className="h-3.5 w-3.5 text-muted-foreground" />
                URL Notifikasi Menghubungkan Akun
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Untuk menerima notifikasi HTTP proses menghubungkan akun GoPay yang berhasil/gagal.
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-3 py-2 rounded-lg flex-1 font-mono truncate select-all">
                  {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/midtrans-webhook`}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/midtrans-webhook`);
                    toast.success("URL disalin ke clipboard");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Pastikan URL di atas sudah dimasukkan ke Midtrans Dashboard agar notifikasi pembayaran dapat diterima. 
                Tanpa ini, status pembayaran tidak akan terupdate otomatis.
              </p>
            </div>
          </div>

          {/* Midtrans Dashboard Link */}
          <div className="border-t border-border/30 pt-4">
            <Button variant="outline" className="gap-2" asChild>
              <a
                href={config.environment === "production"
                  ? "https://dashboard.midtrans.com"
                  : "https://dashboard.sandbox.midtrans.com"
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Buka Midtrans Dashboard
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

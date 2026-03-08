import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mail, Send, CheckCircle, XCircle, Loader2, Settings, History,
  AlertCircle, RefreshCw, Zap, BarChart3, Clock, Activity, Wifi, WifiOff,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function EmailSettingsContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [senderEmail, setSenderEmail] = useState("onboarding@resend.dev");
  const [senderName, setSenderName] = useState("WORKA");
  const [brevoSenderEmail, setBrevoSenderEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [connectionResults, setConnectionResults] = useState<Record<string, { connected: boolean; message: string; details?: any }> | null>(null);

  const { data: settings, isLoading: loadingSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["email-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      if (data) return data;

      const { data: created, error: createError } = await supabase
        .from("email_settings")
        .insert({
          sender_name: "WORKA",
          smtp_email: "onboarding@resend.dev",
          is_connected: false,
        } as any)
        .select("*")
        .single();

      if (createError) throw createError;
      return created;
    },
  });

  const { data: logs, isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_logs").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: queueStats, refetch: refetchQueue } = useQuery({
    queryKey: ["email-queue-stats"],
    queryFn: async () => {
      const [pending, processing, sent, failed] = await Promise.all([
        supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "processing"),
        supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "sent"),
        supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
      ]);
      return { pending: pending.count || 0, processing: processing.count || 0, sent: sent.count || 0, failed: failed.count || 0 };
    },
    refetchInterval: 10000,
  });

  const { data: recentQueue } = useQuery({
    queryKey: ["email-queue-recent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_queue").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (settings) {
      setSenderEmail(settings.smtp_email || "onboarding@resend.dev");
      setSenderName(settings.sender_name || "WORKA");
      setBrevoSenderEmail((settings as any).brevo_sender_email || "");
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("email_settings").update({
        smtp_email: senderEmail.trim() || "onboarding@resend.dev",
        sender_name: senderName.trim() || "WORKA",
        brevo_sender_email: brevoSenderEmail.trim() || null,
        updated_at: new Date().toISOString(),
      } as any).eq("id", settings?.id);
      if (error) throw error;
      toast({ title: "Berhasil", description: "Pengaturan email berhasil disimpan" });
      queryClient.invalidateQueries({ queryKey: ["email-settings"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCheckConnection = async () => {
    setTestingConnection(true);
    setConnectionResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("email-test-connection", {
        body: {},
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Test failed");
      setConnectionResults(data.results);
      refetchSettings();
      refetchLogs();
      toast({
        title: data.all_connected ? "✅ Semua Provider Connected!" : "⚠️ Ada Provider Belum Connect",
        description: Object.entries(data.results as Record<string, any>).map(([k, v]) => `${k}: ${v.connected ? '✅' : '❌'}`).join(' | '),
      });
    } catch (err: any) {
      toast({ title: "Connection Test Failed", description: err.message, variant: "destructive" });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendTestEmail = async (provider: "resend" | "brevo") => {
    if (!testEmail) {
      toast({ title: "Email required", description: "Masukkan email tujuan test", variant: "destructive" });
      return;
    }
    setSendingTest(provider);
    try {
      const { data, error } = await supabase.functions.invoke("email-test-connection", {
        body: { provider, test_email: testEmail },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed");
      const result = data.results?.[provider];
      if (result) {
        setConnectionResults(prev => ({ ...prev, [provider]: result }));
      }
      toast({
        title: result?.connected ? `✅ ${provider} Test` : `❌ ${provider} Error`,
        description: result?.message || "Check results",
      });
      refetchSettings();
      refetchLogs();
    } catch (err: any) {
      toast({ title: `${provider} Test Error`, description: err.message, variant: "destructive" });
    } finally {
      setSendingTest(null);
    }
  };

  const handleProcessQueue = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("email-worker", { body: { batch_size: 20 } });
      if (error) throw new Error(error.message);
      toast({ title: "Worker Triggered", description: `Processed: ${data?.processed || 0}, Failed: ${data?.failed || 0}` });
      refetchQueue();
      refetchLogs();
    } catch (err: any) {
      toast({ title: "Worker Error", description: err.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      sent: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100", label: "Terkirim" },
      failed: { className: "bg-destructive text-destructive-foreground", label: "Gagal" },
      pending: { className: "bg-secondary text-secondary-foreground", label: "Pending" },
      processing: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100", label: "Processing" },
      cancelled: { className: "border border-border bg-transparent", label: "Cancelled" },
    };
    const s = map[status] || { className: "bg-secondary text-secondary-foreground", label: status };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, { className: string; label: string }> = {
      high: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100", label: "High" },
      medium: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100", label: "Medium" },
      low: { className: "border border-border bg-transparent", label: "Low" },
    };
    const p = map[priority] || { className: "bg-secondary text-secondary-foreground", label: priority };
    return <Badge className={p.className}>{p.label}</Badge>;
  };

  if (loadingSettings) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Email Infrastructure</h2>
            <p className="text-muted-foreground text-sm">Dual-provider: Resend (transactional) + Brevo (notification/broadcast)</p>
          </div>
        </div>
        <Button onClick={handleCheckConnection} disabled={testingConnection} variant="outline">
          {testingConnection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
          Check Connection
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="providers" className="flex items-center gap-2"><Zap className="h-4 w-4" /> Providers</TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2"><Activity className="h-4 w-4" /> Queue</TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2"><Settings className="h-4 w-4" /> Pengaturan</TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2"><History className="h-4 w-4" /> Log Email</TabsTrigger>
        </TabsList>

        {/* ─── Dashboard ─── */}
        <TabsContent value="dashboard">
          {/* Provider Status Cards */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <ProviderStatusCard
              name="Resend"
              icon={<Zap className="h-5 w-5 text-primary" />}
              role="Transactional (Auth, Security, Billing)"
              connected={connectionResults?.resend?.connected ?? settings?.is_connected ?? null}
              message={connectionResults?.resend?.message}
              details={connectionResults?.resend?.details}
            />
            <ProviderStatusCard
              name="Brevo"
              icon={<Send className="h-5 w-5 text-blue-500" />}
              role="Notification & Broadcast"
              connected={connectionResults?.brevo?.connected ?? null}
              message={connectionResults?.brevo?.message}
              details={connectionResults?.brevo?.details}
            />
          </div>

          {/* Queue Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <StatCard icon={<Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />} bg="bg-yellow-100 dark:bg-yellow-900/30" value={queueStats?.pending || 0} label="Pending" />
            <StatCard icon={<Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />} bg="bg-blue-100 dark:bg-blue-900/30" value={queueStats?.processing || 0} label="Processing" />
            <StatCard icon={<CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />} bg="bg-green-100 dark:bg-green-900/30" value={queueStats?.sent || 0} label="Sent" />
            <StatCard icon={<XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />} bg="bg-red-100 dark:bg-red-900/30" value={queueStats?.failed || 0} label="Failed" />
          </div>

          {/* Routing & Priority */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email Routing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2 mb-2"><Zap className="h-4 w-4 text-primary" /><span className="font-semibold text-primary">Resend → Transactional</span></div>
                  <p className="text-sm text-muted-foreground mb-2">High priority, immediate delivery</p>
                  <div className="flex flex-wrap gap-1">
                    {["welcome_user", "verify_email", "reset_password", "invite_user", "payment_confirmation", "security_alert"].map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center gap-2 mb-2"><Send className="h-4 w-4 text-blue-500" /><span className="font-semibold text-blue-500">Brevo → Notification/Broadcast</span></div>
                  <p className="text-sm text-muted-foreground mb-2">Medium/low priority, batched</p>
                  <div className="flex flex-wrap gap-1">
                    {["task_assignment", "meeting_invitation", "shooting_assignment", "event_assignment", "weekly_summary", "broadcast"].map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Priority Queue</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <PriorityRow color="bg-red-500" label="High Priority" desc="Auth, Security, Billing → Instant" />
                <PriorityRow color="bg-yellow-500" label="Medium Priority" desc="Tasks, Projects, Meetings → Batched" />
                <PriorityRow color="bg-muted-foreground" label="Low Priority" desc="Summaries, Marketing → Delayed" />
                <div className="pt-3 border-t"><p className="text-xs text-muted-foreground">Worker otomatis setiap 2 menit. Retry sampai 3x.</p></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Providers ─── */}
        <TabsContent value="providers">
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Setup Resend (Transactional)</CardTitle>
                <CardDescription>Biar tidak error saat kirim ke email selain owner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>1.</strong> Buat API key Resend dengan akses <code className="bg-muted px-1 rounded">Sending</code> (boleh send-only).</p>
                <p><strong>2.</strong> Verifikasi domain di Resend (contoh: <code className="bg-muted px-1 rounded">mail.domainkamu.com</code>).</p>
                <p><strong>3.</strong> Tambahkan DNS records dari Resend sampai status <strong>verified</strong>.</p>
                <p><strong>4.</strong> Isi sender email dengan domain verified (contoh: <code className="bg-muted px-1 rounded">support@worka.talco.id</code>).</p>
                <p className="text-muted-foreground">Kalau belum verified domain, Resend memang cuma bisa kirim ke email owner akun Resend.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Setup Brevo (Notification/Broadcast)</CardTitle>
                <CardDescription>Pastikan email benar-benar masuk inbox</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>1.</strong> Tambahkan sender di Brevo dan aktifkan/verifikasi sender-nya.</p>
                <p><strong>2.</strong> (Opsional tapi disarankan) Verifikasi domain untuk deliverability lebih bagus.</p>
                <p><strong>3.</strong> Pastikan ada quota harian (plan free default 300/hari).</p>
                <p><strong>4.</strong> Jika status <code className="bg-muted px-1 rounded">sent</code> tapi email tidak muncul, cek folder spam/promotions.</p>
                <p className="text-muted-foreground">Brevo di sistem kamu sudah connected dan pernah status sent.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Test Email Provider</CardTitle>
              <CardDescription>Kirim test email untuk verifikasi koneksi provider</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="test-email">Email Tujuan Test</Label>
                  <Input id="test-email" type="email" placeholder="your-email@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                  <p className="text-xs text-muted-foreground">💡 Resend tanpa verified domain hanya bisa kirim ke email owner akun Resend. Brevo harus punya verified sender.</p>
                </div>
                <Button onClick={() => handleSendTestEmail("resend")} disabled={!!sendingTest || !testEmail} className="bg-primary">
                  {sendingTest === "resend" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                  Test Resend
                </Button>
                <Button onClick={() => handleSendTestEmail("brevo")} disabled={!!sendingTest || !testEmail} variant="secondary">
                  {sendingTest === "brevo" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Test Brevo
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <ProviderDetailCard
              name="Resend"
              icon={<Zap className="h-5 w-5 text-primary" />}
              connected={connectionResults?.resend?.connected ?? settings?.is_connected ?? null}
              message={connectionResults?.resend?.message}
              details={connectionResults?.resend?.details}
              useCase="Auth, Security, Billing"
              priority="High"
              delivery="Immediate"
            />
            <ProviderDetailCard
              name="Brevo"
              icon={<Send className="h-5 w-5 text-blue-500" />}
              connected={connectionResults?.brevo?.connected ?? null}
              message={connectionResults?.brevo?.message}
              details={connectionResults?.brevo?.details}
              useCase="Tasks, Meetings, Broadcast"
              priority="Medium/Low"
              delivery="Batched (every 2 min)"
            />
          </div>
        </TabsContent>

        {/* ─── Queue ─── */}
        <TabsContent value="queue">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Email Queue</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetchQueue()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
                <Button size="sm" onClick={handleProcessQueue}><Zap className="h-4 w-4 mr-2" />Process Queue Now</Button>
              </div>
            </div>
            {recentQueue && recentQueue.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Waktu</TableHead>
                          <TableHead>Penerima</TableHead>
                          <TableHead>Tipe</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead>Prioritas</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Retry</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentQueue.map((job: any) => (
                          <TableRow key={job.id}>
                            <TableCell className="whitespace-nowrap text-xs">{format(new Date(job.created_at), "dd/MM HH:mm")}</TableCell>
                            <TableCell>
                              <p className="font-medium text-sm">{job.recipient_name}</p>
                              <p className="text-xs text-muted-foreground">{job.recipient_email}</p>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{job.email_type}</Badge></TableCell>
                            <TableCell>
                              <Badge className={job.provider === "resend" ? "bg-primary/10 text-primary" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"}>{job.provider}</Badge>
                            </TableCell>
                            <TableCell>{getPriorityBadge(job.priority)}</TableCell>
                            <TableCell>{getStatusBadge(job.status)}</TableCell>
                            <TableCell className="text-center">{job.retry_count || 0}/{job.max_retries || 3}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card><CardContent className="pt-6"><div className="text-center py-8 text-muted-foreground"><Mail className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>Queue kosong</p></div></CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* ─── Settings ─── */}
        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Konfigurasi Sender</CardTitle>
                <CardDescription>Nama & email pengirim untuk masing-masing provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Dual Provider Active</AlertTitle>
                  <AlertDescription className="text-sm">Resend untuk transactional, Brevo untuk notifications. API Keys via Secrets.</AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Nama Pengirim (Global)</Label>
                  <Input placeholder="WORKA" value={senderName} onChange={e => setSenderName(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Nama yang muncul sebagai pengirim di inbox penerima</p>
                </div>

                {/* Resend Config */}
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /><span className="font-semibold text-primary">Resend — Sender Email</span></div>
                  <Input type="email" placeholder="onboarding@resend.dev" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Untuk testing gunakan <code className="bg-muted px-1 rounded">onboarding@resend.dev</code>. 
                    Untuk production, pakai email dari domain yang sudah verified di Resend (contoh: <code className="bg-muted px-1 rounded">noreply@mail.domainmu.com</code>).
                  </p>
                </div>

                {/* Brevo Config */}
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
                  <div className="flex items-center gap-2"><Send className="h-4 w-4 text-blue-500" /><span className="font-semibold text-blue-500">Brevo — Sender Email</span></div>
                  <Input type="email" placeholder="noreply@domainmu.com" value={brevoSenderEmail} onChange={e => setBrevoSenderEmail(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Harus email yang sudah <strong>verified sebagai sender</strong> di Brevo. Cara cek: Brevo Dashboard → Settings → Senders, Domains & Dedicated IPs → Senders → pilih email yang statusnya ✅ Active.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                    <p className="font-medium">📋 Cara setting sender di Brevo:</p>
                    <p>1. Login ke <code className="bg-muted px-1 rounded">app.brevo.com</code></p>
                    <p>2. Klik <strong>Settings</strong> (gear icon kiri bawah)</p>
                    <p>3. Pilih <strong>Senders, Domains & Dedicated IPs</strong></p>
                    <p>4. Tab <strong>Senders</strong> → klik <strong>Add a sender</strong></p>
                    <p>5. Masukkan nama & email → klik <strong>Save</strong></p>
                    <p>6. Brevo akan kirim email verifikasi → klik link di email itu</p>
                    <p>7. Setelah status ✅ Active, copy email itu ke field di atas</p>
                    <p className="text-muted-foreground pt-1">⚠️ Kalau kosong, sistem akan pakai sender pertama yang aktif di akun Brevo kamu (mungkin bukan email yang kamu mau).</p>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan Pengaturan</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Logs ─── */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Log Email</CardTitle>
                  <CardDescription>Riwayat pengiriman dari semua provider</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchLogs()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : logs && logs.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Penerima</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">{format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell>
                            <p className="font-medium">{log.recipient_name || "-"}</p>
                            <p className="text-sm text-muted-foreground">{log.recipient_email}</p>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                          <TableCell><Badge variant="outline">{log.notification_type}</Badge></TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="max-w-xs">{log.error_message && <p className="text-xs text-destructive whitespace-pre-wrap">{log.error_message}</p>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground"><Mail className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>Belum ada log email</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ───

function StatCard({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: number; label: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${bg}`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityRow({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="font-medium text-sm">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </div>
  );
}

function ProviderStatusCard({ name, icon, role, connected, message, details }: {
  name: string; icon: React.ReactNode; role: string; connected: boolean | null; message?: string; details?: any;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">{icon}<span className="font-semibold">{name}</span></div>
          {connected === null ? (
            <Badge variant="outline" className="gap-1"><WifiOff className="h-3 w-3" />Not Tested</Badge>
          ) : connected ? (
            <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><CheckCircle className="h-3 w-3" />Connected</Badge>
          ) : (
            <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Disconnected</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-2">{role}</p>
        {message && <p className="text-xs bg-muted/50 rounded-lg p-2 break-all">{message}</p>}
        {details && (
          <div className="mt-2 space-y-1">
            {details.domains !== undefined && <p className="text-xs text-muted-foreground">Domains: {details.domains} ({details.verified} verified)</p>}
            {details.company && <p className="text-xs text-muted-foreground">Account: {details.company}</p>}
            {details.email && <p className="text-xs text-muted-foreground">Email: {details.email}</p>}
            {details.configured_sender && <p className="text-xs text-muted-foreground">Configured Sender: {details.configured_sender}</p>}
            {details.senders?.length > 0 && <p className="text-xs text-muted-foreground">Active Senders: {details.senders.join(", ")}</p>}
            {details.hint && <p className="text-xs text-yellow-600 dark:text-yellow-400">⚠️ {details.hint}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProviderDetailCard({ name, icon, connected, message, details, useCase, priority, delivery }: {
  name: string; icon: React.ReactNode; connected: boolean | null; message?: string; details?: any; useCase: string; priority: string; delivery: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{icon} {name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg border">
          {connected === null ? (
            <><WifiOff className="h-8 w-8 text-muted-foreground" /><div><p className="font-semibold text-muted-foreground">⚪ Not Tested</p><p className="text-sm text-muted-foreground">Klik "Check Connection" atau test email</p></div></>
          ) : connected ? (
            <><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="font-semibold text-green-600 dark:text-green-400">🟢 Connected</p><p className="text-sm text-muted-foreground">{message}</p></div></>
          ) : (
            <><XCircle className="h-8 w-8 text-destructive" /><div><p className="font-semibold text-destructive">🔴 Error</p><p className="text-sm text-muted-foreground">{message}</p></div></>
          )}
        </div>
        {details && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
            {details.domains !== undefined && <p>📁 Domains: <strong>{details.domains}</strong> ({details.verified} verified)</p>}
            {details.domain_list?.map((d: any) => (
              <p key={d.name} className="text-xs pl-4">• {d.name} — <Badge variant="outline" className="text-xs">{d.status}</Badge></p>
            ))}
            {details.company && <p>🏢 {details.company}</p>}
            {details.email && <p>📧 {details.email}</p>}
            {details.plan?.map((p: any, i: number) => (
              <p key={i} className="text-xs">💳 {p.type}: {p.credits} credits</p>
            ))}
            {details.email_id && <p className="text-xs text-green-600">✅ Email ID: {details.email_id}</p>}
            {details.message_id && <p className="text-xs text-green-600">✅ Message ID: {details.message_id}</p>}
            {details.send_error && <p className="text-xs text-destructive">⚠️ {details.send_error}</p>}
          </div>
        )}
        <div className="space-y-2 text-sm border-t pt-3">
          <div className="flex justify-between"><span className="text-muted-foreground">Use case:</span><span>{useCase}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Priority:</span><span>{priority}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Delivery:</span><span>{delivery}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}

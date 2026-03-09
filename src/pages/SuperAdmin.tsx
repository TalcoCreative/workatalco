import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, differenceInDays, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  Building2, Users, Search, Ban, CheckCircle2, Eye, Crown, RefreshCw,
  TrendingUp, AlertTriangle, Plus, Shield, DollarSign,
  Calendar, ArrowUpRight, Clock, ChevronRight, LogOut, Mail, Menu,
  UserPlus, BarChart3, Trash2,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Area, AreaChart } from "recharts";
import { Progress } from "@/components/ui/progress";
import { EmailSettingsContent } from "@/components/platform/EmailSettingsContent";
import { DemoRequestsTab } from "@/components/platform/DemoRequestsTab";
import { BlogManagementTab } from "@/components/platform/BlogManagementTab";
import { AdminSidebar } from "@/components/platform/AdminSidebar";
import { AdminMobileNav } from "@/components/platform/AdminMobileNav";
import { EmailTemplatesTab } from "@/components/platform/EmailTemplatesTab";
import { LandingImagesTab } from "@/components/platform/LandingImagesTab";
import { LandingContentTab } from "@/components/platform/LandingContentTab";
import { BroadcastEmailTab } from "@/components/platform/BroadcastEmailTab";
import { IntegrationsTab } from "@/components/platform/IntegrationsTab";
import { ProductsTab } from "@/components/platform/ProductsTab";
import { SeoSettingsTab } from "@/components/platform/SeoSettingsTab";

const TIER_PRICES: Record<string, number> = {
  trial: 0, starter: 7000, professional: 21000, enterprise: 25000, fnf: 0,
};

export default function SuperAdmin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [newCompany, setNewCompany] = useState({ name: "", slug: "", max_users: 3, tier: "trial", adminEmail: "", adminPassword: "", adminFullName: "" });
  const [authorized, setAuthorized] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    const check = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { navigate("/auth", { replace: true }); return; }
      const { data: pa } = await supabase
        .from("platform_admins")
        .select("id")
        .eq("user_id", session.session.user.id)
        .maybeSingle();
      if (!pa) { navigate("/", { replace: true }); return; }
      setAuthorized(true);
    };
    check();
  }, [navigate]);

  // ─── Data Queries ───
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["super-admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: memberCounts = {} } = useQuery({
    queryKey: ["super-admin-member-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("company_members").select("company_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((m: any) => { counts[m.company_id] = (counts[m.company_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: companyMembers = [] } = useQuery({
    queryKey: ["super-admin-company-members", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany) return [];
      const { data } = await supabase.from("company_members").select("user_id, role, joined_at").eq("company_id", selectedCompany.id);
      if (!data || data.length === 0) return [];
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, user_id").in("id", userIds);
      return data.map((m: any) => ({ ...m, profile: profiles?.find((p: any) => p.id === m.user_id) }));
    },
    enabled: !!selectedCompany,
  });

  // ─── Mutations ───
  const suspendMutation = useMutation({
    mutationFn: async ({ id, suspend }: { id: string; suspend: boolean }) => {
      const { error } = await supabase.from("companies").update({ is_suspended: suspend }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.suspend ? "Company suspended" : "Company reactivated");
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
    },
  });

  const tierMutation = useMutation({
    mutationFn: async ({ id, tier, maxUsers }: { id: string; tier: string; maxUsers?: number }) => {
      const update: any = { subscription_tier: tier };
      if (maxUsers) update.max_users = maxUsers;
      const { error } = await supabase.from("companies").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tier updated");
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-company", {
        body: {
          companyName: newCompany.name,
          slug: newCompany.slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
          tier: newCompany.tier,
          maxUsers: newCompany.max_users,
          adminEmail: newCompany.adminEmail,
          adminPassword: newCompany.adminPassword,
          adminFullName: newCompany.adminFullName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Company & admin berhasil dibuat!");
      setCreateOpen(false);
      setNewCompany({ name: "", slug: "", max_users: 3, tier: "trial", adminEmail: "", adminPassword: "", adminFullName: "" });
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-company", {
        body: { companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Company berhasil dihapus. ${data?.deletedUsers || 0} user terhapus.`);
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      setDetailOpen(false);
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-member-counts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ─── Computed Stats ───
  const stats = useMemo(() => {
    const totalUsers = Object.values(memberCounts).reduce((a: number, b: number) => a + b, 0);
    const active = companies.filter((c: any) => !c.is_suspended && c.is_active);
    const trial = companies.filter((c: any) => c.subscription_tier === "trial");
    const suspended = companies.filter((c: any) => c.is_suspended);
    const paying = companies.filter((c: any) => c.subscription_tier !== "trial" && c.subscription_tier !== "fnf" && !c.is_suspended);
    const mrr = paying.reduce((sum: number, c: any) => sum + ((memberCounts[c.id] || 1) * (TIER_PRICES[c.subscription_tier] || 0)), 0);
    const arr = mrr * 12;
    const tierDist = {
      trial: trial.length,
      starter: companies.filter((c: any) => c.subscription_tier === "starter").length,
      professional: companies.filter((c: any) => c.subscription_tier === "professional").length,
      enterprise: companies.filter((c: any) => c.subscription_tier === "enterprise").length,
      fnf: companies.filter((c: any) => c.subscription_tier === "fnf").length,
    };
    const regByMonth: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(new Date(), i);
      const start = startOfMonth(m); const end = endOfMonth(m);
      const count = companies.filter((c: any) => { try { return isWithinInterval(parseISO(c.created_at), { start, end }); } catch { return false; } }).length;
      regByMonth.push({ month: format(start, "MMM yy"), count });
    }
    const revByMonth: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(new Date(), i);
      const start = startOfMonth(m); const end = endOfMonth(m);
      const rev = companies
        .filter((c: any) => { try { return parseISO(c.created_at) <= end && c.subscription_tier !== "trial" && !c.is_suspended; } catch { return false; } })
        .reduce((s: number, c: any) => s + ((memberCounts[c.id] || 1) * (TIER_PRICES[c.subscription_tier] || 0)), 0);
      revByMonth.push({ month: format(start, "MMM yy"), revenue: rev });
    }
    const expiringTrials = trial.filter((c: any) => { const d = differenceInDays(parseISO(c.trial_end), new Date()); return d >= 0 && d <= 7; });
    const recent = companies.filter((c: any) => differenceInDays(new Date(), parseISO(c.created_at)) <= 7);
    return { total: companies.length, active: active.length, trial: trial.length, suspended: suspended.length, paying: paying.length, totalUsers, mrr, arr, tierDist, regByMonth, revByMonth, expiringTrials, recent };
  }, [companies, memberCounts]);

  const filtered = companies.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase()));

  const tierBadge = (tier: string) => {
    const map: Record<string, string> = {
      trial: "bg-warning/10 text-warning border-warning/20",
      starter: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      professional: "bg-primary/10 text-primary border-primary/20",
      enterprise: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      fnf: "bg-pink-500/10 text-pink-600 border-pink-500/20",
    };
    return map[tier] || "bg-muted text-muted-foreground";
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  const getTrialDays = (c: any) => { if (c.subscription_tier !== "trial") return null; return Math.max(0, differenceInDays(parseISO(c.trial_end), new Date())); };
  const regChartConfig = { count: { label: "Registrations", color: "hsl(var(--primary))" } };
  const revChartConfig = { revenue: { label: "Revenue", color: "hsl(142 71% 45%)" } };

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 z-40 border-b border-border/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Crown className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-foreground text-sm">WORKA</span>
              <span className="text-muted-foreground text-sm ml-1.5">Platform Control</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Company</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
          <div className="max-w-6xl mx-auto px-4 py-6 lg:px-8 space-y-6">

            {/* ═══ OVERVIEW ═══ */}
            {activeTab === "overview" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
                  <p className="text-sm text-muted-foreground">Monitor seluruh metrik platform secara real-time</p>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "MRR", value: formatCurrency(stats.mrr), icon: DollarSign, sub: `ARR: ${formatCurrency(stats.arr)}`, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Companies", value: stats.total, icon: Building2, sub: `${stats.paying} paying · ${stats.trial} trial`, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Total Users", value: stats.totalUsers, icon: Users, sub: `~${stats.total > 0 ? Math.round(stats.totalUsers / stats.total) : 0} avg/company`, color: "text-violet-500", bg: "bg-violet-500/10" },
                    { label: "Suspended", value: stats.suspended, icon: Ban, sub: `${stats.expiringTrials.length} trial expiring`, color: "text-destructive", bg: "bg-destructive/10" },
                  ].map((kpi) => (
                    <Card key={kpi.label} className="border-border/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                            <p className="text-xl font-bold text-foreground mt-1 truncate">{kpi.value}</p>
                          </div>
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${kpi.bg}`}>
                            <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{kpi.sub}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Charts */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="border-border/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Registrasi Company</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={regChartConfig} className="h-[200px] w-full">
                        <BarChart data={stats.regByMonth} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card className="border-border/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={revChartConfig} className="h-[200px] w-full">
                        <AreaChart data={stats.revByMonth} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                          <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="revenue" stroke="hsl(142 71% 45%)" fill="url(#revGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Tier + Recent */}
                <div className="grid gap-6 lg:grid-cols-3">
                  <Card className="border-border/30">
                    <CardHeader className="pb-3"><CardTitle className="text-sm">Distribusi Tier</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { key: "trial", label: "Trial", color: "bg-warning", count: stats.tierDist.trial },
                        { key: "starter", label: "Starter", color: "bg-blue-500", count: stats.tierDist.starter },
                        { key: "professional", label: "Professional", color: "bg-primary", count: stats.tierDist.professional },
                        { key: "enterprise", label: "Enterprise", color: "bg-emerald-500", count: stats.tierDist.enterprise },
                        { key: "fnf", label: "FnF (All Access)", color: "bg-pink-500", count: stats.tierDist.fnf },
                      ].map((t) => (
                        <div key={t.key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{t.label}</span>
                            <span className="font-semibold">{t.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${t.color} transition-all`} style={{ width: `${stats.total > 0 ? (t.count / stats.total) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-border/30 lg:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Pendaftaran Terbaru</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stats.recent.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Belum ada</p>
                      ) : (
                        <div className="space-y-2">
                          {stats.recent.slice(0, 5).map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/30 p-3 hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">{c.name.charAt(0)}</div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{c.name}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">/{c.slug}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className={`text-[10px] ${tierBadge(c.subscription_tier)}`}>{c.subscription_tier}</Badge>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedCompany(c); setDetailOpen(true); }}>
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ═══ COMPANIES ═══ */}
            {activeTab === "companies" && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h1 className="text-2xl font-bold text-foreground">Companies</h1>
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Cari company..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <Card className="border-border/30">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Tier</TableHead>
                            <TableHead className="text-center">Users</TableHead>
                            <TableHead className="hidden md:table-cell">Est. Monthly</TableHead>
                            <TableHead className="hidden sm:table-cell">Trial</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden lg:table-cell">Registered</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
                          {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ditemukan</TableCell></TableRow>}
                          {filtered.map((c: any) => {
                            const users = memberCounts[c.id] || 0;
                            const monthly = users * (TIER_PRICES[c.subscription_tier] || 0);
                            const trialDays = getTrialDays(c);
                            return (
                              <TableRow key={c.id} className={c.is_suspended ? "opacity-60" : ""}>
                                <TableCell>
                                  <div><p className="font-medium text-sm">{c.name}</p><p className="text-[10px] text-muted-foreground font-mono">/{c.slug}</p></div>
                                </TableCell>
                                <TableCell><Badge variant="outline" className={`text-[10px] ${tierBadge(c.subscription_tier)}`}>{c.subscription_tier}</Badge></TableCell>
                                <TableCell className="text-center"><span className="font-semibold text-sm">{users}</span><span className="text-muted-foreground text-[10px]">/{c.max_users}</span></TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <span className={monthly > 0 ? "font-medium text-emerald-600 text-sm" : "text-muted-foreground text-sm"}>{monthly > 0 ? formatCurrency(monthly) : "—"}</span>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  {trialDays !== null ? <span className={`text-xs font-medium ${trialDays === 0 ? "text-destructive" : trialDays <= 3 ? "text-warning" : "text-muted-foreground"}`}>{trialDays === 0 ? "Expired" : `${trialDays}d`}</span> : <span className="text-xs text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell>
                                  {c.is_suspended ? (
                                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-[10px]"><Ban className="h-3 w-3" /> Off</Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[10px]"><CheckCircle2 className="h-3 w-3" /> On</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{format(parseISO(c.created_at), "dd MMM yyyy")}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedCompany(c); setDetailOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => suspendMutation.mutate({ id: c.id, suspend: !c.is_suspended })}>
                                      {c.is_suspended ? <RefreshCw className="h-3.5 w-3.5 text-emerald-500" /> : <Ban className="h-3.5 w-3.5 text-destructive" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDeleteTarget(c); setDeleteConfirmOpen(true); }}>
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ═══ REVENUE ═══ */}
            {activeTab === "revenue" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "MRR", value: formatCurrency(stats.mrr), sub: `${stats.paying} paying companies` },
                    { label: "ARR", value: formatCurrency(stats.arr), sub: "Estimasi tahunan" },
                    { label: "Avg/Company", value: formatCurrency(stats.paying > 0 ? stats.mrr / stats.paying : 0), sub: "Per bulan" },
                  ].map((r) => (
                    <Card key={r.label} className="border-border/30">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{r.label}</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{r.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{r.sub}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card className="border-border/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Revenue Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Tier</TableHead>
                            <TableHead className="text-center">Users</TableHead>
                            <TableHead>Monthly</TableHead>
                            <TableHead className="hidden sm:table-cell">Annual</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {companies.filter((c: any) => c.subscription_tier !== "trial").sort((a: any, b: any) => {
                            const ra = (memberCounts[a.id] || 0) * (TIER_PRICES[a.subscription_tier] || 0);
                            const rb = (memberCounts[b.id] || 0) * (TIER_PRICES[b.subscription_tier] || 0);
                            return rb - ra;
                          }).map((c: any) => {
                            const users = memberCounts[c.id] || 0;
                            const monthly = users * (TIER_PRICES[c.subscription_tier] || 0);
                            return (
                              <TableRow key={c.id}>
                                <TableCell className="font-medium text-sm">{c.name}</TableCell>
                                <TableCell><Badge variant="outline" className={`text-[10px] ${tierBadge(c.subscription_tier)}`}>{c.subscription_tier}</Badge></TableCell>
                                <TableCell className="text-center font-semibold text-sm">{users}</TableCell>
                                <TableCell className="font-semibold text-emerald-600 text-sm">{formatCurrency(monthly)}</TableCell>
                                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatCurrency(monthly * 12)}</TableCell>
                              </TableRow>
                            );
                          })}
                          {companies.filter((c: any) => c.subscription_tier !== "trial").length === 0 && (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada paying company</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ═══ ALERTS ═══ */}
            {activeTab === "alerts" && (
              <div className="space-y-4 animate-fade-in">
                <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
                <Card className="border-border/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Trial Expiring (7 hari)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.expiringTrials.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Tidak ada</p>
                    ) : (
                      <div className="space-y-2">
                        {stats.expiringTrials.map((c: any) => {
                          const daysLeft = differenceInDays(parseISO(c.trial_end), new Date());
                          return (
                            <div key={c.id} className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/5 p-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <Clock className="h-4 w-4 text-warning shrink-0" />
                                <div className="min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-[10px] text-muted-foreground">{memberCounts[c.id] || 0} users</p></div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">{daysLeft === 0 ? "Expired" : `${daysLeft}d`}</Badge>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelectedCompany(c); setDetailOpen(true); }}>Manage</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-border/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Ban className="h-4 w-4 text-destructive" /> Suspended</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {companies.filter((c: any) => c.is_suspended).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Tidak ada</p>
                    ) : (
                      <div className="space-y-2">
                        {companies.filter((c: any) => c.is_suspended).map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                            <div><p className="text-sm font-medium">{c.name}</p><p className="text-[10px] text-muted-foreground">{memberCounts[c.id] || 0} users</p></div>
                            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => suspendMutation.mutate({ id: c.id, suspend: false })}><RefreshCw className="h-3 w-3" /> Reactivate</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ═══ DEMOS ═══ */}
            {activeTab === "demos" && <div className="animate-fade-in"><DemoRequestsTab /></div>}

            {/* ═══ BLOG ═══ */}
            {activeTab === "blog" && <div className="animate-fade-in"><BlogManagementTab /></div>}

            {/* ═══ EMAIL SETTINGS ═══ */}
            {activeTab === "email" && <div className="animate-fade-in"><EmailSettingsContent /></div>}

            {/* ═══ EMAIL TEMPLATES ═══ */}
            {activeTab === "email-templates" && <div className="animate-fade-in"><EmailTemplatesTab /></div>}

            {/* ═══ BROADCAST ═══ */}
            {activeTab === "broadcast" && <div className="animate-fade-in"><BroadcastEmailTab /></div>}

            {/* ═══ LANDING PAGE CMS ═══ */}
            {activeTab === "landing-page" && <div className="animate-fade-in"><LandingContentTab /></div>}

            {/* ═══ LANDING IMAGES ═══ */}
            {activeTab === "landing" && <div className="animate-fade-in"><LandingImagesTab /></div>}

            {/* ═══ INTEGRATIONS ═══ */}
            {activeTab === "integrations" && <div className="animate-fade-in"><IntegrationsTab /></div>}

            {/* ═══ PRODUCTS ═══ */}
            {activeTab === "products" && <div className="animate-fade-in"><ProductsTab /></div>}

            {/* ═══ SEO ═══ */}
            {activeTab === "seo" && <div className="animate-fade-in"><SeoSettingsTab /></div>}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <AdminMobileNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ═══ COMPANY DETAIL DIALOG ═══ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> {selectedCompany?.name}</DialogTitle>
            <DialogDescription className="font-mono text-xs">/{selectedCompany?.slug}</DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <Tabs defaultValue="info" className="mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="members">Members ({companyMembers.length})</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Created", value: format(parseISO(selectedCompany.created_at), "dd MMM yyyy HH:mm") },
                    { label: "Trial End", value: format(parseISO(selectedCompany.trial_end), "dd MMM yyyy") },
                    { label: "Users", value: `${memberCounts[selectedCompany.id] || 0} / ${selectedCompany.max_users}` },
                    { label: "Status", value: selectedCompany.is_suspended ? "Suspended" : "Active" },
                  ].map((info) => (
                    <div key={info.label} className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[10px] text-muted-foreground">{info.label}</p>
                      <p className="font-medium text-sm">{info.value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Subscription Tier</Label>
                  <Select
                    value={selectedCompany.subscription_tier}
                    onValueChange={(val) => {
                      const maxMap: Record<string, number> = { trial: 3, starter: 10, professional: 30, enterprise: 100, fnf: 999 };
                      tierMutation.mutate({ id: selectedCompany.id, tier: val, maxUsers: maxMap[val] || 10 });
                      setSelectedCompany({ ...selectedCompany, subscription_tier: val, max_users: maxMap[val] || 10 });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial (3)</SelectItem>
                      <SelectItem value="starter">Starter (10)</SelectItem>
                      <SelectItem value="professional">Professional (30)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (100)</SelectItem>
                      <SelectItem value="fnf">FnF — All Access (∞)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Max Users Override</Label>
                  <Input type="number" value={selectedCompany.max_users}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, max_users: parseInt(e.target.value) || 3 })}
                    onBlur={() => tierMutation.mutate({ id: selectedCompany.id, tier: selectedCompany.subscription_tier, maxUsers: selectedCompany.max_users })}
                  />
                </div>
                <Button
                  variant={selectedCompany.is_suspended ? "default" : "destructive"}
                  className="w-full gap-2"
                  onClick={() => {
                    suspendMutation.mutate({ id: selectedCompany.id, suspend: !selectedCompany.is_suspended });
                    setSelectedCompany({ ...selectedCompany, is_suspended: !selectedCompany.is_suspended });
                  }}
                >
                  {selectedCompany.is_suspended ? <><RefreshCw className="h-4 w-4" /> Reactivate</> : <><Ban className="h-4 w-4" /> Suspend</>}
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 mt-2"
                  onClick={() => { setDeleteTarget(selectedCompany); setDeleteConfirmOpen(true); }}
                >
                  <Trash2 className="h-4 w-4" /> Hapus Company Permanen
                </Button>
              </TabsContent>

              <TabsContent value="members" className="mt-4">
                <div className="space-y-2">
                  {companyMembers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No members</p>}
                  {companyMembers.map((m: any) => (
                    <div key={m.user_id} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                      <div><p className="text-sm font-medium">{m.profile?.full_name || "Unknown"}</p><p className="text-[10px] text-muted-foreground">{m.profile?.user_id}</p></div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] gap-1"><Shield className="h-3 w-3" /> {m.role}</Badge>
                        <span className="text-[10px] text-muted-foreground">{format(parseISO(m.joined_at), "dd MMM yy")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="billing" className="mt-4 space-y-3">
                {(() => {
                  const users = memberCounts[selectedCompany.id] || 0;
                  const price = TIER_PRICES[selectedCompany.subscription_tier] || 0;
                  const monthly = users * price;
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-muted/50 p-3"><p className="text-[10px] text-muted-foreground">Price/User</p><p className="font-bold text-lg">{formatCurrency(price)}</p></div>
                        <div className="rounded-xl bg-emerald-500/10 p-3"><p className="text-[10px] text-muted-foreground">Monthly</p><p className="font-bold text-lg text-emerald-600">{formatCurrency(monthly)}</p></div>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-3"><p className="text-[10px] text-muted-foreground">Annual</p><p className="font-bold text-lg">{formatCurrency(monthly * 12)}</p></div>
                    </>
                  );
                })()}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ CREATE COMPANY DIALOG ═══ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Daftarkan Company Baru</DialogTitle>
            <DialogDescription>Buat workspace baru beserta akun admin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Info Company</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Nama</Label><Input value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") })} placeholder="Agency XYZ" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Slug</Label><Input value={newCompany.slug} onChange={(e) => setNewCompany({ ...newCompany, slug: e.target.value })} placeholder="agency-xyz" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Tier</Label>
                <Select value={newCompany.tier} onValueChange={(val) => { const maxMap: Record<string, number> = { trial: 3, starter: 10, professional: 30, enterprise: 100, fnf: 999 }; setNewCompany({ ...newCompany, tier: val, max_users: maxMap[val] || 3 }); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="fnf">FnF — All Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Max Users</Label><Input type="number" value={newCompany.max_users} onChange={(e) => setNewCompany({ ...newCompany, max_users: parseInt(e.target.value) || 3 })} /></div>
            </div>
            <div className="border-t border-border/30 pt-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Super Admin</p>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Nama Lengkap</Label><Input value={newCompany.adminFullName} onChange={(e) => setNewCompany({ ...newCompany, adminFullName: e.target.value })} placeholder="John Doe" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input type="email" value={newCompany.adminEmail} onChange={(e) => setNewCompany({ ...newCompany, adminEmail: e.target.value })} placeholder="admin@company.com" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Password</Label><Input type="password" value={newCompany.adminPassword} onChange={(e) => setNewCompany({ ...newCompany, adminPassword: e.target.value })} placeholder="Min 6 karakter" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={() => createCompanyMutation.mutate()} disabled={!newCompany.name || !newCompany.slug || !newCompany.adminEmail || !newCompany.adminPassword || !newCompany.adminFullName || createCompanyMutation.isPending}>
              {createCompanyMutation.isPending ? "Membuat..." : "Daftarkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE COMPANY CONFIRMATION ═══ */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(open) => { setDeleteConfirmOpen(open); if (!open) { setDeleteTarget(null); setDeleteConfirmText(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Hapus Company</DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus <strong>{deleteTarget?.name}</strong> beserta semua data dan user yang terkait secara permanen. Tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              <p className="font-medium mb-1">⚠️ Data yang akan dihapus:</p>
              <ul className="text-xs space-y-0.5 list-disc list-inside">
                <li>Semua data company (klien, project, task, dsb)</li>
                <li>Semua user yang hanya terdaftar di company ini</li>
                <li>Akun auth user akan dihapus dari sistem</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ketik <span className="font-mono font-bold text-destructive">{deleteTarget?.slug}</span> untuk konfirmasi:</Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteTarget?.slug}
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); setDeleteConfirmText(""); }}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== deleteTarget?.slug || deleteCompanyMutation.isPending}
              onClick={() => deleteTarget && deleteCompanyMutation.mutate(deleteTarget.id)}
            >
              {deleteCompanyMutation.isPending ? "Menghapus..." : "Hapus Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

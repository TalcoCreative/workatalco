import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Send, Plus, Eye, Trash2, Radio, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

export function BroadcastEmailTab() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({
    subject: "", body_html: "", filter_company: "", filter_role: "", filter_tier: "",
  });

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ["email-broadcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_broadcasts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["broadcast-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: queueStats } = useQuery({
    queryKey: ["email-queue-stats"],
    queryFn: async () => {
      const { data: pending } = await supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "pending");
      const { data: processing } = await supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "processing");
      const { data: failed } = await supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "failed");
      return { pending: (pending as any)?.length || 0, processing: (processing as any)?.length || 0, failed: (failed as any)?.length || 0 };
    },
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("email_broadcasts").insert({
        subject: form.subject,
        body_html: form.body_html,
        filter_company: form.filter_company || null,
        filter_role: form.filter_role || null,
        filter_tier: form.filter_tier || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Broadcast created");
      queryClient.invalidateQueries({ queryKey: ["email-broadcasts"] });
      setCreateOpen(false);
      setForm({ subject: "", body_html: "", filter_company: "", filter_role: "", filter_tier: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendMutation = useMutation({
    mutationFn: async (broadcastId: string) => {
      const { data, error } = await supabase.functions.invoke("send-broadcast", {
        body: { broadcast_id: broadcastId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Broadcast queued: ${data.enqueued} emails`);
      queryClient.invalidateQueries({ queryKey: ["email-broadcasts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_broadcasts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["email-broadcasts"] });
    },
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: any }> = {
      draft: { color: "bg-muted text-muted-foreground", icon: Clock },
      sending: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Loader2 },
      sent: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
      failed: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
    };
    const m = map[status] || map.draft;
    return (
      <Badge variant="outline" className={`text-[10px] gap-1 ${m.color}`}>
        <m.icon className={`h-3 w-3 ${status === "sending" ? "animate-spin" : ""}`} />
        {status}
      </Badge>
    );
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Broadcast Email</h2>
            <p className="text-sm text-muted-foreground">Kirim email massal ke user platform via Brevo</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Buat Broadcast
        </Button>
      </div>

      {/* Queue stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: queueStats?.pending || 0, color: "text-amber-600" },
          { label: "Processing", value: queueStats?.processing || 0, color: "text-blue-600" },
          { label: "Failed", value: queueStats?.failed || 0, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="border-border/30">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Broadcasts list */}
      <Card className="border-border/30">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Recipients</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada broadcast</TableCell></TableRow>
              )}
              {broadcasts.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium text-sm max-w-[200px] truncate">{b.subject}</TableCell>
                  <TableCell>{statusBadge(b.status)}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold text-sm">{b.sent_count || 0}</span>
                    <span className="text-muted-foreground text-[10px]">/{b.total_recipients || 0}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {format(parseISO(b.created_at), "dd MMM yy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelected(b); setPreviewOpen(true); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {b.status === "draft" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => sendMutation.mutate(b.id)} disabled={sendMutation.isPending}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(b.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Buat Broadcast Email</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="📢 Pengumuman penting..." />
            </div>
            <div className="space-y-2">
              <Label>Body HTML</Label>
              <Textarea value={form.body_html} onChange={(e) => setForm({ ...form, body_html: e.target.value })} className="min-h-[200px] font-mono text-xs" placeholder="<h2>Halo!</h2><p>Ini pengumuman penting...</p>" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Filter Company</Label>
                <Select value={form.filter_company} onValueChange={(v) => setForm({ ...form, filter_company: v === "all" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Company</SelectItem>
                    {companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Filter Tier</Label>
                <Select value={form.filter_tier} onValueChange={(v) => setForm({ ...form, filter_tier: v === "all" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tier</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!form.subject || !form.body_html || createMutation.isPending}>
              {createMutation.isPending ? "Membuat..." : "Simpan Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Preview: {selected?.subject}</DialogTitle></DialogHeader>
          <div className="border rounded-xl overflow-hidden bg-white">
            <div className="p-4" dangerouslySetInnerHTML={{ __html: selected?.body_html || "" }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

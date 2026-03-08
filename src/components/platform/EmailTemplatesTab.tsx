import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Edit3, Eye, Save, Mail } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  task_assignment: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  task_completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  task_status_change: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  task_mention: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  task_overdue: "bg-red-500/10 text-red-600 border-red-500/20",
  meeting_invitation: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  shooting_assignment: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  shooting_status_update: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  event_assignment: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  project_assignment: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
};

const PREVIEW_VARS: Record<string, string> = {
  "{{recipient_name}}": "John Doe",
  "{{title}}": "Contoh Judul Task",
  "{{creator_name}}": "Admin User",
  "{{deadline}}": "15 Maret 2026",
  "{{priority}}": "High",
  "{{status}}": "In Progress",
  "{{link}}": "#",
  "{{location}}": "Jakarta Office",
  "{{comment_content}}": "Ini contoh komentar mention",
  "{{updated_at}}": "8 Maret 2026, 14:30",
};

const replaceVars = (text: string) => {
  let result = text;
  for (const [key, val] of Object.entries(PREVIEW_VARS)) {
    result = result.split(key).join(val);
  }
  return result;
};

interface EditForm {
  subject: string;
  greeting: string;
  main_message: string;
  button_text: string;
  footer_text: string;
  is_active: boolean;
}

export function EmailTemplatesTab() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    subject: "", greeting: "", main_message: "", button_text: "", footer_text: "", is_active: true,
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("template_name");
      if (error) throw error;
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from("email_templates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template berhasil diupdate");
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setEditOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("email_templates")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-templates"] }),
  });

  const openEdit = (template: any) => {
    setSelected(template);
    setEditForm({
      subject: template.subject,
      greeting: template.greeting || "Hai {{recipient_name}} 👋",
      main_message: template.main_message || "Ada update baru buat lo:",
      button_text: template.button_text || "Lihat Detail",
      footer_text: template.footer_text || "Kalau ini penting, jangan di-skip ya 😎",
      is_active: template.is_active,
    });
    setEditOpen(true);
  };

  const openPreview = (template: any) => {
    setSelected(template);
    setPreviewOpen(true);
  };

  const buildPreviewHtml = (t: any) => {
    const greeting = replaceVars(t.greeting || "Hai {{recipient_name}} 👋");
    const mainMsg = replaceVars(t.main_message || "Ada update baru buat lo:");
    const btnText = replaceVars(t.button_text || "Lihat Detail");
    const footer = replaceVars(t.footer_text || "");
    const subject = replaceVars(t.subject || "");

    return `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#2563eb;margin:0;font-size:24px;">Talco System</h1>
          </div>
          <p style="font-size:18px;color:#333;">${greeting}</p>
          <p style="color:#555;font-size:16px;">${mainMsg}</p>
          <div style="background:#f8fafc;border-left:4px solid #2563eb;padding:16px;margin:20px 0;border-radius:0 8px 8px 0;">
            <p style="margin:8px 0;"><strong>📌 Jenis:</strong> ${t.template_name}</p>
            <p style="margin:8px 0;"><strong>📝 Judul:</strong> ${PREVIEW_VARS["{{title}}"]}</p>
            <p style="margin:8px 0;"><strong>📅 Deadline:</strong> ${PREVIEW_VARS["{{deadline}}"]}</p>
            <p style="margin:8px 0;"><strong>👤 Oleh:</strong> ${PREVIEW_VARS["{{creator_name}}"]}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="#" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;">🔗 ${btnText}</a>
          </div>
          ${footer ? `<p style="color:#555;font-style:italic;">${footer}</p>` : ""}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <div style="text-align:center;">
            <p style="color:#2563eb;font-weight:bold;margin:0;">— Talco System</p>
            <p style="color:#888;font-size:14px;margin:8px 0 0 0;">Biar kerjaan rapi & tim makin enak kerjanya ✨</p>
          </div>
        </div>
      </div>
    `;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Email Templates</h2>
          <p className="text-sm text-muted-foreground">Customize pesan notifikasi email — HTML tetap default, edit teks saja</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t: any) => (
          <Card key={t.id} className={`border-border/50 transition-all hover:shadow-md ${!t.is_active ? "opacity-60" : ""}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={TYPE_COLORS[t.template_key] || "bg-muted text-muted-foreground"}>
                  {t.template_key}
                </Badge>
                <Switch
                  checked={t.is_active}
                  onCheckedChange={(checked) => toggleActive.mutate({ id: t.id, is_active: checked })}
                />
              </div>
              <CardTitle className="text-sm mt-2">{t.template_name}</CardTitle>
              <CardDescription className="text-xs truncate">{t.subject}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => openPreview(t)}>
                  <Eye className="h-3.5 w-3.5" /> Preview
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => openEdit(t)}>
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Variables reference */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Template Variables</CardTitle>
          <CardDescription className="text-xs">Gunakan variabel berikut di subject dan pesan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PREVIEW_VARS).map(v => (
              <code key={v} className="text-xs bg-muted px-2 py-1 rounded-md font-mono">{v}</code>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog - text fields only */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" /> Edit: {selected?.template_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject Email</Label>
              <Input
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                placeholder="Subject email..."
              />
              <p className="text-xs text-muted-foreground">Contoh: Tugas Baru: {"{{title}}"}</p>
            </div>
            <div className="space-y-2">
              <Label>Greeting / Sapaan</Label>
              <Input
                value={editForm.greeting}
                onChange={(e) => setEditForm({ ...editForm, greeting: e.target.value })}
                placeholder="Hai {{recipient_name}} 👋"
              />
            </div>
            <div className="space-y-2">
              <Label>Pesan Utama</Label>
              <Input
                value={editForm.main_message}
                onChange={(e) => setEditForm({ ...editForm, main_message: e.target.value })}
                placeholder="Lo baru aja dapet tugas baru nih:"
              />
            </div>
            <div className="space-y-2">
              <Label>Teks Tombol</Label>
              <Input
                value={editForm.button_text}
                onChange={(e) => setEditForm({ ...editForm, button_text: e.target.value })}
                placeholder="Lihat Detail"
              />
            </div>
            <div className="space-y-2">
              <Label>Pesan Footer</Label>
              <Input
                value={editForm.footer_text}
                onChange={(e) => setEditForm({ ...editForm, footer_text: e.target.value })}
                placeholder="Kalau ini penting, jangan di-skip ya 😎"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
              />
              <Label>Template Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button
              onClick={() => updateMutation.mutate({
                id: selected?.id,
                subject: editForm.subject,
                greeting: editForm.greeting,
                main_message: editForm.main_message,
                button_text: editForm.button_text,
                footer_text: editForm.footer_text,
                is_active: editForm.is_active,
              })}
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Preview: {selected?.template_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Subject: </span>
              <span className="font-medium">{selected ? replaceVars(selected.subject) : ""}</span>
            </div>
            <div className="border rounded-xl overflow-hidden bg-white">
              <div
                className="p-0"
                dangerouslySetInnerHTML={{ __html: selected ? buildPreviewHtml(selected) : "" }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

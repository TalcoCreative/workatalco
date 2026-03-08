import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bell, Mail, Calendar, Camera, Briefcase, BarChart3, Megaphone, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const PREFERENCE_ITEMS = [
  { key: "task_notifications", label: "Task Notifications", desc: "Assignment, status changes, mentions, overdue", icon: Briefcase },
  { key: "project_updates", label: "Project Updates", desc: "Assignment ke project baru", icon: BarChart3 },
  { key: "meeting_invitations", label: "Meeting Invitations", desc: "Undangan meeting baru", icon: Calendar },
  { key: "shooting_notifications", label: "Shooting Notifications", desc: "Jadwal shooting & update status", icon: Camera },
  { key: "event_notifications", label: "Event Notifications", desc: "Assignment event", icon: Calendar },
  { key: "weekly_reports", label: "Weekly Reports", desc: "Laporan mingguan aktivitas", icon: BarChart3 },
  { key: "product_updates", label: "Product Updates", desc: "Fitur baru & pengumuman", icon: Sparkles },
  { key: "marketing_emails", label: "Marketing Emails", desc: "Broadcast & promo dari platform", icon: Megaphone },
] as const;

export function EmailPreferencesCard() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
  }, []);

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["email-preferences", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("email_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, boolean>) => {
      if (!userId) throw new Error("Not authenticated");
      
      if (prefs) {
        const { error } = await supabase
          .from("email_preferences")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_preferences")
          .insert({ user_id: userId, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-preferences", userId] });
      toast.success("Preferensi email diupdate");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getValue = (key: string): boolean => {
    if (!prefs) return key !== "weekly_reports" && key !== "marketing_emails"; // defaults
    return (prefs as any)[key] ?? true;
  };

  if (isLoading) return <div className="animate-pulse h-64 bg-muted rounded-xl" />;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-primary" /> Preferensi Email
        </CardTitle>
        <CardDescription>Pilih jenis email notifikasi yang ingin kamu terima</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {PREFERENCE_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-xl border border-border/30 p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            </div>
            <Switch
              checked={getValue(item.key)}
              onCheckedChange={(checked) => updateMutation.mutate({ [item.key]: checked })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

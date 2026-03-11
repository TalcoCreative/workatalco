import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, BellRing, Smartphone, AlertTriangle } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useCompanySlug } from "@/hooks/useCompanySlug";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function PushNotificationCard() {
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushNotifications();
  const companySlug = useCompanySlug();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
        toast.success("Push notification dinonaktifkan");
      } else {
        // Need companyId from slug
        const { data: company } = await supabase
          .from("companies")
          .select("id")
          .eq("slug", companySlug)
          .maybeSingle();
        
        if (!company) {
          toast.error("Company tidak ditemukan");
          return;
        }

        const ok = await subscribe(company.id);
        if (ok) {
          toast.success("Push notification aktif! 🎉");
        } else if (permission === "denied") {
          toast.error("Notifikasi diblokir oleh browser. Ubah di pengaturan browser Anda.");
        } else {
          toast.error("Gagal mengaktifkan push notification");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", companySlug)
        .maybeSingle();

      const { data: sess } = await supabase.auth.getSession();
      if (!company || !sess.session) {
        toast.error("Gagal mengirim test notification");
        return;
      }

      await supabase.functions.invoke("send-push-notification", {
        body: {
          company_id: company.id,
          user_id: sess.session.user.id,
          title: "🔔 Test Notifikasi WORKA",
          message: "Push notification berhasil! Notifikasi ini adalah test.",
          action_url: `/${companySlug}/profile`,
          event_type: "test",
        },
      });

      toast.success("Test notifikasi terkirim!");
    } catch {
      toast.error("Gagal mengirim test notification");
    } finally {
      setTesting(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellOff className="h-4 w-4" />
            Push Notification
          </CardTitle>
          <CardDescription>
            Browser Anda tidak mendukung push notification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Push notification membutuhkan browser modern (Chrome, Firefox, Edge, Safari 16.4+).
              Pastikan Anda menggunakan versi terbaru.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Push Notification
        </CardTitle>
        <CardDescription>
          Terima notifikasi langsung di perangkat Anda untuk task, meeting, dan event penting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {isSubscribed ? "Notifikasi Aktif" : "Aktifkan Notifikasi"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isSubscribed
                  ? "Anda akan menerima notifikasi push di perangkat ini"
                  : "Klik untuk mengaktifkan notifikasi di perangkat ini"}
              </p>
            </div>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>

        {permission === "denied" && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Notifikasi diblokir oleh browser. Buka pengaturan browser → Izin Notifikasi → 
              izinkan untuk situs ini, lalu coba lagi.
            </p>
          </div>
        )}

        {isSubscribed && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testing}
            className="gap-2"
          >
            <BellRing className="h-4 w-4" />
            {testing ? "Mengirim..." : "Test Notifikasi"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

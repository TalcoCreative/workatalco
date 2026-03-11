import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Globe, Lock, Bell, BellRing, CheckCircle2, XCircle } from "lucide-react";

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSettingsDialog({ open, onOpenChange }: ProfileSettingsDialogProps) {
  const queryClient = useQueryClient();
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");

  const { data: profile } = useQuery({
    queryKey: ["my-profile-settings"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, language")
        .eq("id", session.user.id)
        .single();
      return data as any;
    },
    enabled: open,
  });

  const [language, setLanguage] = useState("id");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Sync language and notification permission
  useEffect(() => {
    if (profile?.language) setLanguage(profile.language);
  }, [profile?.language]);

  useEffect(() => {
    if (!("Notification" in window)) {
      setNotifPermission("unsupported");
    } else {
      setNotifPermission(Notification.permission);
    }
  }, [open]);

  const langMutation = useMutation({
    mutationFn: async (lang: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { error } = await (supabase
        .from("profiles")
        .update({ language: lang } as any)
        .eq("id", session.user.id));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile-settings"] });
      toast.success("Bahasa berhasil diubah");
    },
  });

  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    langMutation.mutate(val);
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Password tidak cocok");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password berhasil diubah");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengubah password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Browser Anda tidak mendukung notifikasi");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "granted") {
        toast.success("Notifikasi diizinkan! 🎉");
      } else if (permission === "denied") {
        toast.error("Notifikasi diblokir. Ubah di pengaturan browser.");
      }
    } catch {
      toast.error("Gagal meminta izin notifikasi");
    }
  };

  const handleTestNotification = () => {
    if (notifPermission !== "granted") {
      toast.error("Izinkan notifikasi terlebih dahulu");
      return;
    }
    const notif = new Notification("🔔 Test Notifikasi WORKA", {
      body: "Notifikasi push berhasil! Anda akan menerima pemberitahuan penting di sini.",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: "test-notification",
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    toast.success("Notifikasi test terkirim!");
  };

  const permissionLabel = {
    granted: { text: "Diizinkan", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
    denied: { text: "Diblokir", color: "bg-destructive/15 text-destructive border-destructive/20", icon: XCircle },
    default: { text: "Belum diatur", color: "bg-muted text-muted-foreground border-border", icon: Bell },
    unsupported: { text: "Tidak didukung", color: "bg-muted text-muted-foreground border-border", icon: XCircle },
  };

  const currentPerm = permissionLabel[notifPermission];
  const PermIcon = currentPerm.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Profile Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="language" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="language" className="flex-1 gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Language
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1 gap-1.5">
              <BellRing className="h-3.5 w-3.5" />
              Notifikasi
            </TabsTrigger>
            <TabsTrigger value="password" className="flex-1 gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="language" className="space-y-4">
            <div className="space-y-2">
              <Label>Pilih bahasa sistem</Label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">🇮🇩 Bahasa Indonesia</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Perubahan bahasa hanya berlaku untuk akun Anda
              </p>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="rounded-xl border border-border/50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Push Notification</p>
                  <p className="text-xs text-muted-foreground">Status izin notifikasi di perangkat ini</p>
                </div>
                <Badge variant="outline" className={`gap-1.5 ${currentPerm.color}`}>
                  <PermIcon className="h-3 w-3" />
                  {currentPerm.text}
                </Badge>
              </div>

              {notifPermission === "unsupported" ? (
                <p className="text-xs text-muted-foreground">
                  Browser Anda tidak mendukung notifikasi push. Gunakan Chrome, Firefox, atau Edge versi terbaru.
                </p>
              ) : notifPermission === "denied" ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Notifikasi diblokir. Untuk mengaktifkan kembali, buka pengaturan browser → Site Settings → Notifications, lalu izinkan untuk situs ini.
                  </p>
                </div>
              ) : notifPermission === "granted" ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    ✅ Notifikasi aktif! Anda akan menerima pemberitahuan task, meeting, dan update penting.
                  </p>
                  <Button onClick={handleTestNotification} variant="outline" className="w-full gap-2">
                    <BellRing className="h-4 w-4" />
                    Test Push Notification
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Aktifkan notifikasi untuk menerima pemberitahuan task baru, undangan meeting, dan update penting langsung di perangkat Anda.
                  </p>
                  <Button onClick={handleRequestPermission} className="w-full gap-2">
                    <Bell className="h-4 w-4" />
                    Izinkan Notifikasi
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
              />
            </div>
            <Button
              onClick={handlePasswordChange}
              disabled={changingPassword || !newPassword || !confirmPassword}
              className="w-full"
            >
              {changingPassword ? "Mengubah..." : "Ubah Password"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

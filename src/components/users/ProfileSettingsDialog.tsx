import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Globe, Lock, Bell, BellRing, CheckCircle2, XCircle, Smartphone, Monitor } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ProfileSettingsContent({ open }: { open: boolean }) {
  const queryClient = useQueryClient();
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const isMobile = useIsMobile();

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
        // Register service worker for push if available
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.ready;
          console.log("Service Worker ready for notifications", registration);
        }
      } else if (permission === "denied") {
        toast.error("Notifikasi diblokir. Ubah di pengaturan browser/perangkat.");
      }
    } catch {
      toast.error("Gagal meminta izin notifikasi");
    }
  };

  const handleTestNotification = async () => {
    if (notifPermission !== "granted") {
      toast.error("Izinkan notifikasi terlebih dahulu");
      return;
    }

    try {
      // Use Service Worker to show notification (works on mobile)
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("🔔 Test Notifikasi WORKA", {
          body: "Push notification berhasil! Anda akan menerima pemberitahuan penting di perangkat ini.",
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-192x192.png",
          tag: "test-notification",
        } as NotificationOptions);
        toast.success("Notifikasi test terkirim!");
      } else {
        // Fallback for browsers without SW
        new Notification("🔔 Test Notifikasi WORKA", {
          body: "Push notification berhasil!",
          icon: "/icons/icon-192x192.png",
        });
        toast.success("Notifikasi test terkirim!");
      }
    } catch (err) {
      console.error("Notification error:", err);
      toast.error("Gagal mengirim notifikasi test");
    }
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isPWA = window.matchMedia("(display-mode: standalone)").matches;

  const permissionLabel = {
    granted: { text: "Diizinkan", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
    denied: { text: "Diblokir", color: "bg-destructive/15 text-destructive border-destructive/20", icon: XCircle },
    default: { text: "Belum diatur", color: "bg-muted text-muted-foreground border-border", icon: Bell },
    unsupported: { text: "Tidak didukung", color: "bg-muted text-muted-foreground border-border", icon: XCircle },
  };

  const currentPerm = permissionLabel[notifPermission];
  const PermIcon = currentPerm.icon;

  return (
    <Tabs defaultValue="notifications" className="space-y-4">
      <TabsList className="w-full grid grid-cols-3 h-12">
        <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm py-3">
          <BellRing className="h-4 w-4" />
          <span className="hidden sm:inline">Notifikasi</span>
          <span className="sm:hidden">Notif</span>
        </TabsTrigger>
        <TabsTrigger value="language" className="gap-1.5 text-xs sm:text-sm py-3">
          <Globe className="h-4 w-4" />
          <span>Bahasa</span>
        </TabsTrigger>
        <TabsTrigger value="password" className="gap-1.5 text-xs sm:text-sm py-3">
          <Lock className="h-4 w-4" />
          <span>Password</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="notifications" className="space-y-4">
        <div className="rounded-xl border border-border/50 p-4 sm:p-5 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-semibold">Push Notification</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Status di perangkat ini</p>
            </div>
            <Badge variant="outline" className={`gap-1.5 shrink-0 text-xs sm:text-sm px-3 py-1.5 ${currentPerm.color}`}>
              <PermIcon className="h-3.5 w-3.5" />
              {currentPerm.text}
            </Badge>
          </div>

          {/* Device info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            {isMobile ? <Smartphone className="h-3.5 w-3.5 shrink-0" /> : <Monitor className="h-3.5 w-3.5 shrink-0" />}
            <span>
              {isIOS ? "iOS" : isAndroid ? "Android" : "Desktop"}
              {isPWA ? " • Installed App" : " • Browser"}
            </span>
          </div>

          {notifPermission === "unsupported" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Browser Anda tidak mendukung notifikasi push.
              </p>
              {isIOS && !isPWA && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
                  <p className="text-sm font-medium text-primary">📱 Tips untuk iPhone/iPad</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Untuk menerima push notification di iOS, Anda perlu menginstall WORKA sebagai aplikasi:
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 pl-4 list-decimal">
                    <li>Tap tombol <strong>Share</strong> (ikon kotak dengan panah ke atas)</li>
                    <li>Pilih <strong>"Add to Home Screen"</strong></li>
                    <li>Buka WORKA dari Home Screen</li>
                    <li>Kembali ke halaman ini untuk mengizinkan notifikasi</li>
                  </ol>
                </div>
              )}
            </div>
          ) : notifPermission === "denied" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Notifikasi diblokir oleh perangkat Anda.
              </p>
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 space-y-2">
                <p className="text-sm font-medium text-destructive">Cara mengaktifkan kembali:</p>
                {isIOS ? (
                  <ol className="text-xs text-muted-foreground space-y-1 pl-4 list-decimal">
                    <li>Buka <strong>Settings</strong> → <strong>WORKA</strong></li>
                    <li>Aktifkan <strong>Notifications</strong></li>
                  </ol>
                ) : isAndroid ? (
                  <ol className="text-xs text-muted-foreground space-y-1 pl-4 list-decimal">
                    <li>Buka <strong>Settings</strong> → <strong>Apps</strong> → <strong>WORKA</strong></li>
                    <li>Tap <strong>Notifications</strong> → Aktifkan</li>
                  </ol>
                ) : (
                  <ol className="text-xs text-muted-foreground space-y-1 pl-4 list-decimal">
                    <li>Klik ikon gembok/info di address bar</li>
                    <li>Ubah Notifications menjadi <strong>Allow</strong></li>
                    <li>Refresh halaman</li>
                  </ol>
                )}
              </div>
            </div>
          ) : notifPermission === "granted" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                ✅ Notifikasi aktif! Anda akan menerima pemberitahuan task, meeting, dan update penting di perangkat ini.
              </p>
              <Button onClick={handleTestNotification} variant="outline" size="lg" className="w-full gap-2 h-12 text-sm">
                <BellRing className="h-4 w-4" />
                Test Push Notification
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Aktifkan notifikasi untuk menerima pemberitahuan langsung di {isMobile ? "HP" : "komputer"} Anda. Anda akan mendapat notifikasi untuk task baru, undangan meeting, dan update penting.
              </p>
              <Button onClick={handleRequestPermission} size="lg" className="w-full gap-2 h-12 text-sm">
                <Bell className="h-4 w-4" />
                Izinkan Notifikasi di {isIOS ? "iPhone" : isAndroid ? "Android" : "Perangkat"} Ini
              </Button>
              {isIOS && !isPWA && (
                <p className="text-xs text-center text-muted-foreground">
                  ⚠️ Di iPhone, install WORKA ke Home Screen terlebih dahulu untuk mendukung push notification.
                </p>
              )}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="language" className="space-y-4">
        <div className="rounded-xl border border-border/50 p-4 sm:p-5 space-y-3">
          <Label className="text-sm sm:text-base font-semibold">Pilih bahasa sistem</Label>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">🇮🇩 Bahasa Indonesia</SelectItem>
              <SelectItem value="en">🇬🇧 English</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Perubahan bahasa hanya berlaku untuk akun Anda
          </p>
        </div>
      </TabsContent>

      <TabsContent value="password" className="space-y-4">
        <div className="rounded-xl border border-border/50 p-4 sm:p-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              minLength={6}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Confirm Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              className="h-12"
            />
          </div>
          <Button
            onClick={handlePasswordChange}
            disabled={changingPassword || !newPassword || !confirmPassword}
            size="lg"
            className="w-full h-12"
          >
            {changingPassword ? "Mengubah..." : "Ubah Password"}
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export function ProfileSettingsDialog({ open, onOpenChange }: ProfileSettingsDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <Settings className="h-5 w-5" />
              Profile Settings
            </DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="px-4 pb-6 overflow-y-auto" style={{ maxHeight: "calc(85vh - 80px)" }}>
            <ProfileSettingsContent open={open} />
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Profile Settings
          </DialogTitle>
        </DialogHeader>
        <ProfileSettingsContent open={open} />
      </DialogContent>
    </Dialog>
  );
}

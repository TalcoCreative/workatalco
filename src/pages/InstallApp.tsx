import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download, Smartphone, Monitor, Apple, Chrome, Share,
  MoreVertical, Bell, ArrowRight, CheckCircle2, Globe
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompanySlug } from "@/hooks/useCompanySlug";

export default function InstallApp() {
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">(
    /Android/i.test(navigator.userAgent)
      ? "android"
      : /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? "ios"
        : "desktop"
  );
  const navigate = useNavigate();
  const companySlug = useCompanySlug();

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-2xl shadow-lg">
            W
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Install WORKA</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Install WORKA di perangkat Anda untuk akses cepat, tampilan fullscreen, dan notifikasi push.
          </p>
          {isStandalone && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Sudah terinstall
            </Badge>
          )}
        </div>

        <Separator />

        {/* Platform Selector */}
        <div className="flex gap-2 justify-center">
          {[
            { key: "android" as const, icon: Chrome, label: "Android" },
            { key: "ios" as const, icon: Apple, label: "iOS" },
            { key: "desktop" as const, icon: Monitor, label: "Desktop" },
          ].map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant={platform === key ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setPlatform(key)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {/* Install Steps */}
        {platform === "android" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Chrome className="h-5 w-5" />
                Install di Android (Chrome)
              </CardTitle>
              <CardDescription>Ikuti langkah berikut untuk install WORKA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Step number={1} icon={<Globe className="h-4 w-4" />}>
                Buka aplikasi ini di <strong>Google Chrome</strong>
              </Step>
              <Step number={2} icon={<MoreVertical className="h-4 w-4" />}>
                Tap tombol <strong>Menu (⋮)</strong> di pojok kanan atas
              </Step>
              <Step number={3} icon={<Download className="h-4 w-4" />}>
                Pilih <strong>"Install app"</strong> atau <strong>"Add to Home screen"</strong>
              </Step>
              <Step number={4} icon={<CheckCircle2 className="h-4 w-4" />}>
                Konfirmasi install. WORKA akan muncul di home screen Anda.
              </Step>
            </CardContent>
          </Card>
        )}

        {platform === "ios" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Apple className="h-5 w-5" />
                Install di iPhone / iPad (Safari)
              </CardTitle>
              <CardDescription>
                <strong>Penting:</strong> Harus menggunakan Safari, bukan Chrome
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Step number={1} icon={<Globe className="h-4 w-4" />}>
                Buka aplikasi ini di <strong>Safari</strong> (bukan Chrome/Firefox)
              </Step>
              <Step number={2} icon={<Share className="h-4 w-4" />}>
                Tap tombol <strong>Share (↑)</strong> di bagian bawah browser
              </Step>
              <Step number={3} icon={<Download className="h-4 w-4" />}>
                Scroll dan pilih <strong>"Add to Home Screen"</strong>
              </Step>
              <Step number={4} icon={<CheckCircle2 className="h-4 w-4" />}>
                Tap <strong>"Add"</strong>. WORKA akan muncul sebagai app di home screen.
              </Step>
              <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">
                ⚠️ Push notification hanya tersedia di iOS 16.4+ dan harus dibuka dari app yang sudah di-install (bukan Safari).
              </div>
            </CardContent>
          </Card>
        )}

        {platform === "desktop" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="h-5 w-5" />
                Install di Desktop (Chrome / Edge)
              </CardTitle>
              <CardDescription>Jadikan WORKA sebagai app di desktop Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Step number={1} icon={<Globe className="h-4 w-4" />}>
                Buka di <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong>
              </Step>
              <Step number={2} icon={<Download className="h-4 w-4" />}>
                Klik ikon <strong>Install (⊕)</strong> di address bar, atau buka Menu → <strong>"Install WORKA"</strong>
              </Step>
              <Step number={3} icon={<CheckCircle2 className="h-4 w-4" />}>
                Klik <strong>"Install"</strong>. WORKA akan terbuka sebagai app terpisah.
              </Step>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Push Notification Onboarding */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5 text-primary" />
              Aktifkan Push Notification
            </CardTitle>
            <CardDescription>
              Setelah install, aktifkan push notification agar tidak ketinggalan update penting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Step number={1} icon={<Smartphone className="h-4 w-4" />}>
                Buka WORKA dari app yang sudah di-install
              </Step>
              <Step number={2} icon={<ArrowRight className="h-4 w-4" />}>
                Buka <strong>Profile Settings</strong>
              </Step>
              <Step number={3} icon={<Bell className="h-4 w-4" />}>
                Nyalakan toggle <strong>Push Notification</strong> dan izinkan saat browser meminta
              </Step>
              <Step number={4} icon={<CheckCircle2 className="h-4 w-4" />}>
                Klik <strong>"Test Notifikasi"</strong> untuk memastikan berhasil
              </Step>
            </div>

            {companySlug && (
              <Button
                onClick={() => navigate(`/${companySlug}/profile`)}
                className="gap-2 w-full sm:w-auto"
              >
                <Bell className="h-4 w-4" />
                Buka Profile Settings
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Step({ number, icon, children }: { number: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
        {number}
      </div>
      <div className="flex items-start gap-2 pt-0.5 text-sm">
        <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
        <p>{children}</p>
      </div>
    </div>
  );
}

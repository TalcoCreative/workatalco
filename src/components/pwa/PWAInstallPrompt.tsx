import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "worka-pwa-dismiss-until";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if dismissed recently
    const dismissUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissUntil && Date.now() < Number(dismissUntil)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    // Don't show again for 7 days
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg shrink-0 shadow-glow-primary">
          W
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-sm">Install WORKA</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Install WORKA on your device for faster access and an app-like experience.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={handleInstall} className="rounded-xl text-xs h-8 gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="rounded-xl text-xs h-8 text-muted-foreground">
              Maybe Later
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

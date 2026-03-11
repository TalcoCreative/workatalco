import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Monitor, X } from "lucide-react";

export function MobileDesktopBanner() {
  const isMobile = useIsMobile();
  const [dismissed, setDismissed] = useState(false);

  if (!isMobile || dismissed) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
      <Monitor className="h-5 w-5 text-primary flex-shrink-0" />
      <p className="text-xs text-foreground flex-1">
        Gunakan tampilan desktop untuk pengalaman terbaik pada fitur ini.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

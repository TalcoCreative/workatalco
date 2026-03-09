import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Compass, X } from "lucide-react";

interface WelcomeModalProps {
  open: boolean;
  onStartTour: () => void;
  onSkip: () => void;
}

export function WelcomeModal({ open, onStartTour, onSkip }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onSkip()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-border/50">
        <div className="relative p-8 text-center space-y-6">
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Compass className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              Selamat datang di Talco Management System
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Mari kenali fitur-fitur utama platform ini melalui tur singkat.
              Tutorial ini akan memandu Anda melalui fitur yang tersedia di workspace Anda.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={onStartTour} size="lg" className="w-full gap-2">
              <Compass className="h-4 w-4" />
              Mulai Tur
            </Button>
            <Button onClick={onSkip} variant="ghost" size="sm" className="text-muted-foreground">
              Lewati Tutorial
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useCompanyNavigate } from "@/hooks/useCompanyNavigate";

interface TourFinishModalProps {
  open: boolean;
  onClose: () => void;
}

export function TourFinishModal({ open, onClose }: TourFinishModalProps) {
  const navigate = useCompanyNavigate();

  const handleGo = () => {
    onClose();
    navigate("/");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm p-8 text-center gap-0 border-border/50">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Tur selesai!</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Anda sudah mengenal fitur-fitur utama Talco Management System.
          Mulai gunakan platform untuk mengelola pekerjaan tim Anda.
        </p>
        <Button onClick={handleGo} size="lg" className="w-full">
          Masuk ke Dashboard
        </Button>
      </DialogContent>
    </Dialog>
  );
}

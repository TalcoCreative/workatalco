import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

export default function ThankYou() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [status, setStatus] = useState<"loading" | "success" | "pending">("loading");
  const [companySlug, setCompanySlug] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      // Give webhook a moment to process
      await new Promise(r => setTimeout(r, 2000));

      if (orderId) {
        // Try to find the company from the order
        const { data } = await supabase
          .from("companies")
          .select("slug, is_active")
          .eq("id", orderId)
          .maybeSingle();

        if (data) {
          setCompanySlug(data.slug);
          setStatus(data.is_active ? "success" : "pending");
        } else {
          setStatus("success");
        }
      } else {
        setStatus("success");
      }
    };
    check();
  }, [orderId]);

  const handleGoDashboard = () => {
    if (companySlug) {
      navigate(`/${companySlug}`);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Helmet>
        <title>Terima Kasih — WORKA</title>
      </Helmet>

      <div className="max-w-md w-full text-center space-y-8">
        {status === "loading" ? (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Memproses pembayaran...</h1>
              <p className="mt-3 text-muted-foreground">Mohon tunggu sebentar, kami sedang memverifikasi pembayaran Anda.</p>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Terima kasih!</h1>
              <p className="mt-3 text-muted-foreground text-lg">
                {status === "success"
                  ? "Pembayaran Anda berhasil. Workspace Anda sudah aktif dan siap digunakan."
                  : "Pembayaran Anda sedang diproses. Workspace akan aktif setelah pembayaran terkonfirmasi."
                }
              </p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/50 p-6 text-left space-y-3">
              <h3 className="font-semibold text-sm text-foreground">Langkah selanjutnya</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  Login ke dashboard untuk mulai mengatur workspace
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  Undang anggota tim Anda melalui menu Users
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  Mulai buat project pertama Anda
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button size="lg" className="gap-2 px-8" onClick={handleGoDashboard}>
                Masuk Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
              <Link to="/landing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">Kembali ke Beranda</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

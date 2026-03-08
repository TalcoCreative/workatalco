import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Signup() {
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleCompanyNameChange = (val: string) => {
    setCompanyName(val);
    setSlug(generateSlug(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !slug || !email || !password || !fullName) {
      toast.error("Mohon isi semua field yang wajib");
      return;
    }
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    try {
      // Use register-and-pay with trial tier (free)
      const { data, error } = await supabase.functions.invoke("register-and-pay", {
        body: {
          companyName: companyName.trim(),
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
          industry: "",
          adminFullName: fullName.trim(),
          adminEmail: email.trim().toLowerCase(),
          adminPhone: phone.trim(),
          adminPassword: password,
          tier: "trial",
          userCount: 3,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Workspace berhasil dibuat! Silakan login dengan email dan password Anda.");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat workspace");
    } finally {
      setLoading(false);
    }
  };

  const trialFeatures = [
    "Akses semua fitur Enterprise",
    "Projects, Tasks & Kanban",
    "HR Dashboard & Attendance",
    "Finance & CEO Dashboard",
    "Recruitment & KOL",
    "Maksimal 3 user",
    "14 hari gratis",
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <div className="w-full max-w-lg">
        <Link to="/landing" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
        </Link>
        <Card className="shadow-soft-xl border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Free Trial 14 Hari</CardTitle>
            <CardDescription>Akses penuh Enterprise — tanpa kartu kredit</CardDescription>
            <Badge variant="outline" className="mx-auto mt-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Enterprise Access
            </Badge>
          </CardHeader>
          <CardContent>
            {/* Trial features */}
            <div className="mb-6 rounded-xl bg-muted/30 border border-border/30 p-4">
              <div className="grid grid-cols-2 gap-2">
                {trialFeatures.map((f) => (
                  <div key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap *</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Nama Perusahaan / Agency *</Label>
                <Input id="companyName" value={companyName} onChange={(e) => handleCompanyNameChange(e.target.value)} required placeholder="Kreasi Digital" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Workspace *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">worka.talco.id/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                    required
                    placeholder="kreasi-digital"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">No. HP</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08123456789" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Min. 6 karakter" />
              </div>
              <Button type="submit" className="w-full shadow-glow-primary" disabled={loading}>
                {loading ? "Membuat Workspace..." : "Mulai Free Trial 🚀"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link to="/auth" className="text-primary hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
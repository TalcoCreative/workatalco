import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send } from "lucide-react";

const SOURCE_OPTIONS = [
  "Google Search",
  "Instagram",
  "LinkedIn",
  "TikTok",
  "Rekomendasi teman / kolega",
  "Event / Webinar",
  "Lainnya",
];

const TEAM_SIZE_OPTIONS = [
  "1–5 orang",
  "6–15 orang",
  "16–30 orang",
  "31–50 orang",
  "50+ orang",
];

export default function RequestDemo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company_name: "",
    phone: "",
    position: "",
    team_size: "",
    source: "",
    demo_date: "",
    demo_time: "",
    message: "",
  });

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const canNext1 = form.name && form.email && form.phone;
  const canNext2 = form.company_name && form.team_size;
  const canSubmit = form.demo_date && form.demo_time;

  const handleSubmit = async () => {
    if (!canSubmit) { toast.error("Mohon pilih tanggal dan jam demo"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("demo_requests").insert({
        name: form.name,
        email: form.email,
        company_name: form.company_name,
        phone: form.phone,
        message: [
          form.position && `Posisi: ${form.position}`,
          form.team_size && `Tim: ${form.team_size}`,
          form.source && `Sumber: ${form.source}`,
          form.message,
        ].filter(Boolean).join("\n"),
        demo_date: form.demo_date,
        demo_time: form.demo_time,
      } as any);
      if (error) throw error;

      const waPhone = "6285117084889";
      const waMsg = encodeURIComponent(
        `Halo, saya ingin request demo WORKA.\n\n` +
        `Nama: ${form.name}\n` +
        `Email: ${form.email}\n` +
        `Perusahaan: ${form.company_name}\n` +
        `Posisi: ${form.position || '-'}\n` +
        `Ukuran Tim: ${form.team_size || '-'}\n` +
        `HP: ${form.phone}\n` +
        `Tahu WORKA dari: ${form.source || '-'}\n` +
        `Tanggal Demo: ${form.demo_date}\n` +
        `Jam Demo: ${form.demo_time}\n` +
        `Pesan: ${form.message || '-'}`
      );
      window.open(`https://wa.me/${waPhone}?text=${waMsg}`, "_blank");
      toast.success("Request demo berhasil dikirim!");
      setStep(4); // success
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Request Demo — WORKA</title>
        <meta name="description" content="Jadwalkan sesi demo WORKA untuk tim Anda. Gratis, tanpa komitmen." />
      </Helmet>

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link to="/landing" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
          <Link to="/landing" className="text-lg font-bold tracking-tight text-foreground">WORKA</Link>
          <div className="w-20" />
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        {/* Progress */}
        {step < 4 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`h-1.5 rounded-full flex-1 transition-colors ${s <= step ? "bg-primary" : "bg-border"}`} />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Langkah {step} dari 3 — {step === 1 ? "Tentang Anda" : step === 2 ? "Tentang Perusahaan" : "Jadwal Demo"}
            </p>
          </div>
        )}

        {/* Step 1: Personal */}
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">Kenalan dulu</h1>
              <p className="mt-2 text-muted-foreground">Ceritakan sedikit tentang diri Anda agar kami bisa mempersiapkan demo yang relevan.</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nama lengkap <span className="text-destructive">*</span></Label>
                <Input placeholder="Masukkan nama lengkap" value={form.name} onChange={e => set("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email <span className="text-destructive">*</span></Label>
                <Input type="email" placeholder="nama@perusahaan.com" value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nomor WhatsApp <span className="text-destructive">*</span></Label>
                <Input type="tel" placeholder="08123456789" value={form.phone} onChange={e => set("phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Posisi / Jabatan</Label>
                <Input placeholder="CEO, COO, Marketing Manager, dll." value={form.position} onChange={e => set("position", e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="lg" className="px-8" disabled={!canNext1} onClick={() => setStep(2)}>
                Lanjut
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Company */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">Tentang perusahaan Anda</h1>
              <p className="mt-2 text-muted-foreground">Informasi ini membantu kami menyiapkan demo yang sesuai dengan kebutuhan bisnis Anda.</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nama perusahaan <span className="text-destructive">*</span></Label>
                <Input placeholder="PT Kreasi Digital" value={form.company_name} onChange={e => set("company_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ukuran tim <span className="text-destructive">*</span></Label>
                <Select value={form.team_size} onValueChange={v => set("team_size", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih ukuran tim" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_SIZE_OPTIONS.map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tahu WORKA dari mana?</Label>
                <Select value={form.source} onValueChange={v => set("source", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sumber" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" size="lg" onClick={() => setStep(1)}>Kembali</Button>
              <Button size="lg" className="px-8" disabled={!canNext2} onClick={() => setStep(3)}>
                Lanjut
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">Pilih jadwal demo</h1>
              <p className="mt-2 text-muted-foreground">Pilih tanggal dan jam yang paling nyaman untuk Anda. Durasi demo sekitar 30–45 menit.</p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tanggal <span className="text-destructive">*</span></Label>
                  <Input type="date" value={form.demo_date} onChange={e => set("demo_date", e.target.value)} min={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Jam <span className="text-destructive">*</span></Label>
                  <Input type="time" value={form.demo_time} onChange={e => set("demo_time", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Catatan tambahan</Label>
                <Textarea rows={3} placeholder="Ada hal khusus yang ingin Anda tanyakan atau lihat di demo?" value={form.message} onChange={e => set("message", e.target.value)} />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" size="lg" onClick={() => setStep(2)}>Kembali</Button>
              <Button size="lg" className="px-8 gap-2" disabled={!canSubmit || loading} onClick={handleSubmit}>
                <Send className="h-4 w-4" />
                {loading ? "Mengirim..." : "Kirim"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center space-y-6 py-12">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Send className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">Request demo terkirim</h1>
              <p className="mt-3 text-muted-foreground max-w-md mx-auto">
                Tim kami akan segera menghubungi Anda untuk konfirmasi jadwal. Pastikan WhatsApp Anda aktif.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button variant="outline" size="lg" onClick={() => navigate("/landing")}>Kembali ke Beranda</Button>
              <Button size="lg" onClick={() => navigate("/auth")}>Coba WORKA Gratis</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

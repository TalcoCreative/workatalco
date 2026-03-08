import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, User, Mail, Phone, Lock, Globe, Users,
  CheckCircle2, CreditCard, Sparkles, ArrowRight,
} from "lucide-react";

const TIERS = [
  {
    key: "starter",
    name: "Starter",
    subtitle: "Project Management",
    pricePerUser: 7000,
    maxUsers: 10,
    features: ["Projects & Tasks", "Client Management", "Schedule & Calendar", "Team Collaboration"],
  },
  {
    key: "professional",
    name: "Professional",
    subtitle: "Operational Agency",
    pricePerUser: 21000,
    maxUsers: 30,
    popular: true,
    features: ["Everything in Starter", "HR Dashboard & Analytics", "Meeting & Asset Management", "Reports & Export"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    subtitle: "Full ERP",
    pricePerUser: 25000,
    maxUsers: 100,
    features: ["Everything in Professional", "Finance & CEO Dashboard", "Recruitment & KOL", "Social Media Management"],
  },
];

const formatRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: any) => void;
    };
  }
}

export default function Subscribe() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Company details
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("");

  // Admin details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Plan
  const [selectedTier, setSelectedTier] = useState("professional");
  const [userCount, setUserCount] = useState(5);

  // Load Midtrans Snap.js
  useEffect(() => {
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
    if (!clientKey) return;
    if (document.getElementById("midtrans-snap")) return;
    const script = document.createElement("script");
    script.id = "midtrans-snap";
    script.src = "https://app.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    document.head.appendChild(script);
  }, []);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

  const handleCompanyNameChange = (val: string) => {
    setCompanyName(val);
    setSlug(generateSlug(val));
  };

  const tierInfo = TIERS.find(t => t.key === selectedTier)!;
  const totalPrice = tierInfo.pricePerUser * userCount;

  const validateStep1 = () => {
    if (!companyName.trim()) { toast.error("Nama perusahaan wajib diisi"); return false; }
    if (!slug.trim() || slug.length < 3) { toast.error("Slug minimal 3 karakter"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!fullName.trim()) { toast.error("Nama lengkap wajib diisi"); return false; }
    if (!email.trim() || !email.includes("@")) { toast.error("Email tidak valid"); return false; }
    if (!phone.trim()) { toast.error("Nomor HP wajib diisi"); return false; }
    if (password.length < 6) { toast.error("Password minimal 6 karakter"); return false; }
    if (password !== confirmPassword) { toast.error("Konfirmasi password tidak cocok"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-and-pay", {
        body: {
          companyName: companyName.trim(),
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
          industry: industry.trim(),
          adminFullName: fullName.trim(),
          adminEmail: email.trim().toLowerCase(),
          adminPhone: phone.trim(),
          adminPassword: password,
          tier: selectedTier,
          userCount,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // If Midtrans snap token available, show payment popup
      if (data?.snapToken && window.snap) {
        toast.success("Akun berhasil dibuat! Silakan selesaikan pembayaran.");
        window.snap.pay(data.snapToken, {
          onSuccess: () => {
            toast.success("Pembayaran berhasil! Subscription aktif. Silakan login.");
            navigate("/auth");
          },
          onPending: () => {
            toast.info("Menunggu pembayaran. Akun sudah dibuat, silakan login.");
            navigate("/auth");
          },
          onError: () => {
            toast.error("Pembayaran gagal. Akun sudah dibuat, Anda bisa bayar nanti di menu Billing.");
            navigate("/auth");
          },
          onClose: () => {
            toast.info("Pembayaran belum selesai. Akun sudah dibuat, Anda bisa bayar nanti di menu Billing.");
            navigate("/auth");
          },
        });
      } else if (data?.snapRedirectUrl) {
        // Fallback: redirect to Midtrans payment page
        toast.success("Akun berhasil dibuat! Anda akan diarahkan ke halaman pembayaran.");
        window.location.href = data.snapRedirectUrl;
      } else {
        // No Midtrans configured, just redirect to login
        toast.success("Akun berhasil dibuat! Silakan login.");
        navigate("/auth");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat akun");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/landing" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-extrabold text-sm">W</div>
            <span className="text-lg font-bold text-foreground">WORKA</span>
          </Link>
          <Link to="/auth">
            <Button variant="ghost" size="sm">Sudah punya akun? Login</Button>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Progress */}
        <div className="mb-10 flex items-center justify-center gap-3">
          {[
            { n: 1, label: "Perusahaan" },
            { n: 2, label: "Admin" },
            { n: 3, label: "Plan & Bayar" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  step >= s.n
                    ? "bg-primary text-primary-foreground shadow-glow-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.n ? <CheckCircle2 className="h-5 w-5" /> : s.n}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${step >= s.n ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {i < 2 && <div className={`h-px w-8 ${step > s.n ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Company Details */}
        {step === 1 && (
          <Card className="shadow-xl border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-xl">Detail Perusahaan</CardTitle>
              <CardDescription>Informasi dasar perusahaan Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-8 pb-8">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nama Perusahaan *</Label>
                <Input
                  id="companyName"
                  placeholder="PT Kreasi Digital Indonesia"
                  value={companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Workspace *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">worka.id/</span>
                  <Input
                    id="slug"
                    placeholder="kreasi-digital"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    maxLength={50}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industri</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih industri..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creative_agency">Creative Agency</SelectItem>
                    <SelectItem value="digital_marketing">Digital Marketing</SelectItem>
                    <SelectItem value="production_house">Production House</SelectItem>
                    <SelectItem value="media_company">Media Company</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full gap-2 mt-4"
                onClick={() => validateStep1() && setStep(2)}
              >
                Lanjut <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Admin Details */}
        {step === 2 && (
          <Card className="shadow-xl border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <User className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-xl">Data Super Admin</CardTitle>
              <CardDescription>Akun administrator utama perusahaan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-8 pb-8">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap *</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor HP *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
                </Button>
                <Button className="flex-1 gap-2" onClick={() => validateStep2() && setStep(3)}>
                  Lanjut <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Plan & Payment */}
        {step === 3 && (
          <div className="space-y-6">
            <Card className="shadow-xl border-border/50">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <CreditCard className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl">Pilih Plan</CardTitle>
                <CardDescription>Pilih paket yang sesuai untuk perusahaan Anda</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="grid gap-4 md:grid-cols-3">
                  {TIERS.map((tier) => (
                    <button
                      key={tier.key}
                      onClick={() => {
                        setSelectedTier(tier.key);
                        setUserCount(Math.min(userCount, tier.maxUsers));
                      }}
                      className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                        selectedTier === tier.key
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      {tier.popular && (
                        <Badge className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px]">
                          POPULAR
                        </Badge>
                      )}
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{tier.subtitle}</p>
                      <h3 className="text-lg font-bold text-foreground mt-1">{tier.name}</h3>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-2xl font-extrabold text-foreground">
                          {formatRupiah(tier.pricePerUser)}
                        </span>
                        <span className="text-xs text-muted-foreground">/ user / bln</span>
                      </div>
                      <ul className="mt-3 space-y-1.5">
                        {tier.features.map((f, fi) => (
                          <li key={fi} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>

                {/* User Slider */}
                <div className="mt-6 rounded-xl bg-muted/50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Users className="h-4 w-4 text-primary" />
                      Jumlah User: <strong>{userCount}</strong>
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {formatRupiah(totalPrice)}
                      <span className="text-xs font-normal text-muted-foreground"> /bulan</span>
                    </span>
                  </div>
                  <Slider
                    value={[userCount]}
                    onValueChange={(v) => setUserCount(v[0])}
                    min={1}
                    max={tierInfo.maxUsers}
                    step={1}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>1 user</span>
                    <span>Max {tierInfo.maxUsers} users</span>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-6 rounded-xl border border-border/50 bg-card p-5 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> Ringkasan
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Perusahaan</span>
                      <span className="font-medium text-foreground">{companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Admin</span>
                      <span className="font-medium text-foreground">{fullName} ({email})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan</span>
                      <span className="font-medium text-foreground capitalize">{selectedTier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kapasitas</span>
                      <span className="font-medium text-foreground">{userCount} users</span>
                    </div>
                    <hr className="border-border/50" />
                    <div className="flex justify-between text-base">
                      <span className="font-semibold text-foreground">Total / bulan</span>
                      <span className="font-bold text-primary text-lg">{formatRupiah(totalPrice)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
                  </Button>
                  <Button
                    className="flex-1 gap-2 shadow-glow-primary"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? "Memproses..." : (
                      <>
                        <CreditCard className="h-4 w-4" /> Daftar & Bayar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Check, ArrowLeft, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Link } from "react-router-dom";

const tiers = [
  {
    name: "Starter",
    subtitle: "Project Management",
    pricePerUser: 7000,
    popular: false,
    maxUsers: 10,
    features: [
      "Project & Task Management",
      "Client Management",
      "Schedule & Calendar",
      "Team Collaboration",
      "File Sharing (5GB)",
      "Up to 10 Users",
    ],
    notIncluded: [
      "HR & Attendance",
      "Finance & Payroll",
      "Social Media Management",
      "KOL Campaign",
      "Advanced Analytics",
    ],
  },
  {
    name: "Professional",
    subtitle: "Operational Agency",
    pricePerUser: 21000,
    popular: true,
    maxUsers: 30,
    features: [
      "Everything in Starter",
      "HR Dashboard & Attendance",
      "Leave Management",
      "Shooting Schedule",
      "Meeting Management",
      "Asset Tracking",
      "Editorial Plan",
      "Client Hub & Reports",
      "Up to 30 Users",
      "File Storage (25GB)",
    ],
    notIncluded: [
      "Finance & Payroll",
      "KOL Campaign",
      "CEO Dashboard",
    ],
  },
  {
    name: "Enterprise",
    subtitle: "Full ERP Agency",
    pricePerUser: 25000,
    popular: false,
    maxUsers: 100,
    features: [
      "Everything in Professional",
      "Finance & Bookkeeping",
      "Payroll Management",
      "Social Media Analytics",
      "KOL Database & Campaign",
      "CEO Executive Dashboard",
      "Performance Analytics",
      "Recruitment Module",
      "Custom Forms & Letters",
      "Up to 100 Users",
      "Unlimited Storage",
      "Priority Support",
    ],
    notIncluded: [],
  },
];

const formatRupiah = (n: number) =>
  "Rp " + n.toLocaleString("id-ID");

export default function Pricing() {
  const [userCounts, setUserCounts] = useState<Record<number, number>>({ 0: 3, 1: 5, 2: 10 });

  const handleSliderChange = (tierIdx: number, value: number[]) => {
    setUserCounts(prev => ({ ...prev, [tierIdx]: value[0] }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/landing" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pilih plan yang sesuai dengan kebutuhan agency Anda. Semua plan termasuk 14 hari free trial.
          </p>
        </div>

        {/* Tier Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier, idx) => {
            const users = userCounts[idx] || 3;
            const totalPrice = tier.pricePerUser * users;

            return (
              <Card
                key={tier.name}
                className={`relative flex flex-col border-border/50 transition-all hover:shadow-lg ${
                  tier.popular ? "border-primary/50 shadow-md scale-[1.02]" : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground shadow-sm">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{tier.subtitle}</p>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-foreground">{formatRupiah(tier.pricePerUser)}</span>
                    <span className="text-sm text-muted-foreground ml-1">/ user / bulan</span>
                  </div>

                  {/* User count slider */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <UsersIcon className="h-3.5 w-3.5" />
                        {users} users
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatRupiah(totalPrice)}<span className="text-xs font-normal text-muted-foreground">/bln</span>
                      </span>
                    </div>
                    <Slider
                      value={[users]}
                      onValueChange={(v) => handleSliderChange(idx, v)}
                      min={1}
                      max={tier.maxUsers}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>1 user</span>
                      <span>{tier.maxUsers} users</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <Link to="/signup" className="w-full mb-6">
                    <Button className="w-full" variant={tier.popular ? "default" : "outline"}>
                      Start Free Trial
                    </Button>
                  </Link>

                  <div className="space-y-3 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Included</p>
                    {tier.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{f}</span>
                      </div>
                    ))}
                    {tier.notIncluded.length > 0 && (
                      <>
                        <div className="pt-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Not Included</p>
                        </div>
                        {tier.notIncluded.map((f) => (
                          <div key={f} className="flex items-start gap-2.5 text-sm">
                            <span className="h-4 w-4 shrink-0 mt-0.5 text-center text-muted-foreground/50">—</span>
                            <span className="text-muted-foreground">{f}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              { q: "Apakah ada trial gratis?", a: "Ya! Semua plan termasuk 14 hari free trial dengan maksimal 3 user. Tidak perlu kartu kredit." },
              { q: "Bagaimana sistem billing-nya?", a: "Billing bulanan per user aktif. Anda bisa upgrade atau downgrade kapan saja." },
              { q: "Apakah data saya aman?", a: "Semua data dienkripsi dan disimpan dengan standar keamanan enterprise. Setiap workspace terisolasi sepenuhnya." },
              { q: "Bisa tambah user di tengah bulan?", a: "Bisa! User baru akan dihitung pro-rata untuk bulan berjalan. Harga total = jumlah user × harga per user." },
              { q: "Bagaimana cara upgrade plan?", a: "Hubungi tim sales kami atau upgrade langsung dari dashboard Super Admin." },
            ].map((faq) => (
              <div key={faq.q} className="rounded-xl border border-border/50 p-5">
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 text-center pb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Scale Your Agency?</h2>
          <p className="text-muted-foreground mb-6">Start your 14-day free trial today. No credit card required.</p>
          <Link to="/signup">
            <Button size="lg" className="text-base px-8">Start Free Trial</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

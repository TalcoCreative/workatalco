import { useState } from "react";
import { Check, ArrowLeft, Users as UsersIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const formatRupiah = (n: number) =>
  "Rp " + n.toLocaleString("id-ID");

export default function Pricing() {
  const [userCounts, setUserCounts] = useState<Record<number, number>>({});

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["pricing-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const getUsers = (idx: number, maxUsers: number) => {
    return userCounts[idx] ?? Math.min(3, maxUsers);
  };

  const handleSliderChange = (idx: number, value: number[]) => {
    setUserCounts(prev => ({ ...prev, [idx]: value[0] }));
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

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Tier Cards */}
        {!isLoading && (
          <div className={`grid gap-8 ${products.length === 1 ? 'max-w-md mx-auto' : products.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
            {products.map((product: any, idx: number) => {
              const users = getUsers(idx, product.max_users);
              const totalPrice = product.price_per_user * users;
              const features: string[] = Array.isArray(product.features) ? product.features : [];
              const notIncluded: string[] = Array.isArray(product.not_included) ? product.not_included : [];
              const isPopular = product.is_popular === true;

              return (
                <Card
                  key={product.id}
                  className={`relative flex flex-col border-border/50 transition-all hover:shadow-lg ${
                    isPopular ? "border-primary/50 shadow-md scale-[1.02]" : ""
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground shadow-sm">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    {product.description && (
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{product.description}</p>
                    )}
                    <CardTitle className="text-2xl">{product.name}</CardTitle>
                    <div className="mt-3">
                      {product.original_price_per_user && product.original_price_per_user > product.price_per_user && (
                        <span className="text-lg text-muted-foreground line-through mr-2">
                          {formatRupiah(product.original_price_per_user)}
                        </span>
                      )}
                      <span className="text-4xl font-bold text-foreground">{formatRupiah(product.price_per_user)}</span>
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
                        max={product.max_users}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>1 user</span>
                        <span>{product.max_users} users</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <Link to="/signup" className="w-full mb-6">
                      <Button className="w-full" variant={isPopular ? "default" : "outline"}>
                        Start Free Trial
                      </Button>
                    </Link>

                    <div className="space-y-3 flex-1">
                      {features.length > 0 && (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Included</p>
                          {features.map((f: string) => (
                            <div key={f} className="flex items-start gap-2.5 text-sm">
                              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span className="text-foreground">{f}</span>
                            </div>
                          ))}
                        </>
                      )}
                      {notIncluded.length > 0 && (
                        <>
                          <div className="pt-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Not Included</p>
                          </div>
                          {notIncluded.map((f: string) => (
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
        )}

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

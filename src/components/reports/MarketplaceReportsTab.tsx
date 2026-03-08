import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Store, TrendingUp, Package } from "lucide-react";

const MARKETPLACE_PLATFORMS = [
  {
    name: "Tokopedia",
    icon: Store,
    color: "bg-green-500",
    description: "Kelola dan monitor performa toko di Tokopedia",
  },
  {
    name: "Shopee",
    icon: ShoppingBag,
    color: "bg-orange-500",
    description: "Kelola dan monitor performa toko di Shopee",
  },
];

export function MarketplaceReportsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Marketplace Reports</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MARKETPLACE_PLATFORMS.map((platform) => (
          <Card key={platform.name} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center`}>
                  <platform.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{platform.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{platform.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-xs text-muted-foreground">Total Produk</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-xs text-muted-foreground">Total Penjualan</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-xs text-muted-foreground">Pengunjung</p>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg border border-dashed text-center">
                <Badge variant="outline" className="mb-2">Coming Soon</Badge>
                <p className="text-xs text-muted-foreground">
                  Integrasi marketplace akan segera tersedia
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

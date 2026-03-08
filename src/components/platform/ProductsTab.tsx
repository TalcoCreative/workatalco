import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Ticket,
  Users,
  Copy,
  Tag,
} from "lucide-react";

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

// ─── PRODUCTS SUB-TAB ───
function ProductsSection() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_products")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (item: any) => {
      const payload = {
        name: item.name,
        slug: item.slug,
        description: item.description,
        tier: item.tier,
        price_per_user: item.price_per_user,
        original_price_per_user: item.original_price_per_user || null,
        max_users: item.max_users,
        is_active: item.is_active ?? true,
        sort_order: item.sort_order || products.length,
        features: item.features || [],
        is_popular: item.is_popular ?? false,
        not_included: item.not_included || [],
        annual_multiplier: item.annual_multiplier ?? 10,
        default_users: item.default_users ?? 1,
      };
      if (item.id) {
        const { error } = await supabase
          .from("subscription_products")
          .update(payload)
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscription_products")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setEditOpen(false);
      toast.success("Produk disimpan");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Produk dihapus");
    },
  });

  const openNew = () => {
    setEditItem({
      name: "", slug: "", description: "", tier: "starter",
      price_per_user: 0, original_price_per_user: null,
      max_users: 10, is_active: true, sort_order: products.length,
      features: [], is_popular: false, not_included: [],
      annual_multiplier: 10, default_users: 1,
    });
    setEditOpen(true);
  };

  const openEdit = (p: any) => {
    setEditItem({ ...p, features: p.features || [], not_included: p.not_included || [], is_popular: p.is_popular ?? false, annual_multiplier: p.annual_multiplier ?? 10, default_users: p.default_users ?? 1 });
    setEditOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Produk Subscription</h2>
          <p className="text-xs text-muted-foreground">Kelola paket harga dan fitur</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> Tambah Produk
        </Button>
      </div>

      <Card className="border-border/30">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Harga/User</TableHead>
                  <TableHead className="text-center">Max Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                )}
                {products.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">/{p.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{p.tier}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {p.original_price_per_user && p.original_price_per_user > p.price_per_user && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatRupiah(p.original_price_per_user)}
                          </span>
                        )}
                        <span className="font-semibold text-sm text-emerald-600">
                          {formatRupiah(p.price_per_user)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{p.max_users}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={p.is_active
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                        : "bg-muted text-muted-foreground text-[10px]"
                      }>
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          if (confirm("Hapus produk ini?")) deleteMutation.mutate(p.id);
                        }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem?.id ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nama</Label>
                  <Input value={editItem.name} onChange={(e) => setEditItem({ ...editItem, name: e.target.value, slug: editItem.id ? editItem.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-") })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Slug</Label>
                  <Input value={editItem.slug} onChange={(e) => setEditItem({ ...editItem, slug: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Deskripsi</Label>
                <Textarea value={editItem.description || ""} onChange={(e) => setEditItem({ ...editItem, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tier</Label>
                  <Select value={editItem.tier} onValueChange={(v) => setEditItem({ ...editItem, tier: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Users</Label>
                  <Input type="number" value={editItem.max_users} onChange={(e) => setEditItem({ ...editItem, max_users: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Harga/User (IDR)</Label>
                  <Input type="number" value={editItem.price_per_user} onChange={(e) => setEditItem({ ...editItem, price_per_user: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Harga Coret (opsional)</Label>
                  <Input
                    type="number"
                    value={editItem.original_price_per_user || ""}
                    onChange={(e) => setEditItem({ ...editItem, original_price_per_user: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Harga sebelum diskon"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Annual Multiplier (bulan)</Label>
                  <Input
                    type="number"
                    value={editItem.annual_multiplier ?? 10}
                    onChange={(e) => setEditItem({ ...editItem, annual_multiplier: parseInt(e.target.value) || 10 })}
                    placeholder="10 = bayar 10 bulan untuk 12 bulan"
                    min={1}
                    max={12}
                  />
                  <p className="text-[10px] text-muted-foreground">Bayar X bulan untuk 12 bulan (10 = hemat 17%)</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Default Users (slider)</Label>
                  <Input
                    type="number"
                    value={editItem.default_users ?? 1}
                    onChange={(e) => setEditItem({ ...editItem, default_users: parseInt(e.target.value) || 1 })}
                    min={1}
                  />
                  <p className="text-[10px] text-muted-foreground">Posisi awal slider user di pricing page</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fitur / Included (satu per baris)</Label>
                <Textarea
                  value={Array.isArray(editItem.features) ? editItem.features.join("\n") : ""}
                  onChange={(e) => setEditItem({ ...editItem, features: e.target.value.split("\n").filter((f: string) => f.trim()) })}
                  rows={5}
                  placeholder="Projects & Tasks&#10;Client Management&#10;..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Not Included (satu per baris)</Label>
                <Textarea
                  value={Array.isArray(editItem.not_included) ? editItem.not_included.join("\n") : ""}
                  onChange={(e) => setEditItem({ ...editItem, not_included: e.target.value.split("\n").filter((f: string) => f.trim()) })}
                  rows={3}
                  placeholder="Finance & Payroll&#10;KOL Campaign&#10;..."
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={editItem.is_active} onCheckedChange={(v) => setEditItem({ ...editItem, is_active: v })} />
                  <Label className="text-sm">Aktif</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editItem.is_popular} onCheckedChange={(v) => setEditItem({ ...editItem, is_popular: v })} />
                  <Label className="text-sm">Popular Badge</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate(editItem)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── VOUCHERS SUB-TAB ───
function VouchersSection() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ["admin-vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voucher_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (item: any) => {
      if (item.id) {
        const { error } = await supabase.from("voucher_codes").update({
          code: item.code.toUpperCase(),
          description: item.description,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          max_uses: item.max_uses || null,
          valid_from: item.valid_from || null,
          valid_until: item.valid_until || null,
          applicable_tiers: item.applicable_tiers || [],
          is_active: item.is_active,
        }).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("voucher_codes").insert({
          code: item.code.toUpperCase(),
          description: item.description,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          max_uses: item.max_uses || null,
          valid_from: item.valid_from || null,
          valid_until: item.valid_until || null,
          applicable_tiers: item.applicable_tiers || [],
          is_active: item.is_active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      setEditOpen(false);
      toast.success("Voucher disimpan");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("voucher_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      toast.success("Voucher dihapus");
    },
  });

  const openNew = () => {
    setEditItem({
      code: "", description: "", discount_type: "percentage",
      discount_value: 0, max_uses: null, valid_from: "", valid_until: "",
      applicable_tiers: [], is_active: true,
    });
    setEditOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Voucher Codes</h2>
          <p className="text-xs text-muted-foreground">Buat kode diskon untuk pelanggan</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> Tambah Voucher
        </Button>
      </div>

      <Card className="border-border/30">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Diskon</TableHead>
                  <TableHead className="text-center">Penggunaan</TableHead>
                  <TableHead>Berlaku</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
                {vouchers.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-bold font-mono bg-muted px-2 py-0.5 rounded">{v.code}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(v.code); toast.success("Copied!"); }}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-sm">
                        {v.discount_type === "percentage" ? `${v.discount_value}%` : formatRupiah(v.discount_value)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {v.used_count}/{v.max_uses || "∞"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.valid_until
                        ? `s/d ${new Date(v.valid_until).toLocaleDateString("id-ID")}`
                        : "Unlimited"
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={v.is_active
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                        : "bg-muted text-muted-foreground text-[10px]"
                      }>
                        {v.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem({ ...v }); setEditOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Hapus voucher?")) deleteMutation.mutate(v.id); }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && vouchers.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada voucher</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Voucher Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem?.id ? "Edit Voucher" : "Tambah Voucher"}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Kode Voucher</Label>
                <Input value={editItem.code} onChange={(e) => setEditItem({ ...editItem, code: e.target.value.toUpperCase() })} placeholder="DISKON50" className="font-mono uppercase" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Deskripsi</Label>
                <Input value={editItem.description || ""} onChange={(e) => setEditItem({ ...editItem, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipe Diskon</Label>
                  <Select value={editItem.discount_type} onValueChange={(v) => setEditItem({ ...editItem, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Persentase (%)</SelectItem>
                      <SelectItem value="fixed">Nominal (IDR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nilai Diskon</Label>
                  <Input type="number" value={editItem.discount_value} onChange={(e) => setEditItem({ ...editItem, discount_value: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Penggunaan</Label>
                  <Input type="number" value={editItem.max_uses || ""} onChange={(e) => setEditItem({ ...editItem, max_uses: e.target.value ? parseInt(e.target.value) : null })} placeholder="Unlimited" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Berlaku Sampai</Label>
                  <Input type="date" value={editItem.valid_until?.split("T")[0] || ""} onChange={(e) => setEditItem({ ...editItem, valid_until: e.target.value || null })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editItem.is_active} onCheckedChange={(v) => setEditItem({ ...editItem, is_active: v })} />
                <Label className="text-sm">Aktif</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate(editItem)} disabled={saveMutation.isPending || !editItem?.code}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── REFERRALS SUB-TAB ───
function ReferralsSection() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (item: any) => {
      if (item.id) {
        const { error } = await supabase.from("referral_codes").update({
          code: item.code.toUpperCase(),
          owner_name: item.owner_name,
          owner_email: item.owner_email,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          reward_type: item.reward_type,
          reward_value: item.reward_value,
          max_uses: item.max_uses || null,
          is_active: item.is_active,
        }).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("referral_codes").insert({
          code: item.code.toUpperCase(),
          owner_name: item.owner_name,
          owner_email: item.owner_email,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          reward_type: item.reward_type || "none",
          reward_value: item.reward_value || 0,
          max_uses: item.max_uses || null,
          is_active: item.is_active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      setEditOpen(false);
      toast.success("Referral code disimpan");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("referral_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      toast.success("Referral code dihapus");
    },
  });

  const openNew = () => {
    setEditItem({
      code: "", owner_name: "", owner_email: "",
      discount_type: "percentage", discount_value: 10,
      reward_type: "none", reward_value: 0, max_uses: null, is_active: true,
    });
    setEditOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Referral Codes</h2>
          <p className="text-xs text-muted-foreground">Buat kode referral untuk partner dan affiliates</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> Tambah Referral
        </Button>
      </div>

      <Card className="border-border/30">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Diskon</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead className="text-center">Dipakai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
                {referrals.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-bold font-mono bg-muted px-2 py-0.5 rounded">{r.code}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(r.code); toast.success("Copied!"); }}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{r.owner_name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{r.owner_email || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {r.discount_type === "percentage" ? `${r.discount_value}%` : formatRupiah(r.discount_value)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.reward_type === "none" ? "—" : `${r.reward_type}: ${r.reward_value}`}
                    </TableCell>
                    <TableCell className="text-center text-sm">{r.used_count}/{r.max_uses || "∞"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={r.is_active
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                        : "bg-muted text-muted-foreground text-[10px]"
                      }>
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem({ ...r }); setEditOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Hapus referral code?")) deleteMutation.mutate(r.id); }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && referrals.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada referral code</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Referral Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem?.id ? "Edit Referral" : "Tambah Referral"}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Kode Referral</Label>
                <Input value={editItem.code} onChange={(e) => setEditItem({ ...editItem, code: e.target.value.toUpperCase() })} placeholder="REF-PARTNER" className="font-mono uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nama Owner</Label>
                  <Input value={editItem.owner_name || ""} onChange={(e) => setEditItem({ ...editItem, owner_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email Owner</Label>
                  <Input type="email" value={editItem.owner_email || ""} onChange={(e) => setEditItem({ ...editItem, owner_email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipe Diskon</Label>
                  <Select value={editItem.discount_type} onValueChange={(v) => setEditItem({ ...editItem, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Persentase (%)</SelectItem>
                      <SelectItem value="fixed">Nominal (IDR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nilai Diskon</Label>
                  <Input type="number" value={editItem.discount_value} onChange={(e) => setEditItem({ ...editItem, discount_value: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipe Reward (ke Owner)</Label>
                  <Select value={editItem.reward_type || "none"} onValueChange={(v) => setEditItem({ ...editItem, reward_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tidak Ada</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="commission">Komisi (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nilai Reward</Label>
                  <Input type="number" value={editItem.reward_value || 0} onChange={(e) => setEditItem({ ...editItem, reward_value: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Penggunaan</Label>
                <Input type="number" value={editItem.max_uses || ""} onChange={(e) => setEditItem({ ...editItem, max_uses: e.target.value ? parseInt(e.target.value) : null })} placeholder="Unlimited" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editItem.is_active} onCheckedChange={(v) => setEditItem({ ...editItem, is_active: v })} />
                <Label className="text-sm">Aktif</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate(editItem)} disabled={saveMutation.isPending || !editItem?.code}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── MAIN PRODUCTS TAB ───
export function ProductsTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Products & Pricing</h1>
        <p className="text-sm text-muted-foreground">Kelola produk, harga, voucher, dan referral codes</p>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" className="gap-1.5">
            <Package className="h-3.5 w-3.5" /> Produk
          </TabsTrigger>
          <TabsTrigger value="vouchers" className="gap-1.5">
            <Ticket className="h-3.5 w-3.5" /> Vouchers
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Referrals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products"><ProductsSection /></TabsContent>
        <TabsContent value="vouchers"><VouchersSection /></TabsContent>
        <TabsContent value="referrals"><ReferralsSection /></TabsContent>
      </Tabs>
    </div>
  );
}

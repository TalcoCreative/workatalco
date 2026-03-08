import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Image, Upload, Save, RefreshCw, Check, Loader2 } from "lucide-react";

export function LandingImagesTab() {
  const queryClient = useQueryClient();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["landing-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_images")
        .select("*")
        .order("image_key");
      if (error) throw error;
      return data || [];
    },
  });

  const updateAltMutation = useMutation({
    mutationFn: async ({ id, alt_text }: { id: string; alt_text: string }) => {
      const { error } = await supabase
        .from("landing_images")
        .update({ alt_text, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alt text updated");
      queryClient.invalidateQueries({ queryKey: ["landing-images"] });
    },
  });

  const handleUpload = async (imageKey: string, imageId: string, file: File) => {
    setUploading(imageKey);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${imageKey}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("landing-assets")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("landing-assets")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("landing_images")
        .update({
          image_url: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", imageId);
      if (updateError) throw updateError;

      toast.success("Gambar berhasil diupload!");
      queryClient.invalidateQueries({ queryKey: ["landing-images"] });
    } catch (err: any) {
      toast.error(err.message || "Gagal upload gambar");
    } finally {
      setUploading(null);
    }
  };

  const keyLabels: Record<string, string> = {
    "screenshot-dashboard": "Dashboard & Projects",
    "screenshot-mobile": "Mobile App",
    "screenshot-hr": "HR & People Analytics",
    "screenshot-schedule": "Schedule & Calendar",
    "screenshot-finance": "Finance Center",
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Image className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Landing Page Images</h2>
          <p className="text-sm text-muted-foreground">Update gambar yang ditampilkan di halaman landing page</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img: any) => (
          <Card key={img.id} className="border-border/50 overflow-hidden">
            <div className="relative aspect-video bg-muted">
              {img.image_url ? (
                <img
                  src={img.image_url}
                  alt={img.alt_text || img.image_key}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Image className="h-12 w-12 opacity-30" />
                </div>
              )}
              {uploading === img.image_key && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="font-medium text-sm">{keyLabels[img.image_key] || img.image_key}</p>
                <p className="text-xs text-muted-foreground font-mono">{img.image_key}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Alt Text</Label>
                <Input
                  defaultValue={img.alt_text || ""}
                  className="text-sm h-8"
                  onBlur={(e) => {
                    if (e.target.value !== img.alt_text) {
                      updateAltMutation.mutate({ id: img.id, alt_text: e.target.value });
                    }
                  }}
                />
              </div>
              <div>
                <input
                  ref={(el) => { fileRefs.current[img.image_key] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(img.image_key, img.id, file);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => fileRefs.current[img.image_key]?.click()}
                  disabled={uploading === img.image_key}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploading === img.image_key ? "Uploading..." : "Ganti Gambar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Catatan:</strong> Gambar yang diupload akan menggantikan gambar default di landing page.
            Ukuran optimal: 1920×1080px (16:9 ratio). Format: JPG/PNG/WebP.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

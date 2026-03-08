import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Crown, Shield } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkExisting = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        const { data: pa } = await supabase
          .from("platform_admins")
          .select("id")
          .eq("user_id", session.session.user.id)
          .maybeSingle();
        if (pa) {
          navigate("/platform-admin", { replace: true });
        }
      }
    };
    checkExisting();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: pa } = await supabase
        .from("platform_admins")
        .select("id")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      if (!pa) {
        await supabase.auth.signOut();
        toast.error("Akses ditolak. Anda bukan platform admin.");
        return;
      }
      toast.success("Welcome back, Admin!");
      navigate("/platform-admin", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-sm shadow-xl border-border/50">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">WORKA Admin</CardTitle>
          <CardDescription className="text-sm">Login khusus pengelola platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@worka.id" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <Shield className="h-4 w-4" />
              {loading ? "Verifying..." : "Login as Admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
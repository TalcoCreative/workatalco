import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Building2 } from "lucide-react";

export default function Signup() {
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // Check slug availability
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existing) {
        toast.error("This workspace slug is already taken. Please choose another.");
        setLoading(false);
        return;
      }

      // Create user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");

      // Create company
      const { error: compError } = await supabase.from("companies").insert({
        name: companyName,
        slug,
        owner_id: authData.user.id,
        subscription_tier: "trial",
        max_users: 3,
      });
      if (compError) throw compError;

      // Add user as company member (owner)
      const { data: companyData } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", slug)
        .single();

      if (companyData) {
        await supabase.from("company_members").insert({
          company_id: companyData.id,
          user_id: authData.user.id,
          role: "owner",
        });
      }

      toast.success("Workspace created! Please check your email to verify your account.");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <Card className="shadow-soft-xl border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Create Your Workspace</CardTitle>
            <CardDescription>Start your 14-day free trial. No credit card required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Your Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company / Agency Name</Label>
                <Input id="companyName" value={companyName} onChange={(e) => handleCompanyNameChange(e.target.value)} required placeholder="Kreasi Digital" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Workspace Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{window.location.host}/</span>
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
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Min. 6 characters" />
              </div>
              <Button type="submit" className="w-full shadow-glow-primary" disabled={loading}>
                {loading ? "Creating Workspace..." : "Start Free Trial"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth" className="text-primary hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from "react";
import {
  BarChart3, Building2, DollarSign, Zap, Globe, AlertTriangle,
  Mail, Image, FileText, Menu, X, LogOut, Crown, Radio, CreditCard, Package, PanelTop, Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Overview", icon: BarChart3, tab: "overview" },
  { label: "Companies", icon: Building2, tab: "companies" },
  { label: "Revenue", icon: DollarSign, tab: "revenue" },
  { label: "Products", icon: Package, tab: "products" },
  { label: "Integrations", icon: CreditCard, tab: "integrations" },
  { label: "Demos", icon: Zap, tab: "demos" },
  { label: "Blog", icon: Globe, tab: "blog" },
  { label: "Alerts", icon: AlertTriangle, tab: "alerts" },
  { label: "Email", icon: Mail, tab: "email" },
  { label: "Templates", icon: FileText, tab: "email-templates" },
  { label: "Broadcast", icon: Radio, tab: "broadcast" },
  { label: "Landing Page", icon: PanelTop, tab: "landing-page" },
  { label: "Images", icon: Image, tab: "landing" },
  { label: "SEO", icon: Search, tab: "seo" },
];

// Primary bottom tabs (most used)
const bottomTabs = [
  { label: "Overview", icon: BarChart3, tab: "overview" },
  { label: "Companies", icon: Building2, tab: "companies" },
  { label: "Revenue", icon: DollarSign, tab: "revenue" },
  { label: "Alerts", icon: AlertTriangle, tab: "alerts" },
];

interface AdminMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AdminMobileNav({ activeTab, onTabChange }: AdminMobileNavProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Bottom navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-xl border-t border-border/30 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {bottomTabs.map((item) => (
            <button
              key={item.tab}
              onClick={() => onTabChange(item.tab)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === item.tab
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}

          {/* More menu trigger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground">
                <Menu className="h-5 w-5" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-8">
              <div className="space-y-1 pt-2">
                <div className="flex items-center gap-2 px-3 py-2 mb-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">Platform Control</span>
                </div>
                {navItems.map((item) => (
                  <button
                    key={item.tab}
                    onClick={() => { onTabChange(item.tab); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                      activeTab === item.tab
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
                <div className="border-t border-border/30 mt-2 pt-2 space-y-1">
                  <button
                    onClick={() => { navigate("/"); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/50"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Ke Workspace</span>
                  </button>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      toast.success("Logged out");
                      navigate("/auth");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}

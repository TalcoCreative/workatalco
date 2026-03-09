import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart3, Building2, DollarSign, Zap, Globe, AlertTriangle,
  Mail, Crown, LogOut, Image, FileText, Radio, CreditCard, Package, PanelTop, Search,
} from "lucide-react";

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
  { label: "Email Templates", icon: FileText, tab: "email-templates" },
  { label: "Broadcast", icon: Radio, tab: "broadcast" },
  { label: "Landing Page", icon: PanelTop, tab: "landing-page" },
  { label: "Landing Images", icon: Image, tab: "landing" },
  { label: "SEO", icon: Search, tab: "seo" },
];

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed?: boolean;
}

export function AdminSidebar({ activeTab, onTabChange, collapsed }: AdminSidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className={`hidden lg:flex flex-col border-r border-border/30 bg-sidebar h-[calc(100vh-56px)] sticky top-14 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.tab}
            onClick={() => onTabChange(item.tab)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === item.tab
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </div>

      <div className="border-t border-border/30 p-2 space-y-1">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
        >
          <Building2 className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Ke Workspace</span>}
        </button>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            toast.success("Logged out");
            navigate("/auth");
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

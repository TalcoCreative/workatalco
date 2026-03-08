
-- Subscription products table
CREATE TABLE public.subscription_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  tier TEXT NOT NULL DEFAULT 'starter',
  price_per_user INTEGER NOT NULL DEFAULT 0,
  original_price_per_user INTEGER, -- strikethrough price
  max_users INTEGER NOT NULL DEFAULT 10,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voucher codes table
CREATE TABLE public.voucher_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value NUMERIC NOT NULL DEFAULT 0,
  max_uses INTEGER, -- null = unlimited
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  applicable_tiers TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referral codes table
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  owner_name TEXT,
  owner_email TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  reward_type TEXT DEFAULT 'none', -- 'none', 'credit', 'commission'
  reward_value NUMERIC DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform integration settings table
CREATE TABLE public.platform_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  last_tested_at TIMESTAMPTZ,
  test_status TEXT DEFAULT 'untested',
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;

-- RLS: Allow read for all authenticated, write for platform admins only
-- Products: public read (for pricing page), admin write
CREATE POLICY "Anyone can read active products" ON public.subscription_products FOR SELECT USING (is_active = true);
CREATE POLICY "Platform admins can manage products" ON public.subscription_products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()));

-- Vouchers: admin only
CREATE POLICY "Platform admins can manage vouchers" ON public.voucher_codes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()));

-- Referrals: admin only
CREATE POLICY "Platform admins can manage referrals" ON public.referral_codes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()));

-- Integrations: admin only
CREATE POLICY "Platform admins can manage integrations" ON public.platform_integrations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()));

-- Updated at triggers
CREATE TRIGGER set_updated_at_subscription_products BEFORE UPDATE ON public.subscription_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_voucher_codes BEFORE UPDATE ON public.voucher_codes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_referral_codes BEFORE UPDATE ON public.referral_codes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_platform_integrations BEFORE UPDATE ON public.platform_integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default Midtrans integration row
INSERT INTO public.platform_integrations (provider, display_name, is_enabled, config)
VALUES ('midtrans', 'Midtrans Payment Gateway', false, '{"environment": "sandbox"}'::jsonb);

-- Seed default products from current tiers
INSERT INTO public.subscription_products (name, slug, tier, price_per_user, max_users, sort_order, features) VALUES
('Starter', 'starter', 'starter', 7000, 10, 1, '["Projects & Tasks", "Schedule & Calendar", "Client Management", "Team Collaboration", "File Storage 5GB"]'::jsonb),
('Professional', 'professional', 'professional', 21000, 30, 2, '["Everything in Starter", "HR Dashboard & Analytics", "Leave & Attendance", "Meeting Management", "Asset Management", "Event Management", "Shooting Schedule", "Reports & Export"]'::jsonb),
('Enterprise', 'enterprise', 'enterprise', 25000, 100, 3, '["Everything in Professional", "Finance Center", "Income & Balance Sheet", "CEO Dashboard", "Sales & Prospects", "Recruitment System", "KOL Database", "Social Media Management", "Priority Support"]'::jsonb);


-- Platform admins table (system-level, not company-level)
CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Platform admins can read their own row
CREATE POLICY "Platform admins can read own" ON public.platform_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Tier feature access mapping table
CREATE TABLE public.tier_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  UNIQUE(tier, feature_key)
);

ALTER TABLE public.tier_features ENABLE ROW LEVEL SECURITY;

-- Everyone can read tier features (public config)
CREATE POLICY "Anyone can read tier features" ON public.tier_features
  FOR SELECT TO authenticated USING (true);

-- Insert tier feature mappings
-- STARTER: Basic project management
INSERT INTO public.tier_features (tier, feature_key) VALUES
  ('starter', 'dashboard'),
  ('starter', 'clients'),
  ('starter', 'projects'),
  ('starter', 'tasks'),
  ('starter', 'schedule'),
  ('starter', 'team');

-- PROFESSIONAL: Operational agency
INSERT INTO public.tier_features (tier, feature_key) VALUES
  ('professional', 'dashboard'),
  ('professional', 'clients'),
  ('professional', 'client_hub'),
  ('professional', 'projects'),
  ('professional', 'tasks'),
  ('professional', 'schedule'),
  ('professional', 'shooting'),
  ('professional', 'meeting'),
  ('professional', 'leave'),
  ('professional', 'reimburse'),
  ('professional', 'asset'),
  ('professional', 'event'),
  ('professional', 'reports'),
  ('professional', 'team'),
  ('professional', 'hr_dashboard'),
  ('professional', 'hr_analytics'),
  ('professional', 'holiday_calendar'),
  ('professional', 'editorial_plan'),
  ('professional', 'form_builder');

-- ENTERPRISE: Full ERP (all features)
INSERT INTO public.tier_features (tier, feature_key) VALUES
  ('enterprise', 'dashboard'),
  ('enterprise', 'clients'),
  ('enterprise', 'client_hub'),
  ('enterprise', 'projects'),
  ('enterprise', 'tasks'),
  ('enterprise', 'schedule'),
  ('enterprise', 'shooting'),
  ('enterprise', 'meeting'),
  ('enterprise', 'leave'),
  ('enterprise', 'reimburse'),
  ('enterprise', 'asset'),
  ('enterprise', 'event'),
  ('enterprise', 'reports'),
  ('enterprise', 'form_builder'),
  ('enterprise', 'kol_database'),
  ('enterprise', 'kol_campaign'),
  ('enterprise', 'letters'),
  ('enterprise', 'social_media'),
  ('enterprise', 'editorial_plan'),
  ('enterprise', 'content_builder'),
  ('enterprise', 'team'),
  ('enterprise', 'hr_dashboard'),
  ('enterprise', 'hr_analytics'),
  ('enterprise', 'holiday_calendar'),
  ('enterprise', 'performance'),
  ('enterprise', 'recruitment'),
  ('enterprise', 'recruitment_dashboard'),
  ('enterprise', 'recruitment_forms'),
  ('enterprise', 'finance'),
  ('enterprise', 'income_statement'),
  ('enterprise', 'balance_sheet'),
  ('enterprise', 'prospects'),
  ('enterprise', 'sales_analytics'),
  ('enterprise', 'ceo_dashboard'),
  ('enterprise', 'email_settings'),
  ('enterprise', 'role_management');

-- TRIAL gets same as starter
INSERT INTO public.tier_features (tier, feature_key) VALUES
  ('trial', 'dashboard'),
  ('trial', 'clients'),
  ('trial', 'projects'),
  ('trial', 'tasks'),
  ('trial', 'schedule'),
  ('trial', 'team');

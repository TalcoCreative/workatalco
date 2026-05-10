
-- Helper: does a specific company tier grant a feature?
CREATE OR REPLACE FUNCTION public.company_has_tier_feature(_company_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = _company_id
      AND (
        c.subscription_tier IN ('enterprise', 'fnf')
        OR EXISTS (
          SELECT 1 FROM public.tier_features tf
          WHERE tf.tier = c.subscription_tier
            AND tf.feature_key = _feature
        )
      )
  )
$$;

-- Helper: does the calling user belong to ANY company whose tier grants the feature?
CREATE OR REPLACE FUNCTION public.user_has_tier_feature(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm
    JOIN public.companies c ON c.id = cm.company_id
    WHERE cm.user_id = _user_id
      AND (
        c.subscription_tier IN ('enterprise', 'fnf')
        OR EXISTS (
          SELECT 1 FROM public.tier_features tf
          WHERE tf.tier = c.subscription_tier
            AND tf.feature_key = _feature
        )
      )
  )
$$;

-- Platform super_admin bypass
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- ============== FINANCE GATING ==============
-- Apply restrictive policies that require finance tier feature
-- These work AS AND with existing permissive policies

DO $$
DECLARE
  t text;
  finance_tables text[] := ARRAY['expenses','income','ledger_entries','payroll','recurring_budget'];
  bs_tables text[] := ARRAY['balance_sheet_items','chart_of_accounts','ledger_account_mappings'];
  email_tables text[] := ARRAY['email_settings','email_templates','email_broadcasts','email_queue','email_logs'];
BEGIN
  -- Finance feature
  FOREACH t IN ARRAY finance_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tier_gate_finance ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY tier_gate_finance ON public.%I
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (public.is_platform_admin(auth.uid()) OR public.user_has_tier_feature(auth.uid(), 'finance'))
      WITH CHECK (public.is_platform_admin(auth.uid()) OR public.user_has_tier_feature(auth.uid(), 'finance'))
    $f$, t);
  END LOOP;

  -- Balance sheet / accounting feature
  FOREACH t IN ARRAY bs_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tier_gate_balance_sheet ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY tier_gate_balance_sheet ON public.%I
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (public.is_platform_admin(auth.uid()) OR public.user_has_tier_feature(auth.uid(), 'balance_sheet') OR public.user_has_tier_feature(auth.uid(), 'finance'))
      WITH CHECK (public.is_platform_admin(auth.uid()) OR public.user_has_tier_feature(auth.uid(), 'balance_sheet') OR public.user_has_tier_feature(auth.uid(), 'finance'))
    $f$, t);
  END LOOP;

  -- Email settings feature
  FOREACH t IN ARRAY email_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tier_gate_email_settings ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY tier_gate_email_settings ON public.%I
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (public.is_platform_admin(auth.uid()) OR public.user_has_tier_feature(auth.uid(), 'email_settings'))
      WITH CHECK (public.is_platform_admin(auth.uid()) OR public.user_has_tier_feature(auth.uid(), 'email_settings'))
    $f$, t);
  END LOOP;
END $$;

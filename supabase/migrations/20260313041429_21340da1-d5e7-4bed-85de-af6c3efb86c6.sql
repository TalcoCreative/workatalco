
-- 1. Add company_id to holidays table
ALTER TABLE public.holidays ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2. Drop the unique(user_id) constraint on user_dynamic_roles to allow per-company roles
ALTER TABLE public.user_dynamic_roles DROP CONSTRAINT IF EXISTS user_dynamic_roles_user_id_key;

-- 3. Add unique on (user_id, role_id) instead
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_dynamic_roles_user_id_role_id_key'
  ) THEN
    ALTER TABLE public.user_dynamic_roles ADD CONSTRAINT user_dynamic_roles_user_id_role_id_key UNIQUE (user_id, role_id);
  END IF;
END $$;

-- 4. Update RLS on holidays to scope by company membership
DROP POLICY IF EXISTS "Anyone can view active holidays" ON public.holidays;
DROP POLICY IF EXISTS "HR and admins can manage holidays" ON public.holidays;
DROP POLICY IF EXISTS "Users can view holidays" ON public.holidays;
DROP POLICY IF EXISTS "Users can insert holidays" ON public.holidays;
DROP POLICY IF EXISTS "Users can update holidays" ON public.holidays;

CREATE POLICY "Users can view holidays in their company"
  ON public.holidays FOR SELECT TO authenticated
  USING (
    company_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.company_members cm 
      WHERE cm.user_id = auth.uid() AND cm.company_id = holidays.company_id
    )
  );

CREATE POLICY "Users can insert holidays for their company"
  ON public.holidays FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm 
      WHERE cm.user_id = auth.uid() AND cm.company_id = holidays.company_id
    )
  );

CREATE POLICY "Users can update holidays in their company"
  ON public.holidays FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm 
      WHERE cm.user_id = auth.uid() AND cm.company_id = holidays.company_id
    )
  );

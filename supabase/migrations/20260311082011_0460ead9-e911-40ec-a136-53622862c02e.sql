-- 1. Create a security definer function to check if two users share a company
CREATE OR REPLACE FUNCTION public.shares_company_with(_viewer_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm1
    JOIN public.company_members cm2 ON cm1.company_id = cm2.company_id
    WHERE cm1.user_id = _viewer_id
      AND cm2.user_id = _target_user_id
  )
$$;

-- 2. Fix profiles: drop overly permissive SELECT, add company-scoped one
DROP POLICY IF EXISTS "All authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Users can view profiles in same company"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.shares_company_with(auth.uid(), id)
  );

-- 3. Fix user_roles: drop overly permissive SELECT, add company-scoped one  
DROP POLICY IF EXISTS "All authenticated users can view roles" ON public.user_roles;

CREATE POLICY "Users can view roles in same company"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.shares_company_with(auth.uid(), user_id)
  );

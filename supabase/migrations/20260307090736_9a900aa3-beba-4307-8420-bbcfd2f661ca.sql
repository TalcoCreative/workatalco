
-- Fix infinite recursion in company_members RLS
-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Members can view their company members" ON public.company_members;

-- Create a security definer function to check membership without RLS
CREATE OR REPLACE FUNCTION public.is_member_of_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- Create a security definer function to get user's company ids
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_members
  WHERE user_id = _user_id
$$;

-- Re-create the SELECT policy without recursion
CREATE POLICY "Members can view their company members"
ON public.company_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
);

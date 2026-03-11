-- Drop restrictive old role-based policies
DROP POLICY IF EXISTS "Authorized roles can create KOL" ON public.kol_database;
DROP POLICY IF EXISTS "Authorized roles can update KOL" ON public.kol_database;

-- Allow any authenticated company member to insert KOL (scoped by company_id)
CREATE POLICY "Company members can create KOL"
ON public.kol_database
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IS NOT NULL 
  AND public.is_member_of_company(auth.uid(), company_id)
);

-- Allow any authenticated company member to update KOL within their company
CREATE POLICY "Company members can update KOL"
ON public.kol_database
FOR UPDATE
TO authenticated
USING (
  company_id IS NOT NULL 
  AND public.is_member_of_company(auth.uid(), company_id)
)
WITH CHECK (
  company_id IS NOT NULL 
  AND public.is_member_of_company(auth.uid(), company_id)
);

-- Also fix the overly permissive ALL policy and SELECT policy to scope by company
DROP POLICY IF EXISTS "All authenticated users can manage KOL database" ON public.kol_database;
DROP POLICY IF EXISTS "All authenticated users can view KOL database" ON public.kol_database;

CREATE POLICY "Company members can view KOL"
ON public.kol_database
FOR SELECT
TO authenticated
USING (
  company_id IS NOT NULL 
  AND public.is_member_of_company(auth.uid(), company_id)
);

CREATE POLICY "Company members can delete KOL"
ON public.kol_database
FOR DELETE
TO authenticated
USING (
  company_id IS NOT NULL 
  AND public.is_member_of_company(auth.uid(), company_id)
);
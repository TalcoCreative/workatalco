
-- Drop the unique constraint on name to allow same role names across companies
ALTER TABLE public.dynamic_roles DROP CONSTRAINT IF EXISTS dynamic_roles_name_key;

-- Add a unique constraint on (name, company_id) instead
CREATE UNIQUE INDEX IF NOT EXISTS dynamic_roles_name_company_id_key ON public.dynamic_roles (name, company_id);

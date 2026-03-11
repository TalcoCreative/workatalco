-- Add company_id to dynamic_roles
ALTER TABLE public.dynamic_roles 
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_dynamic_roles_company_id ON public.dynamic_roles(company_id);

-- Backfill: set company_id based on created_by user's company membership
UPDATE public.dynamic_roles dr
SET company_id = (
  SELECT cm.company_id 
  FROM public.company_members cm 
  WHERE cm.user_id = dr.created_by 
  LIMIT 1
)
WHERE dr.company_id IS NULL AND dr.created_by IS NOT NULL;
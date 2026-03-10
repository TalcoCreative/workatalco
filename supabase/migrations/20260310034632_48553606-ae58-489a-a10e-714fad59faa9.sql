
-- Add company_id to kol_database
ALTER TABLE public.kol_database ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Add company_id to kol_campaigns  
ALTER TABLE public.kol_campaigns ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Backfill company_id from created_by user's company membership
UPDATE public.kol_database kd
SET company_id = (
  SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = kd.created_by LIMIT 1
)
WHERE kd.company_id IS NULL;

UPDATE public.kol_campaigns kc
SET company_id = (
  SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = kc.created_by LIMIT 1
)
WHERE kc.company_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kol_database_company_id ON public.kol_database(company_id);
CREATE INDEX IF NOT EXISTS idx_kol_campaigns_company_id ON public.kol_campaigns(company_id);

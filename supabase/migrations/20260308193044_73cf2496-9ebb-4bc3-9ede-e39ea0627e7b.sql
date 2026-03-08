
-- Add company_id to positions table
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill company_id from created_by's company membership
UPDATE public.positions p
SET company_id = (
  SELECT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = p.created_by
  LIMIT 1
)
WHERE p.company_id IS NULL AND p.created_by IS NOT NULL;

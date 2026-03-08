
-- Add company_id to forms table
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Add company_id to recruitment_forms table  
ALTER TABLE public.recruitment_forms ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Update existing forms to link to company based on created_by user
UPDATE public.forms f
SET company_id = (
  SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = f.created_by LIMIT 1
)
WHERE f.company_id IS NULL;

UPDATE public.recruitment_forms rf
SET company_id = (
  SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = rf.created_by LIMIT 1
)
WHERE rf.company_id IS NULL;

-- Make slug unique per company instead of globally unique
-- Drop old unique constraint on slug if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forms_slug_key') THEN
    ALTER TABLE public.forms DROP CONSTRAINT forms_slug_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recruitment_forms_slug_key') THEN
    ALTER TABLE public.recruitment_forms DROP CONSTRAINT recruitment_forms_slug_key;
  END IF;
END $$;

-- Add unique constraint on (company_id, slug)
ALTER TABLE public.forms ADD CONSTRAINT forms_company_slug_unique UNIQUE (company_id, slug);
ALTER TABLE public.recruitment_forms ADD CONSTRAINT recruitment_forms_company_slug_unique UNIQUE (company_id, slug);

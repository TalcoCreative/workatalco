
-- Add company_id to clients, projects, editorial_plans
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.editorial_plans ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_editorial_plans_company_id ON public.editorial_plans(company_id);

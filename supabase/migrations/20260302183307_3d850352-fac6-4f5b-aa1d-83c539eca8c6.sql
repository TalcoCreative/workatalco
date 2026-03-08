
-- Companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_tier TEXT NOT NULL DEFAULT 'trial',
  trial_start DATE NOT NULL DEFAULT CURRENT_DATE,
  trial_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
  max_users INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company members
CREATE TABLE public.company_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Anyone can view active companies" ON public.companies FOR SELECT USING (is_active = true);
CREATE POLICY "Owner can update company" ON public.companies FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Authenticated can create company" ON public.companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

-- Company members policies
CREATE POLICY "Members can view their company members" ON public.company_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
CREATE POLICY "Company owner can manage members" ON public.company_members FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Company owner can delete members" ON public.company_members FOR DELETE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

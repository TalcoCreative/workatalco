ALTER TABLE public.subscription_products 
  ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS not_included jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.subscription_products 
  ADD COLUMN IF NOT EXISTS annual_multiplier integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS default_users integer NOT NULL DEFAULT 1;
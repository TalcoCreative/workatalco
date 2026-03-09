
ALTER TABLE public.demo_requests 
  ADD COLUMN IF NOT EXISTS demo_date date,
  ADD COLUMN IF NOT EXISTS demo_time time,
  ADD COLUMN IF NOT EXISTS gmeet_link text;

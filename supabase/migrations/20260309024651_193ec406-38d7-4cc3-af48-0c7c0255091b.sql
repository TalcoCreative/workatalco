
CREATE TABLE public.landing_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL UNIQUE,
  content jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;

-- Platform admins can read/write, public can read
CREATE POLICY "Anyone can read landing content"
  ON public.landing_content FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Platform admins can update landing content"
  ON public.landing_content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Platform admins can insert landing content"
  ON public.landing_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Platform admins can delete landing content"
  ON public.landing_content FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );


-- Demo requests table
CREATE TABLE public.demo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  author TEXT NOT NULL DEFAULT 'WORKA Team',
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Demo requests: anyone can insert, only platform admins can read
CREATE POLICY "Anyone can submit demo request" ON public.demo_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read demo requests" ON public.demo_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update demo requests" ON public.demo_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete demo requests" ON public.demo_requests FOR DELETE TO authenticated USING (true);

-- Blog posts: anyone can read published, authenticated can manage
CREATE POLICY "Anyone can read published blog posts" ON public.blog_posts FOR SELECT TO anon, authenticated USING (is_published = true OR (SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())));
CREATE POLICY "Platform admins can insert blog posts" ON public.blog_posts FOR INSERT TO authenticated WITH CHECK ((SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())));
CREATE POLICY "Platform admins can update blog posts" ON public.blog_posts FOR UPDATE TO authenticated USING ((SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())));
CREATE POLICY "Platform admins can delete blog posts" ON public.blog_posts FOR DELETE TO authenticated USING ((SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())));

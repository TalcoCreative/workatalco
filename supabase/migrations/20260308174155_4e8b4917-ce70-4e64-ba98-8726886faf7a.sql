
-- Landing page images management
CREATE TABLE public.landing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_key TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.landing_images ENABLE ROW LEVEL SECURITY;

-- Only platform admins can manage
CREATE POLICY "Platform admins can manage landing images"
ON public.landing_images
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

-- Public can read
CREATE POLICY "Public can read landing images"
ON public.landing_images
FOR SELECT
TO anon
USING (true);

-- Email notification templates (customizable)
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage email templates"
ON public.email_templates
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

-- Seed default email templates
INSERT INTO public.email_templates (template_key, template_name, subject, body_html) VALUES
('task_assignment', 'Task Assignment', 'Tugas Baru: {{title}}', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#f8f9fa;border-radius:12px;padding:24px"><h2 style="color:#1a1a1a;margin:0 0 8px">📋 Tugas Baru Ditugaskan</h2><p style="color:#666;margin:0 0 20px">Hai {{recipient_name}},</p><div style="background:white;border-radius:8px;padding:16px;border-left:4px solid #3b82f6"><h3 style="margin:0 0 8px;color:#1a1a1a">{{title}}</h3><p style="color:#666;margin:0 0 4px">Ditugaskan oleh: <strong>{{creator_name}}</strong></p><p style="color:#666;margin:0 0 4px">Deadline: <strong>{{deadline}}</strong></p><p style="color:#666;margin:0">Priority: <strong>{{priority}}</strong></p></div><a href="{{link}}" style="display:inline-block;margin-top:20px;background:#3b82f6;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Lihat Detail</a></div></div>'),
('task_completed', 'Task Completed', 'Task Selesai: {{title}}', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#f0fdf4;border-radius:12px;padding:24px"><h2 style="color:#1a1a1a;margin:0 0 8px">✅ Task Selesai</h2><p style="color:#666;margin:0 0 20px">Hai {{recipient_name}},</p><div style="background:white;border-radius:8px;padding:16px;border-left:4px solid #22c55e"><h3 style="margin:0 0 8px;color:#1a1a1a">{{title}}</h3><p style="color:#666;margin:0 0 4px">Diselesaikan oleh: <strong>{{creator_name}}</strong></p><p style="color:#666;margin:0">Pada: <strong>{{updated_at}}</strong></p></div><a href="{{link}}" style="display:inline-block;margin-top:20px;background:#22c55e;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Lihat Detail</a></div></div>'),
('task_status_change', 'Task Status Change', 'Status Berubah: {{title}}', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#f8f9fa;border-radius:12px;padding:24px"><h2 style="color:#1a1a1a;margin:0 0 8px">🔄 Status Task Berubah</h2><p style="color:#666;margin:0 0 20px">Hai {{recipient_name}},</p><div style="background:white;border-radius:8px;padding:16px;border-left:4px solid #f59e0b"><h3 style="margin:0 0 8px;color:#1a1a1a">{{title}}</h3><p style="color:#666;margin:0 0 4px">Status baru: <strong>{{status}}</strong></p><p style="color:#666;margin:0">Diubah oleh: <strong>{{creator_name}}</strong></p></div><a href="{{link}}" style="display:inline-block;margin-top:20px;background:#f59e0b;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Lihat Detail</a></div></div>'),
('task_mention', 'Mention in Comment', 'Anda di-mention: {{title}}', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#f8f9fa;border-radius:12px;padding:24px"><h2 style="color:#1a1a1a;margin:0 0 8px">💬 Anda di-Mention</h2><p style="color:#666;margin:0 0 20px">Hai {{recipient_name}},</p><div style="background:white;border-radius:8px;padding:16px;border-left:4px solid #8b5cf6"><h3 style="margin:0 0 8px;color:#1a1a1a">{{title}}</h3><p style="color:#666;margin:0 0 4px">Oleh: <strong>{{creator_name}}</strong></p><p style="color:#888;margin:0;font-style:italic">"{{comment_content}}"</p></div><a href="{{link}}" style="display:inline-block;margin-top:20px;background:#8b5cf6;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Lihat Komentar</a></div></div>'),
('task_overdue', 'Task Overdue', '⚠️ Task Overdue: {{title}}', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#fef2f2;border-radius:12px;padding:24px"><h2 style="color:#dc2626;margin:0 0 8px">⚠️ Task Overdue</h2><p style="color:#666;margin:0 0 20px">Hai {{recipient_name}},</p><div style="background:white;border-radius:8px;padding:16px;border-left:4px solid #dc2626"><h3 style="margin:0 0 8px;color:#1a1a1a">{{title}}</h3><p style="color:#dc2626;margin:0">Deadline: <strong>{{deadline}}</strong></p></div><a href="{{link}}" style="display:inline-block;margin-top:20px;background:#dc2626;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Lihat Task</a></div></div>'),
('meeting_invitation', 'Meeting Invitation', 'Undangan Meeting: {{title}}', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#f8f9fa;border-radius:12px;padding:24px"><h2 style="color:#1a1a1a;margin:0 0 8px">📅 Undangan Meeting</h2><p style="color:#666;margin:0 0 20px">Hai {{recipient_name}},</p><div style="background:white;border-radius:8px;padding:16px;border-left:4px solid #06b6d4"><h3 style="margin:0 0 8px;color:#1a1a1a">{{title}}</h3><p style="color:#666;margin:0 0 4px">Waktu: <strong>{{deadline}}</strong></p><p style="color:#666;margin:0 0 4px">Lokasi: <strong>{{location}}</strong></p><p style="color:#666;margin:0">Diundang oleh: <strong>{{creator_name}}</strong></p></div><a href="{{link}}" style="display:inline-block;margin-top:20px;background:#06b6d4;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Lihat Meeting</a></div></div>'),
('shooting_assignment', 'Shooting Assignment', 'Jadwal Shooting: {{title}}', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#f8f9fa;border-radius:12px;padding:24px"><h2 style="color:#1a1a1a;margin:0 0 8px">🎬 Jadwal Shooting</h2><p style="color:#666;margin:0 0 20px">Hai {{recipient_name}},</p><div style="background:white;border-radius:8px;padding:16px;border-left:4px solid #f97316"><h3 style="margin:0 0 8px;color:#1a1a1a">{{title}}</h3><p style="color:#666;margin:0 0 4px">Waktu: <strong>{{deadline}}</strong></p><p style="color:#666;margin:0 0 4px">Lokasi: <strong>{{location}}</strong></p><p style="color:#666;margin:0">PIC: <strong>{{creator_name}}</strong></p></div><a href="{{link}}" style="display:inline-block;margin-top:20px;background:#f97316;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Lihat Detail</a></div></div>'),
('event_assignment', 'Event Assignment', 'Event Baru: {{title}}', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#f8f9fa;border-radius:12px;padding:24px"><h2 style="color:#1a1a1a;margin:0 0 8px">🎉 Event Assignment</h2><p style="color:#666;margin:0 0 20px">Hai {{recipient_name}},</p><div style="background:white;border-radius:8px;padding:16px;border-left:4px solid #ec4899"><h3 style="margin:0 0 8px;color:#1a1a1a">{{title}}</h3><p style="color:#666;margin:0 0 4px">Tanggal: <strong>{{deadline}}</strong></p><p style="color:#666;margin:0">PIC: <strong>{{creator_name}}</strong></p></div><a href="{{link}}" style="display:inline-block;margin-top:20px;background:#ec4899;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Lihat Event</a></div></div>'),
('project_assignment', 'Project Assignment', 'Project Baru: {{title}}', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#f8f9fa;border-radius:12px;padding:24px"><h2 style="color:#1a1a1a;margin:0 0 8px">📁 Project Assignment</h2><p style="color:#666;margin:0 0 20px">Hai {{recipient_name}},</p><div style="background:white;border-radius:8px;padding:16px;border-left:4px solid #6366f1"><h3 style="margin:0 0 8px;color:#1a1a1a">{{title}}</h3><p style="color:#666;margin:0">Ditambahkan oleh: <strong>{{creator_name}}</strong></p></div><a href="{{link}}" style="display:inline-block;margin-top:20px;background:#6366f1;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Lihat Project</a></div></div>'),
('shooting_status_update', 'Shooting Status Update', 'Update Shooting: {{title}}', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#f8f9fa;border-radius:12px;padding:24px"><h2 style="color:#1a1a1a;margin:0 0 8px">🎬 Status Shooting</h2><p style="color:#666;margin:0 0 20px">Hai {{recipient_name}},</p><div style="background:white;border-radius:8px;padding:16px;border-left:4px solid #f97316"><h3 style="margin:0 0 8px;color:#1a1a1a">{{title}}</h3><p style="color:#666;margin:0 0 4px">Status: <strong>{{status}}</strong></p><p style="color:#666;margin:0">Diubah oleh: <strong>{{creator_name}}</strong></p></div><a href="{{link}}" style="display:inline-block;margin-top:20px;background:#f97316;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Lihat Detail</a></div></div>');

-- Seed default landing images
INSERT INTO public.landing_images (image_key, image_url, alt_text) VALUES
('screenshot-dashboard', '/assets/screenshot-dashboard.jpg', 'Dashboard & Projects'),
('screenshot-mobile', '/assets/screenshot-mobile.jpg', 'Mobile App'),
('screenshot-hr', '/assets/screenshot-hr.jpg', 'HR & People Analytics'),
('screenshot-schedule', '/assets/screenshot-schedule.jpg', 'Schedule & Calendar'),
('screenshot-finance', '/assets/screenshot-finance.jpg', 'Finance Center');

-- Create storage bucket for landing images
INSERT INTO storage.buckets (id, name, public) VALUES ('landing-assets', 'landing-assets', true);

-- Storage policies
CREATE POLICY "Platform admins can upload landing assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'landing-assets' AND
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

CREATE POLICY "Platform admins can update landing assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'landing-assets' AND
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

CREATE POLICY "Platform admins can delete landing assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'landing-assets' AND
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

CREATE POLICY "Public can read landing assets"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'landing-assets');


-- Email queue table for processing emails through workers
CREATE TABLE public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  template_key TEXT,
  template_data JSONB DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  provider TEXT NOT NULL DEFAULT 'resend' CHECK (provider IN ('resend', 'brevo')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  related_id TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  batch_id UUID
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages email queue" ON public.email_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Platform admins can view email queue" ON public.email_queue FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

CREATE INDEX idx_email_queue_status ON public.email_queue(status, priority, scheduled_at);
CREATE INDEX idx_email_queue_batch ON public.email_queue(batch_id) WHERE batch_id IS NOT NULL;

-- User email preferences
CREATE TABLE public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_notifications BOOLEAN NOT NULL DEFAULT true,
  project_updates BOOLEAN NOT NULL DEFAULT true,
  meeting_invitations BOOLEAN NOT NULL DEFAULT true,
  shooting_notifications BOOLEAN NOT NULL DEFAULT true,
  event_notifications BOOLEAN NOT NULL DEFAULT true,
  weekly_reports BOOLEAN NOT NULL DEFAULT false,
  product_updates BOOLEAN NOT NULL DEFAULT true,
  marketing_emails BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own preferences" ON public.email_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Email delivery events (webhook tracking)
CREATE TABLE public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID REFERENCES public.email_logs(id) ON DELETE SET NULL,
  queue_id UUID REFERENCES public.email_queue(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  provider TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins can view email events" ON public.email_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);
CREATE POLICY "Service role manages email events" ON public.email_events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_email_events_type ON public.email_events(event_type, created_at);

-- Broadcast emails table
CREATE TABLE public.email_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'notifications',
  filter_company UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  filter_tier TEXT,
  filter_role TEXT,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins manage broadcasts" ON public.email_broadcasts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

-- Activity timeline
CREATE TABLE public.activity_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  description TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can view timeline" ON public.activity_timeline FOR SELECT TO authenticated USING (
  public.is_member_of_company(auth.uid(), company_id)
);
CREATE POLICY "Authenticated can insert timeline" ON public.activity_timeline FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_activity_timeline_company ON public.activity_timeline(company_id, created_at DESC);
CREATE INDEX idx_activity_timeline_user ON public.activity_timeline(user_id, created_at DESC);

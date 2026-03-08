
CREATE TABLE public.sub_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sub_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sub_tasks" ON public.sub_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sub_tasks" ON public.sub_tasks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sub_tasks" ON public.sub_tasks
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sub_tasks" ON public.sub_tasks
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER set_sub_tasks_updated_at
  BEFORE UPDATE ON public.sub_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

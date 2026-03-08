
-- Create personal_notes table
CREATE TABLE public.personal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;

-- Only the owner can select their own notes
CREATE POLICY "Users can view own notes"
  ON public.personal_notes FOR SELECT
  USING (user_id = auth.uid());

-- Only the owner can insert their own notes
CREATE POLICY "Users can insert own notes"
  ON public.personal_notes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Only the owner can update their own notes
CREATE POLICY "Users can update own notes"
  ON public.personal_notes FOR UPDATE
  USING (user_id = auth.uid());

-- Only the owner can delete their own notes
CREATE POLICY "Users can delete own notes"
  ON public.personal_notes FOR DELETE
  USING (user_id = auth.uid());

-- Auto-update updated_at
CREATE TRIGGER set_personal_notes_updated_at
  BEFORE UPDATE ON public.personal_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

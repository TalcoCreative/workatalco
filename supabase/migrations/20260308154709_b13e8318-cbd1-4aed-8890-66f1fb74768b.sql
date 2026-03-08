
-- Add 'revise' to ep_slide_status enum
ALTER TYPE public.ep_slide_status ADD VALUE IF NOT EXISTS 'revise' AFTER 'proposed';

-- Add created_by column to editorial_slides for tracking who created each slide
ALTER TABLE public.editorial_slides ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

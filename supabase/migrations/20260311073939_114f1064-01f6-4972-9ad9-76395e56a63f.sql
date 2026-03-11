-- Fix task update RLS: allow task_assignees (multi-assign) to update tasks too
CREATE OR REPLACE FUNCTION public.is_task_assignee(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE user_id = _user_id AND task_id = _task_id
  )
$$;

-- Drop old restrictive update policy
DROP POLICY IF EXISTS "Assigned users can update their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Super admin and creators can manage all tasks" ON public.tasks;

-- New update policy: creator, assigned_to, task_assignees, or super_admin can update
CREATE POLICY "Users can update their tasks"
ON public.tasks FOR UPDATE TO authenticated
USING (
  auth.uid() = created_by
  OR auth.uid() = assigned_to
  OR public.is_task_assignee(auth.uid(), id)
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Re-create delete policy for super_admin and creators
DROP POLICY IF EXISTS "All authenticated users can delete tasks" ON public.tasks;
CREATE POLICY "Creators and admins can delete tasks"
ON public.tasks FOR DELETE TO authenticated
USING (
  auth.uid() = created_by
  OR public.has_role(auth.uid(), 'super_admin')
);
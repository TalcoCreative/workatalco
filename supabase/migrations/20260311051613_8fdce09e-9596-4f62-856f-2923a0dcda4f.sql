-- Function for platform admin to get all company member counts
CREATE OR REPLACE FUNCTION public.admin_get_company_member_counts()
RETURNS TABLE(company_id uuid, member_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.company_id, COUNT(*)::bigint as member_count
  FROM public.company_members cm
  GROUP BY cm.company_id
$$;

-- Function for platform admin to get activity timeline across all companies
CREATE OR REPLACE FUNCTION public.admin_get_activity_timeline(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_company_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  user_id uuid,
  event_type text,
  entity_type text,
  entity_name text,
  entity_id text,
  description text,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    at.id, at.company_id, at.user_id, at.event_type, 
    at.entity_type, at.entity_name, at.entity_id,
    at.description, at.metadata::jsonb, at.created_at::timestamptz
  FROM public.activity_timeline at
  WHERE (p_company_id IS NULL OR at.company_id = p_company_id)
  ORDER BY at.created_at DESC
  LIMIT p_limit
  OFFSET p_offset
$$;
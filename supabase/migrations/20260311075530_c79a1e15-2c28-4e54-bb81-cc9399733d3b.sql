
-- Fix trigger to use correct column name for shooting_schedules (requested_by instead of created_by)
CREATE OR REPLACE FUNCTION public.log_activity_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_entity_name text;
  v_row jsonb;
  v_user_id uuid;
BEGIN
  v_row := to_jsonb(NEW);

  -- Determine company_id based on table
  v_company_id := CASE
    WHEN TG_TABLE_NAME = 'tasks' THEN (SELECT c.company_id FROM clients c JOIN projects p ON p.client_id = c.id WHERE p.id = (v_row->>'project_id')::uuid LIMIT 1)
    WHEN TG_TABLE_NAME = 'projects' THEN (SELECT c.company_id FROM clients c WHERE c.id = (v_row->>'client_id')::uuid LIMIT 1)
    WHEN TG_TABLE_NAME = 'clients' THEN (v_row->>'company_id')::uuid
    WHEN TG_TABLE_NAME = 'shooting_schedules' THEN (SELECT c.company_id FROM clients c WHERE c.id = (v_row->>'client_id')::uuid LIMIT 1)
    WHEN TG_TABLE_NAME = 'meetings' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = (v_row->>'created_by')::uuid LIMIT 1)
    WHEN TG_TABLE_NAME = 'events' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = (v_row->>'created_by')::uuid LIMIT 1)
    WHEN TG_TABLE_NAME = 'assets' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = (v_row->>'created_by')::uuid LIMIT 1)
    WHEN TG_TABLE_NAME = 'letters' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = (v_row->>'created_by')::uuid LIMIT 1)
    WHEN TG_TABLE_NAME = 'kol_database' THEN COALESCE((v_row->>'company_id')::uuid, (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = (v_row->>'created_by')::uuid LIMIT 1))
    WHEN TG_TABLE_NAME = 'kol_campaigns' THEN COALESCE((v_row->>'company_id')::uuid, (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = (v_row->>'created_by')::uuid LIMIT 1))
    WHEN TG_TABLE_NAME = 'editorial_plans' THEN (v_row->>'company_id')::uuid
    WHEN TG_TABLE_NAME = 'leave_requests' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = (v_row->>'user_id')::uuid LIMIT 1)
    WHEN TG_TABLE_NAME = 'candidates' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = (v_row->>'created_by')::uuid LIMIT 1)
    WHEN TG_TABLE_NAME = 'forms' THEN (v_row->>'company_id')::uuid
    ELSE NULL
  END;

  -- Determine entity name
  v_entity_name := CASE
    WHEN TG_TABLE_NAME IN ('tasks', 'projects', 'shooting_schedules', 'meetings', 'events', 'editorial_plans') THEN v_row->>'title'
    WHEN TG_TABLE_NAME IN ('clients', 'assets', 'kol_database', 'kol_campaigns') THEN v_row->>'name'
    WHEN TG_TABLE_NAME = 'letters' THEN v_row->>'letter_number'
    WHEN TG_TABLE_NAME = 'leave_requests' THEN v_row->>'leave_type'
    WHEN TG_TABLE_NAME = 'candidates' THEN v_row->>'full_name'
    WHEN TG_TABLE_NAME = 'forms' THEN v_row->>'title'
    ELSE 'Unknown'
  END;

  -- Determine user_id (some tables use requested_by instead of created_by)
  v_user_id := COALESCE(
    auth.uid(),
    (v_row->>'created_by')::uuid,
    (v_row->>'requested_by')::uuid
  );

  INSERT INTO public.activity_timeline (company_id, user_id, event_type, entity_type, entity_name, entity_id, description)
  VALUES (v_company_id, v_user_id, 'created', TG_TABLE_NAME, v_entity_name, (v_row->>'id')::text,
    'Created new ' || replace(TG_TABLE_NAME, '_', ' ') || ': ' || COALESCE(v_entity_name, 'N/A'));

  RETURN NEW;
END;
$function$;

-- Fix update trigger for shooting_schedules
CREATE OR REPLACE FUNCTION public.log_activity_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_entity_name text;
  v_description text;
  v_event_type text := 'updated';
  v_new jsonb;
  v_old jsonb;
BEGIN
  v_new := to_jsonb(NEW);
  v_old := to_jsonb(OLD);

  v_company_id := CASE
    WHEN TG_TABLE_NAME = 'tasks' THEN (SELECT c.company_id FROM clients c JOIN projects p ON p.client_id = c.id WHERE p.id = (v_new->>'project_id')::uuid LIMIT 1)
    WHEN TG_TABLE_NAME = 'projects' THEN (SELECT c.company_id FROM clients c WHERE c.id = (v_new->>'client_id')::uuid LIMIT 1)
    WHEN TG_TABLE_NAME = 'clients' THEN (v_new->>'company_id')::uuid
    WHEN TG_TABLE_NAME = 'shooting_schedules' THEN (SELECT c.company_id FROM clients c WHERE c.id = (v_new->>'client_id')::uuid LIMIT 1)
    WHEN TG_TABLE_NAME = 'meetings' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = (v_new->>'created_by')::uuid LIMIT 1)
    WHEN TG_TABLE_NAME = 'events' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = (v_new->>'created_by')::uuid LIMIT 1)
    ELSE NULL
  END;

  v_entity_name := CASE
    WHEN TG_TABLE_NAME IN ('tasks', 'projects', 'shooting_schedules', 'meetings', 'events') THEN v_new->>'title'
    WHEN TG_TABLE_NAME = 'clients' THEN v_new->>'name'
    ELSE 'Unknown'
  END;

  IF TG_TABLE_NAME = 'tasks' AND (v_old->>'status') IS DISTINCT FROM (v_new->>'status') THEN
    v_event_type := 'status_changed';
    v_description := 'Task status changed: ' || COALESCE(v_entity_name, '') || ' (' || COALESCE(v_old->>'status', '?') || ' → ' || COALESCE(v_new->>'status', '?') || ')';
  ELSE
    v_description := 'Updated ' || replace(TG_TABLE_NAME, '_', ' ') || ': ' || COALESCE(v_entity_name, 'N/A');
  END IF;

  INSERT INTO public.activity_timeline (company_id, user_id, event_type, entity_type, entity_name, entity_id, description)
  VALUES (v_company_id, auth.uid(), v_event_type, TG_TABLE_NAME, v_entity_name, (v_new->>'id')::text, v_description);

  RETURN NEW;
END;
$function$;

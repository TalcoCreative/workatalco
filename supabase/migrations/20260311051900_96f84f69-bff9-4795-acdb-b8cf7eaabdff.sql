-- Update function for updates
CREATE OR REPLACE FUNCTION public.log_activity_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_entity_name text;
  v_description text;
  v_event_type text := 'updated';
BEGIN
  v_company_id := CASE
    WHEN TG_TABLE_NAME = 'tasks' THEN (SELECT c.company_id FROM clients c JOIN projects p ON p.client_id = c.id WHERE p.id = NEW.project_id LIMIT 1)
    WHEN TG_TABLE_NAME = 'projects' THEN (SELECT c.company_id FROM clients c WHERE c.id = NEW.client_id LIMIT 1)
    WHEN TG_TABLE_NAME = 'clients' THEN NEW.company_id
    WHEN TG_TABLE_NAME = 'shooting_schedules' THEN (SELECT c.company_id FROM clients c WHERE c.id = NEW.client_id LIMIT 1)
    WHEN TG_TABLE_NAME = 'meetings' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = NEW.created_by LIMIT 1)
    WHEN TG_TABLE_NAME = 'events' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = NEW.created_by LIMIT 1)
    ELSE NULL
  END;

  v_entity_name := CASE
    WHEN TG_TABLE_NAME = 'tasks' THEN NEW.title
    WHEN TG_TABLE_NAME = 'projects' THEN NEW.title
    WHEN TG_TABLE_NAME = 'clients' THEN NEW.name
    WHEN TG_TABLE_NAME = 'shooting_schedules' THEN NEW.title
    WHEN TG_TABLE_NAME = 'meetings' THEN NEW.title
    WHEN TG_TABLE_NAME = 'events' THEN NEW.title
    ELSE 'Unknown'
  END;

  IF TG_TABLE_NAME = 'tasks' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_event_type := 'status_changed';
    v_description := 'Task status changed: ' || COALESCE(v_entity_name, '') || ' (' || COALESCE(OLD.status, '?') || ' → ' || COALESCE(NEW.status, '?') || ')';
  ELSE
    v_description := 'Updated ' || replace(TG_TABLE_NAME, '_', ' ') || ': ' || COALESCE(v_entity_name, 'N/A');
  END IF;

  INSERT INTO public.activity_timeline (company_id, user_id, event_type, entity_type, entity_name, entity_id, description)
  VALUES (v_company_id, auth.uid(), v_event_type, TG_TABLE_NAME, v_entity_name, NEW.id::text, v_description);

  RETURN NEW;
END;
$$;

-- Delete function
CREATE OR REPLACE FUNCTION public.log_activity_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_entity_name text;
BEGIN
  v_company_id := CASE
    WHEN TG_TABLE_NAME = 'tasks' THEN (SELECT c.company_id FROM clients c JOIN projects p ON p.client_id = c.id WHERE p.id = OLD.project_id LIMIT 1)
    WHEN TG_TABLE_NAME = 'projects' THEN (SELECT c.company_id FROM clients c WHERE c.id = OLD.client_id LIMIT 1)
    WHEN TG_TABLE_NAME = 'clients' THEN OLD.company_id
    ELSE NULL
  END;

  v_entity_name := CASE
    WHEN TG_TABLE_NAME = 'tasks' THEN OLD.title
    WHEN TG_TABLE_NAME = 'projects' THEN OLD.title
    WHEN TG_TABLE_NAME = 'clients' THEN OLD.name
    ELSE 'Unknown'
  END;

  INSERT INTO public.activity_timeline (company_id, user_id, event_type, entity_type, entity_name, entity_id, description)
  VALUES (v_company_id, auth.uid(), 'deleted', TG_TABLE_NAME, v_entity_name, OLD.id::text, 'Deleted ' || replace(TG_TABLE_NAME, '_', ' ') || ': ' || COALESCE(v_entity_name, 'N/A'));

  RETURN OLD;
END;
$$;

-- Now create the triggers that depend on update/delete functions
CREATE TRIGGER trg_activity_tasks_update AFTER UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION log_activity_on_update();
CREATE TRIGGER trg_activity_tasks_delete AFTER DELETE ON public.tasks FOR EACH ROW EXECUTE FUNCTION log_activity_on_delete();

CREATE TRIGGER trg_activity_projects_update AFTER UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION log_activity_on_update();
CREATE TRIGGER trg_activity_projects_delete AFTER DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION log_activity_on_delete();

CREATE TRIGGER trg_activity_clients_update AFTER UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION log_activity_on_update();
CREATE TRIGGER trg_activity_clients_delete AFTER DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION log_activity_on_delete();

CREATE TRIGGER trg_activity_shooting_update AFTER UPDATE ON public.shooting_schedules FOR EACH ROW EXECUTE FUNCTION log_activity_on_update();

CREATE TRIGGER trg_activity_meetings_update AFTER UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION log_activity_on_update();

CREATE TRIGGER trg_activity_events_update AFTER UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION log_activity_on_update();
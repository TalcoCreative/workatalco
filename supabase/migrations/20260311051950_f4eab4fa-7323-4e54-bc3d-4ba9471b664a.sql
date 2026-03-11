CREATE OR REPLACE FUNCTION public.log_activity_on_insert()
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
    WHEN TG_TABLE_NAME = 'tasks' THEN (SELECT c.company_id FROM clients c JOIN projects p ON p.client_id = c.id WHERE p.id = NEW.project_id LIMIT 1)
    WHEN TG_TABLE_NAME = 'projects' THEN (SELECT c.company_id FROM clients c WHERE c.id = NEW.client_id LIMIT 1)
    WHEN TG_TABLE_NAME = 'clients' THEN NEW.company_id
    WHEN TG_TABLE_NAME = 'shooting_schedules' THEN (SELECT c.company_id FROM clients c WHERE c.id = NEW.client_id LIMIT 1)
    WHEN TG_TABLE_NAME = 'meetings' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = NEW.created_by LIMIT 1)
    WHEN TG_TABLE_NAME = 'events' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = NEW.created_by LIMIT 1)
    WHEN TG_TABLE_NAME = 'assets' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = NEW.created_by LIMIT 1)
    WHEN TG_TABLE_NAME = 'letters' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = NEW.created_by LIMIT 1)
    WHEN TG_TABLE_NAME = 'kol_database' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = NEW.created_by LIMIT 1)
    WHEN TG_TABLE_NAME = 'kol_campaigns' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = NEW.created_by LIMIT 1)
    WHEN TG_TABLE_NAME = 'editorial_plans' THEN NEW.company_id
    WHEN TG_TABLE_NAME = 'leave_requests' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = NEW.user_id LIMIT 1)
    WHEN TG_TABLE_NAME = 'candidates' THEN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = NEW.created_by LIMIT 1)
    ELSE NULL
  END;

  v_entity_name := CASE
    WHEN TG_TABLE_NAME = 'tasks' THEN NEW.title
    WHEN TG_TABLE_NAME = 'projects' THEN NEW.title
    WHEN TG_TABLE_NAME = 'clients' THEN NEW.name
    WHEN TG_TABLE_NAME = 'shooting_schedules' THEN NEW.title
    WHEN TG_TABLE_NAME = 'meetings' THEN NEW.title
    WHEN TG_TABLE_NAME = 'events' THEN NEW.title
    WHEN TG_TABLE_NAME = 'assets' THEN NEW.name
    WHEN TG_TABLE_NAME = 'letters' THEN NEW.letter_number
    WHEN TG_TABLE_NAME = 'kol_database' THEN NEW.name
    WHEN TG_TABLE_NAME = 'kol_campaigns' THEN NEW.name
    WHEN TG_TABLE_NAME = 'editorial_plans' THEN NEW.title
    WHEN TG_TABLE_NAME = 'leave_requests' THEN NEW.leave_type
    WHEN TG_TABLE_NAME = 'candidates' THEN NEW.full_name
    ELSE 'Unknown'
  END;

  INSERT INTO public.activity_timeline (company_id, user_id, event_type, entity_type, entity_name, entity_id, description)
  VALUES (v_company_id, COALESCE(auth.uid(), NEW.created_by), 'created', TG_TABLE_NAME, v_entity_name, NEW.id::text,
    'Created new ' || replace(TG_TABLE_NAME, '_', ' ') || ': ' || COALESCE(v_entity_name, 'N/A'));

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_tasks_insert AFTER INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION log_activity_on_insert();
CREATE TRIGGER trg_activity_projects_insert AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION log_activity_on_insert();
CREATE TRIGGER trg_activity_clients_insert AFTER INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION log_activity_on_insert();
CREATE TRIGGER trg_activity_shooting_insert AFTER INSERT ON public.shooting_schedules FOR EACH ROW EXECUTE FUNCTION log_activity_on_insert();
CREATE TRIGGER trg_activity_meetings_insert AFTER INSERT ON public.meetings FOR EACH ROW EXECUTE FUNCTION log_activity_on_insert();
CREATE TRIGGER trg_activity_events_insert AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION log_activity_on_insert();
CREATE TRIGGER trg_activity_assets_insert AFTER INSERT ON public.assets FOR EACH ROW EXECUTE FUNCTION log_activity_on_insert();
CREATE TRIGGER trg_activity_letters_insert AFTER INSERT ON public.letters FOR EACH ROW EXECUTE FUNCTION log_activity_on_insert();
CREATE TRIGGER trg_activity_kol_insert AFTER INSERT ON public.kol_database FOR EACH ROW EXECUTE FUNCTION log_activity_on_insert();
CREATE TRIGGER trg_activity_campaign_insert AFTER INSERT ON public.kol_campaigns FOR EACH ROW EXECUTE FUNCTION log_activity_on_insert();
CREATE TRIGGER trg_activity_editorial_insert AFTER INSERT ON public.editorial_plans FOR EACH ROW EXECUTE FUNCTION log_activity_on_insert();
CREATE TRIGGER trg_activity_leave_insert AFTER INSERT ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION log_activity_on_insert();
CREATE TRIGGER trg_activity_candidates_insert AFTER INSERT ON public.candidates FOR EACH ROW EXECUTE FUNCTION log_activity_on_insert();
-- =============================================================================
-- AUDIT5 — events vertical hardening (found by adversarial review; applied live).
-- =============================================================================

-- [HIGH] events INSERT bypass: a leftover permissive policy ("Auth users can
-- create events.") let ANY authenticated user insert an event (even
-- status='active'), bypassing the role gate and the moderation queue. Drop it;
-- keep a single role-gated policy that also pins non-staff inserts to
-- status='pending' so the moderation flow can't be skipped via direct insert.
DROP POLICY IF EXISTS "Auth users can create events." ON public.events;
DROP POLICY IF EXISTS "Staff and parliament can create events." ON public.events;
CREATE POLICY "Staff and parliament can create events." ON public.events
  FOR INSERT
  WITH CHECK (
    auth.uid() = organizer_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'moderator', 'parliament')
    )
    AND (
      status = 'pending'
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'moderator')
      )
    )
  );

-- [HIGH] event_registrations had no DB-level enforcement (INSERT RLS only
-- checked user_id = auth.uid()), so a direct PostgREST insert bypassed the API's
-- status / capacity / deadline checks. Enforce all three atomically in a BEFORE
-- INSERT trigger; a per-event advisory lock closes the capacity race.
CREATE OR REPLACE FUNCTION public.tr_enforce_event_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ev RECORD;
  reg_count integer;
  almaty_today date := (now() AT TIME ZONE 'Asia/Almaty')::date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.event_id::text));

  SELECT status, max_students, registration_deadline
    INTO ev FROM public.events WHERE id = NEW.event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = 'check_violation';
  END IF;
  IF ev.status <> 'active' THEN
    RAISE EXCEPTION 'Event is not open for registration' USING ERRCODE = 'check_violation';
  END IF;
  IF ev.registration_deadline IS NOT NULL AND ev.registration_deadline < almaty_today THEN
    RAISE EXCEPTION 'Registration deadline has passed' USING ERRCODE = 'check_violation';
  END IF;
  IF ev.max_students IS NOT NULL THEN
    SELECT count(*) INTO reg_count FROM public.event_registrations WHERE event_id = NEW.event_id;
    IF reg_count >= ev.max_students THEN
      RAISE EXCEPTION 'Event is full' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_event_registration ON public.event_registrations;
CREATE TRIGGER enforce_event_registration
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.tr_enforce_event_registration();

-- [MEDIUM] "Organizers can update own events" had no WITH CHECK, so an organizer
-- (e.g. parliament) could flip their own event's status to 'active', bypassing
-- moderation. Only staff (admin/moderator) or the service role may CHANGE an
-- event's status; organizers keep editing all other fields.
CREATE OR REPLACE FUNCTION public.tr_events_status_change_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF (auth.jwt() ->> 'role') <> 'service_role'
       AND NOT EXISTS (
         SELECT 1 FROM public.profiles
         WHERE id = auth.uid() AND role IN ('admin', 'moderator')
       )
    THEN
      RAISE EXCEPTION 'Only staff can change an event status' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS events_status_change_guard ON public.events;
CREATE TRIGGER events_status_change_guard
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.tr_events_status_change_guard();

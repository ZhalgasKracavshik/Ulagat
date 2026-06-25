-- =============================================================================
-- AUDIT4 — two HIGH bug fixes (already applied to the live DB).
-- =============================================================================

-- [HIGH] Reputation farming via event register/unregister loop.
-- Make the +5 award idempotent per (user, event) so re-registering after an
-- un-registration does not re-mint points (the ledger is append-only).
CREATE OR REPLACE FUNCTION public.tr_registration_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.reputation_ledger
    WHERE user_id = NEW.user_id
      AND action_type = 'Event Registration'
      AND metadata->>'event_id' = NEW.event_id::text
  ) THEN
    PERFORM public.award_reputation_points(
      NEW.user_id, 'Event Registration', 5,
      jsonb_build_object('event_id', NEW.event_id)
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- [HIGH] Broken groups SELECT policy: the subquery's unqualified `id` bound to
-- group_members.id instead of groups.id, so only the creator could read a group
-- (group chat was broken for every invited member). Reuse is_group_member().
DROP POLICY IF EXISTS "Groups are viewable by members." ON public.groups;
CREATE POLICY "Groups are viewable by members." ON public.groups
  FOR SELECT USING (
    creator_id = auth.uid() OR public.is_group_member(id, auth.uid())
  );

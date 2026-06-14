-- =============================================================================
-- Security audit RLS fixes (idempotent).
--
-- Apply this AFTER all earlier db/*.sql have run. Safe to re-run: every
-- statement uses CREATE OR REPLACE / DROP POLICY IF EXISTS.
--
-- NOTE (manual, not SQL): also enable "Leaked password protection" in the
-- Supabase dashboard under Authentication -> Policies/Settings. That is a
-- project auth setting and cannot be toggled from SQL.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- (a) group_members SELECT scoping
--
-- The prior policy (db/schema_sync.sql) used `USING (true)`, which leaked every
-- group membership to any authenticated user. We scope SELECT to the member
-- themselves, fellow members of the same group, or the group's creator.
--
-- A naive "is this user a member of this group" subquery inside the
-- group_members policy is self-referential and triggers RLS recursion. To avoid
-- that we use a SECURITY DEFINER helper, which runs with the function owner's
-- rights and therefore bypasses RLS on its internal read.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_group_member(gid uuid, uid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members WHERE group_id = gid AND user_id = uid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

DROP POLICY IF EXISTS "Members can view group members." ON public.group_members;
CREATE POLICY "Members can view group members." ON public.group_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_group_member(group_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND creator_id = auth.uid())
  );


-- -----------------------------------------------------------------------------
-- (b) events SELECT status filter
--
-- The existing policy "Events are viewable by everyone." (db/master_schema.sql,
-- last redefined in db/moderation_and_expiration.sql) exposed pending/rejected
-- events to the public. Restrict SELECT so non-staff only see active events;
-- the organizer always sees their own, and admins/moderators see all.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Events are viewable by everyone." ON public.events;
DROP POLICY IF EXISTS "Active events are viewable" ON public.events;
CREATE POLICY "Active events are viewable" ON public.events FOR SELECT USING (
  status = 'active'
  OR organizer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

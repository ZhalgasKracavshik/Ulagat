-- =============================================================================
-- Security re-audit (audit2) RLS fixes (idempotent).
--
-- Apply this AFTER db/audit-fixes.sql. Safe to re-run: every statement uses
-- CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- group_members INSERT scoping (IDOR)
--
-- SECURITY: group_members INSERT previously allowed self-join to ANY group
-- (user_id = auth.uid()), exposing private group messages. Restrict to the
-- group creator (the app adds members server-side as the creator).
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Group admins can add members." ON public.group_members;
DROP POLICY IF EXISTS "Group creator can add members." ON public.group_members;
CREATE POLICY "Group creator can add members."
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.groups
            WHERE groups.id = group_members.group_id AND groups.creator_id = auth.uid())
  );

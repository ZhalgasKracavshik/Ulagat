-- =============================================================================
-- AUDIT7 — finish the full-table sweep: study_materials moderation + hygiene.
-- (Applied live.) Result of sweeping every public table's RLS:
--   * No table had RLS disabled.
--   * The duplicate-permissive INSERT hole only affected events + services
--     (both fixed in audit5/audit6).
--   * achievements / lost_items / clubs / messages / groups etc. are enforced
--     by guard triggers and/or proper role-gated policies (verified by attack).
-- =============================================================================

-- [LOW/MED] study_materials: SELECT was a blanket `true` (pending, unreviewed
-- materials were world-readable) and INSERT didn't pin status (a parliament
-- uploader could publish status='active', skipping admin review). Gate pending
-- visibility and pin non-staff inserts to pending. The app lists only
-- status='active', so nothing legitimate breaks.
DROP POLICY IF EXISTS "Everyone can view materials" ON public.study_materials;
DROP POLICY IF EXISTS "Study materials are viewable by everyone." ON public.study_materials;
CREATE POLICY "Active materials or owner or staff can view." ON public.study_materials
  FOR SELECT USING (
    status = 'active'
    OR uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

DROP POLICY IF EXISTS "Staff and parliament can add materials" ON public.study_materials;
CREATE POLICY "Staff and parliament can add materials" ON public.study_materials
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator', 'parliament'))
    AND (
      status = 'pending'
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    )
  );

-- Hygiene: drop redundant duplicate policies (each identical to the kept one).
DROP POLICY IF EXISTS "Users can add achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

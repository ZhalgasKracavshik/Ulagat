-- ============================================================
-- PHASE 12 — CAREER ORIENTATION TRACKER (ЕНТ / UNT prep)
-- Run once in the Supabase SQL Editor.
-- Idempotent: IF NOT EXISTS / DROP POLICY IF EXISTS throughout,
-- safe to re-run.
--
--   career_tracker — one row per student: chosen profile subjects,
--                    the five ЕНТ subject scores (JSONB), target
--                    total /140, and free-text notes.
--   career_targets — target universities/specialties a student is
--                    aiming for, with the last-known grant cutoff and
--                    the grant application deadline.
--
-- Visibility: the student owns their data; the linked parent (via
-- family_bonds) and staff (moderator/admin) may read it. Only the
-- student themselves may write (INSERT/UPDATE/DELETE).
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  profile_subject_1 TEXT,        -- chosen profile subject 1
  profile_subject_2 TEXT,        -- chosen profile subject 2
  ent_scores JSONB DEFAULT '{}', -- {"math_literacy": 12, "reading": 18, "history": 15, "subject_1": 30, "subject_2": 28}
  target_score INTEGER,          -- goal total out of 140
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.career_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  university TEXT NOT NULL,
  specialty TEXT NOT NULL,
  cutoff_score INTEGER,          -- last known grant cutoff (student-entered or from reference data)
  grant_deadline DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_targets_user_id ON public.career_targets (user_id);


-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.career_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_targets ENABLE ROW LEVEL SECURITY;

-- ---------- career_tracker ----------
-- SELECT: own row, the linked parent (family_bonds), or staff.
DROP POLICY IF EXISTS "Owner parent and staff can view tracker" ON public.career_tracker;
CREATE POLICY "Owner parent and staff can view tracker"
  ON public.career_tracker FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.family_bonds
      WHERE student_id = career_tracker.user_id
        AND parent_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- INSERT/UPDATE/DELETE: only the owning student.
DROP POLICY IF EXISTS "Owner can insert tracker" ON public.career_tracker;
CREATE POLICY "Owner can insert tracker"
  ON public.career_tracker FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner can update tracker" ON public.career_tracker;
CREATE POLICY "Owner can update tracker"
  ON public.career_tracker FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner can delete tracker" ON public.career_tracker;
CREATE POLICY "Owner can delete tracker"
  ON public.career_tracker FOR DELETE
  USING (user_id = auth.uid());

-- ---------- career_targets ----------
-- SELECT: own rows, the linked parent (family_bonds), or staff.
DROP POLICY IF EXISTS "Owner parent and staff can view targets" ON public.career_targets;
CREATE POLICY "Owner parent and staff can view targets"
  ON public.career_targets FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.family_bonds
      WHERE student_id = career_targets.user_id
        AND parent_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- INSERT/UPDATE/DELETE: only the owning student.
DROP POLICY IF EXISTS "Owner can insert targets" ON public.career_targets;
CREATE POLICY "Owner can insert targets"
  ON public.career_targets FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner can update targets" ON public.career_targets;
CREATE POLICY "Owner can update targets"
  ON public.career_targets FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner can delete targets" ON public.career_targets;
CREATE POLICY "Owner can delete targets"
  ON public.career_targets FOR DELETE
  USING (user_id = auth.uid());


-- ============================================================
-- 3. SECURITY HARDENING — server-side score/score-cap guard.
-- The server action validates scores, but a direct PostgREST write
-- could store nonsense (negative scores, totals > 140). Validate at
-- the DB layer too: each of the five subject scores in ent_scores
-- must be 0..40 and the total must not exceed 140; target_score and
-- target cutoff_score must be 0..140. auth.uid() IS NULL (SQL editor /
-- service role) passes through.
-- ============================================================

CREATE OR REPLACE FUNCTION public.tr_career_tracker_validate()
RETURNS TRIGGER AS $$
DECLARE
  caller UUID := (SELECT auth.uid());
  k TEXT;
  v NUMERIC;
  total NUMERIC := 0;
BEGIN
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.ent_scores IS NOT NULL THEN
    FOR k, v IN SELECT key, value::text::numeric FROM jsonb_each(NEW.ent_scores)
    LOOP
      IF v < 0 OR v > 40 THEN
        RAISE EXCEPTION 'Each ЕНТ subject score must be between 0 and 40';
      END IF;
      total := total + v;
    END LOOP;
    IF total > 140 THEN
      RAISE EXCEPTION 'Total ЕНТ score cannot exceed 140';
    END IF;
  END IF;

  IF NEW.target_score IS NOT NULL AND (NEW.target_score < 0 OR NEW.target_score > 140) THEN
    RAISE EXCEPTION 'Target score must be between 0 and 140';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_career_tracker_validate ON public.career_tracker;
CREATE TRIGGER on_career_tracker_validate
  BEFORE INSERT OR UPDATE ON public.career_tracker
  FOR EACH ROW EXECUTE PROCEDURE public.tr_career_tracker_validate();

CREATE OR REPLACE FUNCTION public.tr_career_target_validate()
RETURNS TRIGGER AS $$
DECLARE
  caller UUID := (SELECT auth.uid());
BEGIN
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.cutoff_score IS NOT NULL AND (NEW.cutoff_score < 0 OR NEW.cutoff_score > 140) THEN
    RAISE EXCEPTION 'Cutoff score must be between 0 and 140';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_career_target_validate ON public.career_targets;
CREATE TRIGGER on_career_target_validate
  BEFORE INSERT OR UPDATE ON public.career_targets
  FOR EACH ROW EXECUTE PROCEDURE public.tr_career_target_validate();

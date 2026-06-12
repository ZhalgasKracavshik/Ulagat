-- ============================================================
-- PHASES 3-6 ENHANCEMENTS — run once in the Supabase SQL Editor.
-- Idempotent: IF NOT EXISTS / DROP POLICY IF EXISTS throughout,
-- safe to re-run.
--
--   Phase 3: Events board — tags, registration deadline, event
--            reminders, parliament event creation
--   Phase 4: Olympiad archive — year metadata, PDF attachments
--            (storage bucket), parliament uploads
--   Phase 5: Services → Bulletin Board — parliament posting
--   Phase 6: Leaderboard — achievement tiers + verification flow,
--            leaderboard privacy pseudonym
--
-- Requires: db/moderation_and_points.sql (award_reputation_points).
-- ============================================================


-- ============================================================
-- PHASE 3 — SCHOOL EVENTS BOARD (афиша)
-- ============================================================

-- 3.1 New columns
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_deadline DATE;
-- Set when the "event is tomorrow" reminder email went out — prevents
-- the daily cron (app/api/cron/event-reminders) from double-sending.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;

-- 3.2 Parliament (in addition to teacher/admin/moderator) can create events.
--     Newly created events keep the DEFAULT 'pending' status, so the existing
--     moderation flow (admin panel approve/reject) still applies.
DROP POLICY IF EXISTS "Teachers and Admins can create events." ON public.events;
DROP POLICY IF EXISTS "Staff and parliament can create events." ON public.events;
CREATE POLICY "Staff and parliament can create events."
  ON public.events FOR INSERT
  WITH CHECK (
    auth.uid() = organizer_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('teacher', 'admin', 'moderator', 'parliament')
    )
  );


-- ============================================================
-- PHASE 4 — OLYMPIAD ARCHIVE
-- ============================================================

-- 4.1 New columns
ALTER TABLE public.study_materials ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE public.study_materials ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 4.2 Storage bucket for olympiad PDFs — public read.
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-materials', 'study-materials', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Study Materials" ON storage.objects;
CREATE POLICY "Public Access Study Materials" ON storage.objects
  FOR SELECT USING (bucket_id = 'study-materials');

-- Upload policy is role-restricted — see "SECURITY HARDENING" / P1-2 at the
-- bottom of this file (uploads limited to admin/moderator/parliament).

-- 4.3 Parliament (in addition to admin/moderator, as currently configured)
--     can upload study materials. New rows keep the DEFAULT 'pending' status,
--     so the existing moderation flow still applies.
DROP POLICY IF EXISTS "Admins and Moderators can add materials." ON public.study_materials;
DROP POLICY IF EXISTS "Admins can add materials" ON public.study_materials;
DROP POLICY IF EXISTS "Staff and parliament can add materials" ON public.study_materials;
CREATE POLICY "Staff and parliament can add materials"
  ON public.study_materials FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'moderator', 'parliament')
    )
  );


-- ============================================================
-- PHASE 5 — SERVICES → BULLETIN BOARD
-- ============================================================

-- 5.1 Parliament (in addition to teacher/admin/moderator) can post listings.
--     Posting is free now — new rows go straight to 'pending' moderation.
DROP POLICY IF EXISTS "Teachers and Admins can create services." ON public.services;
DROP POLICY IF EXISTS "Staff, teachers and parliament can create services." ON public.services;
CREATE POLICY "Staff, teachers and parliament can create services."
  ON public.services FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('teacher', 'admin', 'moderator', 'parliament')
    )
  );


-- ============================================================
-- PHASE 6 — LEADERBOARD: ACHIEVEMENT TIERS + VERIFICATION
-- ============================================================

-- 6.1 New achievement columns.
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS tier TEXT
  CHECK (tier IN ('school', 'city', 'national')) DEFAULT 'school';
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- status: new achievements start 'pending'; achievements that existed BEFORE
-- this migration already earned their +10 on insert, so they are backfilled
-- to 'verified' (without awarding points — the verification trigger is
-- created later in this file and only fires on pending → verified updates).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.achievements ADD COLUMN status TEXT
      CHECK (status IN ('pending', 'verified', 'rejected'));
    UPDATE public.achievements SET status = 'verified' WHERE status IS NULL;
    ALTER TABLE public.achievements ALTER COLUMN status SET DEFAULT 'pending';
    ALTER TABLE public.achievements ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- 6.2 Privacy pseudonym toggle.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leaderboard_anonymous BOOLEAN NOT NULL DEFAULT false;

-- 6.3 No points on achievement INSERT anymore — points are awarded on
--     verification (tier-based). The old insert trigger is removed; the
--     function is kept as a no-op so older scripts that re-attach it
--     cannot re-introduce unverified points.
DROP TRIGGER IF EXISTS on_achievement_created ON public.achievements;
CREATE OR REPLACE FUNCTION public.tr_achievement_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Phase 6: achievements no longer earn points on insert.
  -- Tier-based points are awarded when status changes pending → verified
  -- (see tr_achievement_verification_points).
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6.4 Guard: only reviewers (parliament/moderator/admin) may set or change
--     the status, and never on their OWN achievements (no self-verification,
--     even for reviewers — that would mint points for yourself). Owners keep
--     their UPDATE/INSERT RLS policies for editing content.
--     auth.uid() IS NULL (SQL editor / service role) is allowed through.
CREATE OR REPLACE FUNCTION public.tr_achievement_guard_status()
RETURNS TRIGGER AS $$
DECLARE
  caller UUID := (SELECT auth.uid());
  is_reviewer BOOLEAN;
BEGIN
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = caller
      AND role IN ('parliament', 'moderator', 'admin')
  ) INTO is_reviewer;

  IF TG_OP = 'INSERT' THEN
    IF NOT is_reviewer THEN
      NEW.status := 'pending';
      NEW.verified_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT is_reviewer THEN
      RAISE EXCEPTION 'Only parliament, moderators and admins can change achievement status';
    END IF;
    -- P1-1: reviewers cannot review (verify/reject) their own achievements.
    IF NEW.user_id = caller THEN
      RAISE EXCEPTION 'Cannot review your own achievement';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_achievement_guard_status ON public.achievements;
CREATE TRIGGER on_achievement_guard_status
  BEFORE INSERT OR UPDATE ON public.achievements
  FOR EACH ROW EXECUTE PROCEDURE public.tr_achievement_guard_status();

-- 6.5 Verification trigger: when an achievement moves pending → verified,
--     award tier-based points (school 10 / city 50 / national 150).
--     Follows the tr_content_approval_points pattern in
--     db/moderation_and_points.sql.
CREATE OR REPLACE FUNCTION public.tr_achievement_verification_points()
RETURNS TRIGGER AS $$
DECLARE
  tier_points INTEGER;
BEGIN
  IF NEW.status = 'verified' AND OLD.status = 'pending' THEN
    -- P1-1: award at most once per achievement — a reviewer flipping the
    -- status back and forth (verified → pending → verified …) must not
    -- re-mint points on every cycle.
    IF EXISTS (
      SELECT 1 FROM public.reputation_ledger
      WHERE action_type = 'Achievement Verified'
        AND metadata->>'achievement_id' = NEW.id::text
    ) THEN
      RETURN NEW;
    END IF;

    tier_points := CASE NEW.tier
      WHEN 'school' THEN 10
      WHEN 'city' THEN 50
      WHEN 'national' THEN 150
      ELSE 10 -- defensive default for rows without a tier
    END;

    PERFORM public.award_reputation_points(
      NEW.user_id, 'Achievement Verified', tier_points,
      jsonb_build_object('achievement_id', NEW.id, 'title', NEW.title, 'tier', NEW.tier)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_achievement_verified ON public.achievements;
CREATE TRIGGER on_achievement_verified
  AFTER UPDATE ON public.achievements
  FOR EACH ROW EXECUTE PROCEDURE public.tr_achievement_verification_points();

-- 6.6 Reviewers (parliament/moderator/admin) can UPDATE achievements
--     (approve / reject submissions).
DROP POLICY IF EXISTS "Reviewers can verify achievements" ON public.achievements;
CREATE POLICY "Reviewers can verify achievements"
  ON public.achievements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('parliament', 'moderator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('parliament', 'moderator', 'admin')
    )
  );


-- ============================================================
-- SECURITY HARDENING (post-review of Phases 3-6)
-- Idempotent — safe to run on databases that already applied the
-- sections above. Note: the achievement guard (6.4) and the
-- verification points trigger (6.5) were also hardened in place
-- (no self-review; points awarded at most once per achievement),
-- so re-run this file in full.
-- ============================================================

-- ------------------------------------------------------------
-- P0-1: Anyone could mint arbitrary reputation points.
-- The legacy policy from db/master_schema.sql allowed ANY user to
-- INSERT rows into reputation_ledger directly. All legitimate writes
-- go through award_reputation_points(), which is SECURITY DEFINER and
-- bypasses RLS — so no replacement policy is needed.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert reputation" ON public.reputation_ledger;

-- ------------------------------------------------------------
-- P0-2: Creators could self-approve their own pending content.
-- The owner UPDATE policies on events/services ("Organizers can update
-- own events." / "Owners can update own services.") let owners update
-- ANY column — including status. Setting pending → active both skips
-- moderation and mints points (tr_content_approval_points).
--
-- Guard trigger (mirrors tr_achievement_guard_status): only
-- admin/moderator may change status; inserts by anyone else are forced
-- to 'pending'. auth.uid() IS NULL (SQL editor / service-role admin
-- client / SECURITY DEFINER paths) is allowed through.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tr_content_guard_status()
RETURNS TRIGGER AS $$
DECLARE
  caller UUID := (SELECT auth.uid());
  is_moderator BOOLEAN;
BEGIN
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = caller
      AND role IN ('admin', 'moderator')
  ) INTO is_moderator;

  IF TG_OP = 'INSERT' THEN
    IF NOT is_moderator THEN
      NEW.status := 'pending';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT is_moderator THEN
    RAISE EXCEPTION 'Only moderators can change status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_event_guard_status ON public.events;
CREATE TRIGGER on_event_guard_status
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE PROCEDURE public.tr_content_guard_status();

DROP TRIGGER IF EXISTS on_service_guard_status ON public.services;
CREATE TRIGGER on_service_guard_status
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE PROCEDURE public.tr_content_guard_status();

-- ------------------------------------------------------------
-- P1-2: study-materials bucket allowed ANY authenticated user to
-- upload. Only the roles that can create study_materials rows
-- (admin/moderator/parliament — see 4.3) may upload files.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Auth Upload Study Materials" ON storage.objects;
DROP POLICY IF EXISTS "Role Upload Study Materials" ON storage.objects;
CREATE POLICY "Role Upload Study Materials" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'study-materials'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'moderator', 'parliament')
    )
  );

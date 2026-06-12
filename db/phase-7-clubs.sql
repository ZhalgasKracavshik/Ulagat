-- ============================================================
-- PHASE 7 — SCHOOL CLUB MANAGEMENT + CLUB LEADERBOARD
-- Run once in the Supabase SQL Editor.
-- Idempotent: IF NOT EXISTS / DROP POLICY IF EXISTS throughout,
-- safe to re-run.
--
--   clubs              — club catalog (leader, category, points)
--   club_members       — membership + per-member attendance counter
--   club_meetings      — meeting log; AFTER INSERT trigger awards
--                        club points (5 + attendee count) and bumps
--                        each attendee's total_attendance
--   club_announcements — internal club announcements
--   club-logos bucket  — public-read logo storage
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('debates', 'it', 'chess', 'sport', 'science', 'art', 'music', 'volunteering', 'other')),
  logo_url TEXT,
  leader_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  total_attendance INTEGER NOT NULL DEFAULT 0,
  UNIQUE(club_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.club_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT,
  attendees UUID[] NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON public.club_members (club_id);
CREATE INDEX IF NOT EXISTS idx_club_meetings_club_date ON public.club_meetings (club_id, date DESC);


-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_announcements ENABLE ROW LEVEL SECURITY;

-- ---------- clubs ----------
-- SELECT: all authenticated users (archived clubs stay visible for history).
DROP POLICY IF EXISTS "Authenticated users can view clubs" ON public.clubs;
CREATE POLICY "Authenticated users can view clubs"
  ON public.clubs FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT: parliament creates clubs they lead themselves;
-- moderator/admin can create a club with any leader.
DROP POLICY IF EXISTS "Parliament and staff can create clubs" ON public.clubs;
CREATE POLICY "Parliament and staff can create clubs"
  ON public.clubs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
    OR (
      leader_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'parliament'
      )
    )
  );

-- UPDATE: club leader or moderator/admin. No DELETE — archive instead.
DROP POLICY IF EXISTS "Leader and staff can update clubs" ON public.clubs;
CREATE POLICY "Leader and staff can update clubs"
  ON public.clubs FOR UPDATE
  USING (
    leader_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    leader_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- ---------- club_members ----------
DROP POLICY IF EXISTS "Authenticated users can view club members" ON public.club_members;
CREATE POLICY "Authenticated users can view club members"
  ON public.club_members FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT: self-join for student/teacher/parliament (parents and moderators
-- don't join clubs), OR the club leader adds members.
DROP POLICY IF EXISTS "Members can join clubs" ON public.club_members;
CREATE POLICY "Members can join clubs"
  ON public.club_members FOR INSERT
  WITH CHECK (
    (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('student', 'teacher', 'parliament')
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.clubs
      WHERE id = club_id AND leader_id = auth.uid()
    )
  );

-- DELETE: self-leave or the club leader removes a member.
DROP POLICY IF EXISTS "Members can leave clubs" ON public.club_members;
CREATE POLICY "Members can leave clubs"
  ON public.club_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clubs
      WHERE id = club_id AND leader_id = auth.uid()
    )
  );

-- ---------- club_meetings ----------
DROP POLICY IF EXISTS "Authenticated users can view club meetings" ON public.club_meetings;
CREATE POLICY "Authenticated users can view club meetings"
  ON public.club_meetings FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leader and staff can record meetings" ON public.club_meetings;
CREATE POLICY "Leader and staff can record meetings"
  ON public.club_meetings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE id = club_id AND leader_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

DROP POLICY IF EXISTS "Leader and staff can update meetings" ON public.club_meetings;
CREATE POLICY "Leader and staff can update meetings"
  ON public.club_meetings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE id = club_id AND leader_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE id = club_id AND leader_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

DROP POLICY IF EXISTS "Leader and staff can delete meetings" ON public.club_meetings;
CREATE POLICY "Leader and staff can delete meetings"
  ON public.club_meetings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE id = club_id AND leader_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- ---------- club_announcements ----------
DROP POLICY IF EXISTS "Authenticated users can view club announcements" ON public.club_announcements;
CREATE POLICY "Authenticated users can view club announcements"
  ON public.club_announcements FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leader and staff can post club announcements" ON public.club_announcements;
CREATE POLICY "Leader and staff can post club announcements"
  ON public.club_announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE id = club_id AND leader_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

DROP POLICY IF EXISTS "Leader and staff can delete club announcements" ON public.club_announcements;
CREATE POLICY "Leader and staff can delete club announcements"
  ON public.club_announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE id = club_id AND leader_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );


-- ============================================================
-- 3. CLUB POINTS TRIGGER
-- Every recorded meeting awards the club 5 base points plus 1
-- point per attendee, and increments each attendee's
-- total_attendance counter.
-- ============================================================

CREATE OR REPLACE FUNCTION public.tr_club_meeting_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.clubs
  SET points = points + 5 + COALESCE(array_length(NEW.attendees, 1), 0)
  WHERE id = NEW.club_id;

  UPDATE public.club_members
  SET total_attendance = total_attendance + 1
  WHERE club_id = NEW.club_id
    AND user_id = ANY(NEW.attendees);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_club_meeting_recorded ON public.club_meetings;
CREATE TRIGGER on_club_meeting_recorded
  AFTER INSERT ON public.club_meetings
  FOR EACH ROW EXECUTE PROCEDURE public.tr_club_meeting_points();


-- ============================================================
-- 4. STORAGE — club logos (public read; uploads limited to the
-- roles that can create clubs: parliament/moderator/admin).
-- Same pattern as the study-materials bucket.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('club-logos', 'club-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Club Logos" ON storage.objects;
CREATE POLICY "Public Access Club Logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'club-logos');

DROP POLICY IF EXISTS "Role Upload Club Logos" ON storage.objects;
CREATE POLICY "Role Upload Club Logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'club-logos'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('parliament', 'moderator', 'admin')
    )
  );


-- ============================================================
-- SECURITY HARDENING (post-review of Phase 7)
-- Idempotent — safe to run on databases that already applied the
-- sections above.
-- ============================================================

-- ------------------------------------------------------------
-- P0-1: A club leader could mint points / unarchive their club by
-- updating clubs.points / clubs.status directly via PostgREST (the
-- "Leader and staff can update clubs" policy lets leaders update ANY
-- column). Guard trigger (mirrors tr_achievement_guard_status):
-- only admin/moderator may set or change points/status; non-staff
-- inserts are forced to points = 0, status = 'active'.
-- auth.uid() IS NULL (SQL editor / service role) passes through, and
-- so do nested trigger writes (the meeting points award/revoke
-- triggers update clubs.points at pg_trigger_depth() > 1).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tr_club_guard()
RETURNS TRIGGER AS $$
DECLARE
  caller UUID := (SELECT auth.uid());
  is_staff BOOLEAN;
BEGIN
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  -- Internal trigger writes (meeting points award / revoke).
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = caller
      AND role IN ('admin', 'moderator')
  ) INTO is_staff;

  IF TG_OP = 'INSERT' THEN
    IF NOT is_staff THEN
      NEW.points := 0;
      NEW.status := 'active';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT is_staff
     AND (NEW.points IS DISTINCT FROM OLD.points
          OR NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'Only moderators and admins can change club points or status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_club_guard ON public.clubs;
CREATE TRIGGER on_club_guard
  BEFORE INSERT OR UPDATE ON public.clubs
  FOR EACH ROW EXECUTE PROCEDURE public.tr_club_guard();

-- ------------------------------------------------------------
-- P0-2: A direct PostgREST INSERT into club_meetings could mint
-- unbounded points: future dates, duplicated attendee UUIDs (each
-- counted by array_length), thousands of fake attendees, or UUIDs of
-- users who are not club members. Validate every meeting row before
-- insert: no future dates (Almaty time), dedupe attendees, cap at
-- 500, and require every attendee to be a member of the club.
--
-- P0-3 (part): leaders could also retro-edit date/attendees of an
-- existing meeting (points were already awarded on insert, so the
-- record would no longer match the award). On UPDATE only staff may
-- change date or attendees — notes stay editable by the leader.
--
-- auth.uid() IS NULL (SQL editor / service role) passes through.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tr_club_meeting_validate()
RETURNS TRIGGER AS $$
DECLARE
  caller UUID := (SELECT auth.uid());
  is_staff BOOLEAN;
BEGIN
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = caller
        AND role IN ('admin', 'moderator')
    ) INTO is_staff;

    IF NOT is_staff
       AND (NEW.date IS DISTINCT FROM OLD.date
            OR NEW.attendees IS DISTINCT FROM OLD.attendees) THEN
      RAISE EXCEPTION 'Only moderators and admins can change a meeting''s date or attendees';
    END IF;
    RETURN NEW;
  END IF;

  -- INSERT validation.
  IF NEW.date > (now() AT TIME ZONE 'Asia/Almaty')::date THEN
    RAISE EXCEPTION 'Meeting date cannot be in the future';
  END IF;

  NEW.attendees := ARRAY(SELECT DISTINCT unnest(NEW.attendees));

  IF COALESCE(array_length(NEW.attendees, 1), 0) > 500 THEN
    RAISE EXCEPTION 'Too many attendees (max 500)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(NEW.attendees) AS a(uid)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = NEW.club_id AND user_id = a.uid
    )
  ) THEN
    RAISE EXCEPTION 'All attendees must be club members';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_club_meeting_validate ON public.club_meetings;
CREATE TRIGGER on_club_meeting_validate
  BEFORE INSERT OR UPDATE ON public.club_meetings
  FOR EACH ROW EXECUTE PROCEDURE public.tr_club_meeting_validate();

-- ------------------------------------------------------------
-- P0-3: An insert → delete → reinsert loop minted points on every
-- cycle (the award trigger fires on INSERT, but nothing took the
-- points back on DELETE), and a leader could record the same date
-- many times over.
--
-- 1. One meeting per club per date.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'club_meetings_club_date_unique'
      AND conrelid = 'public.club_meetings'::regclass
  ) THEN
    ALTER TABLE public.club_meetings
      ADD CONSTRAINT club_meetings_club_date_unique UNIQUE (club_id, date);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. Deleting a meeting takes back exactly what the insert awarded:
--    club points (5 + attendee count) and each attendee's
--    total_attendance, clamped at 0.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tr_club_meeting_points_revoke()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.clubs
  SET points = GREATEST(0, points - (5 + COALESCE(array_length(OLD.attendees, 1), 0)))
  WHERE id = OLD.club_id;

  UPDATE public.club_members
  SET total_attendance = GREATEST(0, total_attendance - 1)
  WHERE club_id = OLD.club_id
    AND user_id = ANY(OLD.attendees);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_club_meeting_deleted ON public.club_meetings;
CREATE TRIGGER on_club_meeting_deleted
  AFTER DELETE ON public.club_meetings
  FOR EACH ROW EXECUTE PROCEDURE public.tr_club_meeting_points_revoke();

-- ------------------------------------------------------------
-- P1-1 + P1-2: tightened club_members INSERT policy.
--   P1-1: self-join only into ACTIVE clubs (archived clubs were
--         joinable via direct insert — the server action checked,
--         the policy did not).
--   P1-2: the leader (or staff) may only add users whose role is
--         student/teacher/parliament — not parents, moderators or
--         admins.
-- The staff branch lets moderators/admins seed the leader as the
-- first member when they create a club for someone else.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Members can join clubs" ON public.club_members;
CREATE POLICY "Members can join clubs"
  ON public.club_members FOR INSERT
  WITH CHECK (
    (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('student', 'teacher', 'parliament')
      )
      AND EXISTS (
        SELECT 1 FROM public.clubs
        WHERE id = club_id AND status = 'active'
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.clubs
        WHERE id = club_id AND leader_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role IN ('student', 'teacher', 'parliament')
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('moderator', 'admin')
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role IN ('student', 'teacher', 'parliament')
      )
    )
  );

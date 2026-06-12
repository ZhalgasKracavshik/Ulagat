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

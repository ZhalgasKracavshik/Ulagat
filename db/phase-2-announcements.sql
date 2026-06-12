-- Phase 2 — Official Administration Announcements
-- Run after phase-1-schedule.sql.

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('medical', 'assembly', 'important', 'general')),
  target_grades INTEGER[],          -- NULL = all grades
  pinned BOOLEAN NOT NULL DEFAULT false,
  notified_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ            -- NULL = never expires
);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements (created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- All authenticated users read announcements
CREATE POLICY "authenticated_read_announcements" ON public.announcements
  FOR SELECT TO authenticated USING (true);

-- Only moderator/admin write; INSERT pins created_by
CREATE POLICY "staff_insert_announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin'))
    AND created_by = auth.uid()
  );
CREATE POLICY "staff_update_announcements" ON public.announcements FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin')));
CREATE POLICY "staff_delete_announcements" ON public.announcements FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin')));

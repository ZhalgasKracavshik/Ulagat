-- ============================================================
-- PHASE 1: Dynamic Schedule + Substitutions
-- Run this in Supabase SQL Editor
-- ============================================================

-- Static quarterly schedule
CREATE TABLE IF NOT EXISTS public.schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 11),
  class_letter TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 6), -- 1=Mon..6=Sat
  period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 8),
  subject TEXT NOT NULL,
  teacher_name TEXT,                -- denormalized teacher display name
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  room TEXT NOT NULL DEFAULT '',
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(grade, class_letter, day_of_week, period, valid_from)
);

-- Substitutions / cancellations / room changes
CREATE TABLE IF NOT EXISTS public.substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 11),
  class_letter TEXT NOT NULL,
  period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 8),
  type TEXT NOT NULL CHECK (type IN ('substitution', 'cancellation', 'room_change')),
  subject TEXT,
  substitute_teacher_name TEXT,
  room TEXT,
  note TEXT,
  notified_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, grade, class_letter, period)
);

-- Indexes for the common lookups (class week view, substitutions per day)
CREATE INDEX IF NOT EXISTS idx_schedule_grade_class ON public.schedule (grade, class_letter);
CREATE INDEX IF NOT EXISTS idx_substitutions_grade_class ON public.substitutions (grade, class_letter);
CREATE INDEX IF NOT EXISTS idx_substitutions_date ON public.substitutions (date);

-- RLS
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitutions ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read the schedule and substitutions
DROP POLICY IF EXISTS "authenticated_read_schedule" ON public.schedule;
CREATE POLICY "authenticated_read_schedule" ON public.schedule
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_substitutions" ON public.substitutions;
CREATE POLICY "authenticated_read_substitutions" ON public.substitutions
  FOR SELECT TO authenticated USING (true);

-- Only moderator/admin can write
DROP POLICY IF EXISTS "staff_write_schedule" ON public.schedule;
CREATE POLICY "staff_write_schedule" ON public.schedule FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin')));

DROP POLICY IF EXISTS "staff_write_substitutions" ON public.substitutions;
CREATE POLICY "staff_write_substitutions" ON public.substitutions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin')));

-- ============================================================
-- PHASE 0: Role System Foundation
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grade INTEGER,
  ADD COLUMN IF NOT EXISTS class_letter TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS external_skud_id TEXT;

-- Step 2: Update role CHECK constraint to include 'parent' and 'parliament'
-- The profiles table uses TEXT with CHECK constraint (not ENUM).
-- Drop existing constraint and recreate with extended values.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'teacher', 'admin', 'moderator', 'parent', 'parliament'));

-- Step 3: Parent invite tokens table
CREATE TABLE IF NOT EXISTS public.parent_invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 4: Family bonds table
CREATE TABLE IF NOT EXISTS public.family_bonds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Step 5: RLS on new tables
ALTER TABLE public.parent_invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_bonds ENABLE ROW LEVEL SECURITY;

-- parent_invite_tokens: student can INSERT their own, anyone can SELECT by token (for registration)
CREATE POLICY "student_can_create_invite" ON public.parent_invite_tokens
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "anyone_can_read_token" ON public.parent_invite_tokens
  FOR SELECT USING (true);

CREATE POLICY "student_can_delete_own_invite" ON public.parent_invite_tokens
  FOR DELETE USING (auth.uid() = student_id);

-- Allow server (service role) to update tokens (mark as used)
CREATE POLICY "service_role_update_token" ON public.parent_invite_tokens
  FOR UPDATE USING (true);

-- family_bonds: parent sees own bonds, student sees own bonds, admin/moderator see all
CREATE POLICY "user_sees_own_bonds" ON public.family_bonds
  FOR SELECT USING (
    auth.uid() = parent_id OR
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "system_creates_bonds" ON public.family_bonds
  FOR INSERT WITH CHECK (true); -- controlled by server-side API only

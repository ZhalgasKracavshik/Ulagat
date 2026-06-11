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

-- parent_invite_tokens: student can INSERT their own
CREATE POLICY "student_can_create_invite" ON public.parent_invite_tokens
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- P2-4: Restrict SELECT — only the owning student or service role can read tokens.
-- Anonymous registrants must use the service-role client (createAdminClient) to look up tokens.
DROP POLICY IF EXISTS "anyone_can_read_token" ON public.parent_invite_tokens;
CREATE POLICY "limited_token_select" ON public.parent_invite_tokens
  FOR SELECT USING (
    auth.uid() = student_id OR
    (auth.jwt() ->> 'role') = 'service_role'
  );

CREATE POLICY "student_can_delete_own_invite" ON public.parent_invite_tokens
  FOR DELETE USING (auth.uid() = student_id);

-- P0-4: Restrict UPDATE to service role only — prevents any authenticated user from marking arbitrary tokens as used.
DROP POLICY IF EXISTS "service_role_update_token" ON public.parent_invite_tokens;
CREATE POLICY "service_role_updates_token" ON public.parent_invite_tokens
  FOR UPDATE USING (
    (auth.jwt() ->> 'role') = 'service_role'
  );

-- family_bonds: parent sees own bonds, student sees own bonds, admin/moderator see all
CREATE POLICY "user_sees_own_bonds" ON public.family_bonds
  FOR SELECT USING (
    auth.uid() = parent_id OR
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- P0-3: Restrict family_bonds INSERT to service role only — prevents any authenticated user from forging bonds.
DROP POLICY IF EXISTS "system_creates_bonds" ON public.family_bonds;
CREATE POLICY "service_role_creates_bonds" ON public.family_bonds
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role'
  );

-- ============================================================
-- P0-1: Harden handle_new_user trigger — clamp role to allowed values.
-- Preserves all existing columns (id, full_name, avatar_url, role) and the
-- reputation_ledger genesis block insert from the master schema.
-- The CASE expression prevents any role outside the allowlist from being
-- stored in profiles, even if the auth metadata was tampered.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    CASE WHEN NEW.raw_user_meta_data->>'role' IN ('student', 'teacher', 'parent')
         THEN NEW.raw_user_meta_data->>'role'
         ELSE 'student'
    END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.reputation_ledger (user_id, action_type, points, previous_hash, current_hash, metadata)
  VALUES (
    NEW.id,
    'genesis',
    0,
    '00000000000000000000000000000000',
    md5(NEW.id::text || 'genesis' || NOW()::text),
    '{"message": "Welcome to Ulagat Smart Chain"}'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

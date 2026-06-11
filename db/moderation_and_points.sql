
-- ============================================================
-- MODERATION & POINT SYSTEM
-- Run this in Supabase SQL Editor to enable the new flow.
-- ============================================================

-- 1. MODERATION SCHEMA UPDATES

-- Services: Expand status and add rejection reason
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_status_check;
ALTER TABLE public.services ADD CONSTRAINT services_status_check 
  CHECK (status IN ('pending', 'active', 'archived', 'rejected'));
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Events: Add status and rejection reason
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'active', 'rejected', 'archived')) DEFAULT 'pending';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Study Materials: Add status and rejection reason
ALTER TABLE public.study_materials ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'active', 'rejected')) DEFAULT 'pending';
ALTER TABLE public.study_materials ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. REPUTATION (POINTS) SYSTEM AUTOMATION

-- Create / Update a unified point awarding function
CREATE OR REPLACE FUNCTION public.award_reputation_points(
  target_user_id UUID, 
  action_name TEXT, 
  point_value INTEGER,
  metadata_obj JSONB DEFAULT '{}'
) 
RETURNS TEXT AS $$
DECLARE
  prev_hash TEXT;
  new_hash TEXT;
  ts TIMESTAMPTZ := now();
BEGIN
  -- 1. Get the last current_hash for this user
  SELECT current_hash INTO prev_hash 
  FROM public.reputation_ledger 
  WHERE user_id = target_user_id 
  ORDER BY created_at DESC 
  LIMIT 1;

  IF prev_hash IS NULL THEN
    prev_hash := '00000000000000000000000000000000';
  END IF;

  -- 2. Generate new hash (simulated blockchain)
  new_hash := md5(target_user_id::text || action_name || point_value::text || prev_hash || ts::text);

  -- 3. Insert record
  INSERT INTO public.reputation_ledger (
    user_id, action_type, points, previous_hash, current_hash, created_at, metadata
  ) VALUES (
    target_user_id, action_name, point_value, prev_hash, new_hash, ts, metadata_obj
  );

  RETURN new_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGERS FOR AUTOMATIC POINTS

-- A. Point for Achievements (+10)
CREATE OR REPLACE FUNCTION public.tr_achievement_points() 
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.award_reputation_points(NEW.user_id, 'New Achievement', 10, jsonb_build_object('achievement_id', NEW.id, 'title', NEW.title));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_achievement_created ON public.achievements;
CREATE TRIGGER on_achievement_created
  AFTER INSERT ON public.achievements
  FOR EACH ROW EXECUTE PROCEDURE public.tr_achievement_points();

-- B. Point for Event Registration (+5)
CREATE OR REPLACE FUNCTION public.tr_registration_points() 
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.award_reputation_points(NEW.user_id, 'Event Registration', 5, jsonb_build_object('event_id', NEW.event_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_event_registered ON public.event_registrations;
CREATE TRIGGER on_event_registered
  AFTER INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE PROCEDURE public.tr_registration_points();

-- C. Point for Approved Content (Services / Events / Materials)
-- Logic: Assign points only when status changes from 'pending' to 'active'

CREATE OR REPLACE FUNCTION public.tr_content_approval_points() 
RETURNS TRIGGER AS $$
DECLARE
  points_to_award INTEGER := 0;
  user_to_reward UUID;
BEGIN
  IF (NEW.status = 'active' AND OLD.status = 'pending') THEN
    -- Identify points based on table
    IF TG_TABLE_NAME = 'services' THEN 
      points_to_award := 15;
      user_to_reward := NEW.owner_id;
    ELSIF TG_TABLE_NAME = 'events' THEN 
      points_to_award := 20;
      user_to_reward := NEW.organizer_id;
    ELSIF TG_TABLE_NAME = 'study_materials' THEN 
      points_to_award := 20;
      user_to_reward := NEW.uploaded_by;
    END IF;

    IF points_to_award > 0 AND user_to_reward IS NOT NULL THEN
      PERFORM public.award_reputation_points(user_to_reward, 'Content Approved', points_to_award, jsonb_build_object('type', TG_TABLE_NAME, 'id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply approval triggers
DROP TRIGGER IF EXISTS on_service_approved ON public.services;
CREATE TRIGGER on_service_approved AFTER UPDATE ON public.services FOR EACH ROW EXECUTE PROCEDURE public.tr_content_approval_points();

DROP TRIGGER IF EXISTS on_event_approved ON public.events;
CREATE TRIGGER on_event_approved AFTER UPDATE ON public.events FOR EACH ROW EXECUTE PROCEDURE public.tr_content_approval_points();

DROP TRIGGER IF EXISTS on_material_approved ON public.study_materials;
CREATE TRIGGER on_material_approved AFTER UPDATE ON public.study_materials FOR EACH ROW EXECUTE PROCEDURE public.tr_content_approval_points();

-- 4. UPDATE SIGNUP TRIGGER
-- Ensure handle_new_user uses the new function for consistency
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );
  
  -- Use the new function for 10 initial points (Genesis block handled by award_reputation_points if chain empty)
  PERFORM public.award_reputation_points(new.id, 'Registration Bonus', 10, '{"message": "Welcome"}'::jsonb);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

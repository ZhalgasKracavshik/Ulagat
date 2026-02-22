-- ============================================================
-- PROFILE UPDATE: Social Links + Achievement Images
-- Run this in Supabase SQL Editor AFTER phase3_community.sql
-- ============================================================

-- Add social link columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;

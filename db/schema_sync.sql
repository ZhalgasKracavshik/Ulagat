-- ============================================================
-- SCHEMA SYNC FOR ULAGAT
-- Run this in Supabase SQL Editor to fix "Failed to create..." errors.
-- This script adds missing columns and tables without data loss.
-- ============================================================

-- 1. PROFILES UPDATE
-- Add 'moderator' to role constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('student', 'teacher', 'admin', 'moderator'));

-- Add social_links if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]'::jsonb;

-- 2. SERVICES UPDATE
-- Add expires_at if missing
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days');

-- 3. EVENTS UPDATE
-- Add expires_at and max_students
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days');
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_students INTEGER;

-- 4. NEW TABLES (Phase 3 & 4)

-- ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  achievement_date DATE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- GROUPS (Communities)
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- GROUP MEMBERS
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(group_id, user_id)
);

-- GROUP MESSAGES
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- EVENT REGISTRATIONS
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(event_id, user_id)
);

-- FRIENDSHIPS
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(requester_id, addressee_id)
);

-- STUDY MATERIALS (Olympiad Prep)
CREATE TABLE IF NOT EXISTS public.study_materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  category TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- CONVERSATIONS & MESSAGES
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  participant2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(participant1_id, participant2_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- 5. POLICIES (Fixing Recursion)

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Achievements
DROP POLICY IF EXISTS "Achievements viewable by everyone" ON public.achievements;
CREATE POLICY "Achievements viewable by everyone" ON public.achievements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can add achievements" ON public.achievements;
CREATE POLICY "Users can add achievements" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Groups & Members (NON-RECURSIVE)
DROP POLICY IF EXISTS "Groups are viewable by members." ON public.groups;
CREATE POLICY "Groups are viewable by members." ON public.groups 
  FOR SELECT USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.group_members WHERE group_id = id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can view group members." ON public.group_members;
CREATE POLICY "Members can view group members." ON public.group_members 
  FOR SELECT USING (true); -- Simple fix to break recursion; privacy is handled at Group/Message level.

DROP POLICY IF EXISTS "Authenticated users can create groups." ON public.groups;
CREATE POLICY "Authenticated users can create groups." ON public.groups FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Group admins can add members." ON public.group_members;
CREATE POLICY "Group admins can add members." ON public.group_members 
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR -- Self join
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND creator_id = auth.uid()) -- Creator can add
  );

-- Group Messages
DROP POLICY IF EXISTS "Group members can view messages." ON public.group_messages;
CREATE POLICY "Group members can view messages." ON public.group_messages 
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Group members can send messages." ON public.group_messages;
CREATE POLICY "Group members can send messages." ON public.group_messages 
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));

-- Study Materials
DROP POLICY IF EXISTS "Everyone can view materials" ON public.study_materials;
CREATE POLICY "Everyone can view materials" ON public.study_materials FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can add materials" ON public.study_materials;
CREATE POLICY "Admins can add materials" ON public.study_materials FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')));

-- DONE

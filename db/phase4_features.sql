-- ============================================================
-- PHASE 4: Event Capacity, Dynamic Social Links, Group Chats
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Event Capacity: Add max_students column
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_students INTEGER;

-- 2. Event Registrations table
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view registrations."
  ON public.event_registrations FOR SELECT USING (true);

CREATE POLICY "Authenticated users can register for events."
  ON public.event_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unregister themselves."
  ON public.event_registrations FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Replace fixed social links with dynamic social_links jsonb column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]'::jsonb;

-- 4. Group Chats
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Policies for Groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups are viewable by members."
  ON public.groups FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = id AND user_id = auth.uid())
    OR creator_id = auth.uid()
  );

CREATE POLICY "Authenticated users can create groups."
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Group creators can update their groups."
  ON public.groups FOR UPDATE
  USING (auth.uid() = creator_id);

-- Policies for Group Members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group members."
  ON public.group_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "Group admins can add members."
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
  );

CREATE POLICY "Users can leave groups."
  ON public.group_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view messages."
  ON public.group_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Group members can send messages."
  ON public.group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
  );

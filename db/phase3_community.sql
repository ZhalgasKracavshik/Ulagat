-- ============================================================
-- PHASE 3: Community & Interaction Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. FIX DELETE POLICIES (Missing from original schema!)
-- ============================================================

-- Allow owners to delete their own services
CREATE POLICY "Owners can delete their own services."
  ON public.services FOR DELETE
  USING (auth.uid() = owner_id);

-- Allow admins/mods to delete any service
CREATE POLICY "Admins and Moderators can delete any service."
  ON public.services FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Allow admins/mods to update any service
CREATE POLICY "Admins and Moderators can update any service."
  ON public.services FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Allow organizers to delete their own events
CREATE POLICY "Organizers can delete their own events."
  ON public.events FOR DELETE
  USING (auth.uid() = organizer_id);

-- Allow admins/mods to delete any event
CREATE POLICY "Admins and Moderators can delete any event."
  ON public.events FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Allow admins/mods to update any event
CREATE POLICY "Admins and Moderators can update any event."
  ON public.events FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Allow admins to view ALL services (any status) in admin panel
CREATE POLICY "Admins can view all services."
  ON public.services FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- ============================================================
-- 2. CONVERSATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  participant2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(participant1_id, participant2_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations."
  ON public.conversations FOR SELECT
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can create conversations."
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Participants can update conversations."
  ON public.conversations FOR UPDATE
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- ============================================================
-- 3. MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations."
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations."
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

-- ============================================================
-- 4. FRIENDSHIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships."
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests."
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendship status."
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

CREATE POLICY "Users can remove friendships."
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ============================================================
-- 5. STUDY_MATERIALS TABLE (Olympiad Prep)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,  -- Link to resource or file
  category TEXT NOT NULL,  -- Math, Physics, Chemistry, etc.
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Study materials are viewable by everyone."
  ON public.study_materials FOR SELECT
  USING (true);

CREATE POLICY "Admins and Moderators can add materials."
  ON public.study_materials FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins and Moderators can update materials."
  ON public.study_materials FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins and Moderators can delete materials."
  ON public.study_materials FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- ============================================================
-- 6. ACHIEVEMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  achievement_date DATE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are viewable by everyone."
  ON public.achievements FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own achievements."
  ON public.achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements."
  ON public.achievements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own achievements."
  ON public.achievements FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can also delete any achievement
CREATE POLICY "Admins can delete any achievement."
  ON public.achievements FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- ============================================================
-- DONE! All Phase 3 tables created.
-- ============================================================

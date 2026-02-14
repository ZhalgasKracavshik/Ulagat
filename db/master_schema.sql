
-- MASTER SCHEMA FOR ULAGAT
-- Run this in Supabase SQL Editor to REBUILD everything.
-- WARN: This drops all existing data.

-- 1. DROP EVERYTHING
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.reputation_ledger CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. PROFILES
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT CHECK (role IN ('student', 'teacher', 'admin')) DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 4. SERVICES
CREATE TABLE public.services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  category TEXT,
  image_url TEXT,
  status TEXT CHECK (status IN ('pending', 'active', 'archived')) DEFAULT 'pending', 
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active services are viewable by everyone." ON public.services FOR SELECT USING (status = 'active');
CREATE POLICY "Owners can view their own services." ON public.services FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Auth users can create services." ON public.services FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own services." ON public.services FOR UPDATE USING (auth.uid() = owner_id);

-- 5. EVENTS
CREATE TABLE public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organizer_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are viewable by everyone." ON public.events FOR SELECT USING (true);
CREATE POLICY "Auth users can create events." ON public.events FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update own events." ON public.events FOR UPDATE USING (auth.uid() = organizer_id);

-- 6. REPUTATION LEDGER
CREATE TABLE public.reputation_ledger (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  action_type TEXT NOT NULL, 
  points INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.reputation_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reputation is public" ON public.reputation_ledger FOR SELECT USING (true);
CREATE POLICY "Users can insert reputation" ON public.reputation_ledger FOR INSERT WITH CHECK (true);

-- 7. REVIEWS
CREATE TABLE public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- 8. CONVERSATIONS (Chat)
CREATE TABLE public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant1_id UUID REFERENCES public.profiles(id) NOT NULL,
  participant2_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(participant1_id, participant2_id)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own conversations" ON public.conversations FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);
CREATE POLICY "Users can update conversations" ON public.conversations FOR UPDATE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- 9. MESSAGES (Chat)
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (participant1_id = auth.uid() OR participant2_id = auth.uid())));
CREATE POLICY "Users can send messages to their conversations" ON public.messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (participant1_id = auth.uid() OR participant2_id = auth.uid())));

-- 10. REALTIME
alter publication supabase_realtime add table public.messages;

-- 11. SIGNUP TRIGGER
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
  
  INSERT INTO public.reputation_ledger (user_id, action_type, points, previous_hash, current_hash, metadata)
  VALUES (
    new.id, 'genesis', 0, '00000000000000000000000000000000', md5(new.id || 'genesis' || NOW()), '{"message": "Welcome"}'
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

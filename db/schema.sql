-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Public profile info)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('student', 'teacher', 'admin')) DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. SERVICES TABLE (Tutoring, Lessons, etc.)
CREATE TABLE public.services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  category TEXT,
  image_url TEXT,
  -- 'pending' = created but fee not paid, 'active' = fee paid/approved, 'archived'
  status TEXT CHECK (status IN ('pending', 'active', 'archived')) DEFAULT 'pending', 
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- RLS for Services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active services are viewable by everyone." 
  ON public.services FOR SELECT USING (status = 'active');

CREATE POLICY "Owners can view their own services regardless of status." 
  ON public.services FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Teachers and Admins can create services." 
  ON public.services FOR INSERT 
  WITH CHECK (
    auth.uid() = owner_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

CREATE POLICY "Owners can update their own services." 
  ON public.services FOR UPDATE USING (auth.uid() = owner_id);

-- 3. EVENTS TABLE (Competitions, Olympics)
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

-- RLS for Events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone." 
  ON public.events FOR SELECT USING (true);

CREATE POLICY "Teachers and Admins can create events." 
  ON public.events FOR INSERT 
  WITH CHECK (
    auth.uid() = organizer_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

CREATE POLICY "Organizers can update their own events." 
  ON public.events FOR UPDATE USING (auth.uid() = organizer_id);

-- 4. REPUTATION LEDGER (Smart Reputation / Blockchain)
-- This table mimics a blockchain. Each row must contain the hash of the previous row.
CREATE TABLE public.reputation_ledger (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  action_type TEXT NOT NULL, -- 'service_completed', 'event_win', 'verification'
  points INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}', -- Details about the achievement
  previous_hash TEXT NOT NULL, -- Hash of the previous block for this user
  current_hash TEXT NOT NULL,  -- Hash of (previous_hash + user_id + action + points + timestamp)
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- RLS for Reputation
ALTER TABLE public.reputation_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reputation is public" ON public.reputation_ledger FOR SELECT USING (true);
-- Only System (via Service Role) should INSERT. But for now, allow authenticated users if we use client-side hashing (unsafe) or just read-only for users.
-- Ideally, we use Database Webhooks or Edge Functions to insert. 
-- For MVP, we will allow Auth users to INSERT but we'll validate hash on Backend.

-- 5. REVIEWS
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


-- 6. FUNCTION TO HANDLE NEW USER SIGNUP
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
  -- Initialize Genesis Block for Reputation
  INSERT INTO public.reputation_ledger (user_id, action_type, points, previous_hash, current_hash, metadata)
  VALUES (
    new.id, 
    'genesis', 
    0, 
    '00000000000000000000000000000000', 
    md5(new.id || 'genesis' || NOW()), 
    '{"message": "Welcome to Ulagat Smart Chain"}'
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER FOR NEW USER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. STORAGE BUCKETS
-- insert into storage.buckets (id, name, public) values ('service-images', 'service-images', true);
-- insert into storage.buckets (id, name, public) values ('event-images', 'event-images', true);
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

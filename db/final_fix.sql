
-- 1. Fix Profiles Table (Add missing 'bio' column)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE public.profiles ADD COLUMN bio TEXT;
    END IF;
END $$;

-- 2. Make sure Reviews table exists (Safe check)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. Enable RLS on Reviews if it was just created
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 4. Safe Policy Creation (Checks if exists first to avoid error)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Reviews are public') THEN
        CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Users can create reviews') THEN
        CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
    END IF;
END $$;

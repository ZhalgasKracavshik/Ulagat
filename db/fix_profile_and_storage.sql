
-- 1. Add bio column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE public.profiles ADD COLUMN bio TEXT;
    END IF;
END $$;

-- 2. Ensure storage buckets exist for Services and Events
INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-images', 'service-images', true),
       ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policies for Service Images
CREATE POLICY "Service Images Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'service-images');

CREATE POLICY "Service Images Upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'service-images' AND
    auth.role() = 'authenticated'
  );

-- 4. Policies for Event Images
CREATE POLICY "Event Images Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-images');

CREATE POLICY "Event Images Upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-images' AND
    auth.role() = 'authenticated'
  );

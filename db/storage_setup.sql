
-- Enable Storage extension if not enabled (usually enabled by default in Supabase)
-- CREATE EXTENSION IF NOT EXISTS "storage";

-- Create a bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access
CREATE POLICY "Avatar Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Policy: Allow authenticated users to upload/update their own avatar
-- We'll verify owner based on folder name or metadata, but for simplicity:
-- Allow any authenticated user to upload (we'll rely on generating unique names in client)
CREATE POLICY "Avatar Upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Avatar Update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
  );

-- Allow users to delete their own avatar (optional, but good practice)
-- CREATE POLICY "Avatar Delete" ... 


-- ============================================================
-- FIX STORAGE BUCKETS
-- Run this in Supabase SQL Editor to enable image uploads!
-- ============================================================

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('achievements', 'achievements', true),
  ('service-images', 'service-images', true),
  ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable Public Access (SELECT)
CREATE POLICY "Public Access Achievements" ON storage.objects FOR SELECT USING (bucket_id = 'achievements');
CREATE POLICY "Public Access Services" ON storage.objects FOR SELECT USING (bucket_id = 'service-images');
CREATE POLICY "Public Access Events" ON storage.objects FOR SELECT USING (bucket_id = 'event-images');

-- 3. Enable Authenticated Uploads (INSERT)
CREATE POLICY "Auth Upload Achievements" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'achievements' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Upload Services" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'service-images' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Upload Events" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-images' AND auth.role() = 'authenticated');

-- 4. Enable Update/Delete (Optional but recommended for owners)
CREATE POLICY "Auth Update Achievements" ON storage.objects FOR UPDATE USING (bucket_id = 'achievements' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update Services" ON storage.objects FOR UPDATE USING (bucket_id = 'service-images' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update Events" ON storage.objects FOR UPDATE USING (bucket_id = 'event-images' AND auth.role() = 'authenticated');

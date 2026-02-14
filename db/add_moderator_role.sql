
-- 1. Update Profiles Check Constraint to include 'moderator'
-- Postgres doesn't easily allow altering check constraints, so we drop and re-add.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('student', 'teacher', 'admin', 'moderator'));

-- 2. Update Handle New User Trigger function (to be safe)
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

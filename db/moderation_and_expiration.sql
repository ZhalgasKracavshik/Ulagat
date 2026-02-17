-- 1. ADD Expiration Column
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days');

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days');

-- 2. UPDATE Services RLS (Allow Admin/Mod Delete/Update)
DROP POLICY IF EXISTS "Active services are viewable by everyone." ON public.services;
CREATE POLICY "Active services are viewable by everyone." 
  ON public.services FOR SELECT USING (status = 'active' AND (expires_at IS NULL OR expires_at > now()));

-- Add DELETE Policy
CREATE POLICY "Admins and Moderators can delete any service." 
  ON public.services FOR DELETE 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    OR auth.uid() = owner_id
  );

-- Add UPDATE Policy (Admins/Mods)
CREATE POLICY "Admins and Moderators can update any service." 
  ON public.services FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    OR auth.uid() = owner_id
  );


-- 3. UPDATE Events RLS
DROP POLICY IF EXISTS "Events are viewable by everyone." ON public.events;
CREATE POLICY "Events are viewable by everyone." 
  ON public.events FOR SELECT USING (expires_at IS NULL OR expires_at > now());

-- Add DELETE Policy for Events
CREATE POLICY "Admins and Moderators can delete any event." 
  ON public.events FOR DELETE 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    OR auth.uid() = organizer_id
  );

-- Add UPDATE Policy for Events
CREATE POLICY "Admins and Moderators can update any event." 
  ON public.events FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    OR auth.uid() = organizer_id
  );

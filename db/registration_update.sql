-- Add unique constraint to full_name
ALTER TABLE public.profiles ADD CONSTRAINT unique_full_name UNIQUE (full_name);

-- Ensure full_name is not empty
ALTER TABLE public.profiles ADD CONSTRAINT full_name_length CHECK (char_length(full_name) >= 3);

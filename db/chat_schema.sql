
-- 1. CONVERSATIONS (1-on-1 chats)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant1_id UUID REFERENCES public.profiles(id) NOT NULL,
  participant2_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(participant1_id, participant2_id)
);

-- RLS for Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations" 
ON public.conversations FOR SELECT 
USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- 2. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- RLS for Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations" 
ON public.messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages to their conversations" 
ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
  )
);

-- 3. REALTIME
-- Enable realtime for messages so the UI updates instantly
alter publication supabase_realtime add table public.messages;

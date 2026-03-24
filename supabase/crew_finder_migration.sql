-- ============================================================
-- Handsup — Crew Finder Migration
-- Solo festival-goer discovery and mutual opt-in connections
-- ============================================================

-- Crew listings: users saying "I'm going solo to this event"
CREATE TABLE IF NOT EXISTS public.crew_listings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  bio text, -- "Looking for people who are into techno, down to grab a beer before"
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(user_id, event_id)
);

ALTER TABLE public.crew_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own listings"
ON public.crew_listings FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view active listings"
ON public.crew_listings FOR SELECT
USING (active = true);

-- Crew requests: mutual opt-in connections
CREATE TABLE IF NOT EXISTS public.crew_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(from_user_id, to_user_id, event_id)
);

ALTER TABLE public.crew_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own requests"
ON public.crew_requests FOR ALL
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

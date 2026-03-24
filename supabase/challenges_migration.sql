-- Weekly challenge progress tracking
CREATE TABLE IF NOT EXISTS public.challenge_progress (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_key text NOT NULL, -- e.g. 'upload_3_2026-W12'
  week_key text NOT NULL, -- e.g. '2026-W12' (ISO week)
  progress integer DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(user_id, challenge_key, week_key)
);

ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own challenge progress"
ON public.challenge_progress FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view challenge progress"
ON public.challenge_progress FOR SELECT
USING (true);

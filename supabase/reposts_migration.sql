CREATE TABLE IF NOT EXISTS public.reposts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  clip_id uuid REFERENCES public.clips(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(user_id, clip_id)
);

ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reposts"
ON public.reposts FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can read reposts"
ON public.reposts FOR SELECT
USING (true);

-- Add repost_count to clips for denormalised performance
ALTER TABLE public.clips
ADD COLUMN IF NOT EXISTS repost_count integer DEFAULT 0;

-- RPC function to increment repost count safely
CREATE OR REPLACE FUNCTION increment_repost_count(clip_id uuid)
RETURNS void AS $$
  UPDATE public.clips SET repost_count = repost_count + 1 WHERE id = clip_id;
$$ LANGUAGE sql SECURITY DEFINER;

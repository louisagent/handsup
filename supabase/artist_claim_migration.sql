CREATE TABLE IF NOT EXISTS public.artist_claims (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  artist_name text NOT NULL,
  bio text,
  instagram_url text,
  spotify_url text,
  soundcloud_url text,
  website_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(artist_name) -- only one approved claim per artist name
);

ALTER TABLE public.artist_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own claims"
ON public.artist_claims FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view approved claims"
ON public.artist_claims FOR SELECT
USING (status = 'approved' OR user_id = auth.uid());

CREATE POLICY "Moderators can manage all claims"
ON public.artist_claims FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin'))
);

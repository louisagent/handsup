-- ============================================================
-- Track ID Schema
-- Community-driven track identification for clips
-- ============================================================

-- Add track_id fields to clips table
ALTER TABLE public.clips 
  ADD COLUMN IF NOT EXISTS track_name text,
  ADD COLUMN IF NOT EXISTS track_artist text,
  ADD COLUMN IF NOT EXISTS track_streaming_url text, -- Spotify/Apple Music/SoundCloud URL
  ADD COLUMN IF NOT EXISTS track_id_status text default 'unknown' 
    CHECK (track_id_status IN ('unknown', 'suggested', 'community_picked', 'confirmed'));

-- Track ID suggestions from community
CREATE TABLE IF NOT EXISTS public.track_id_suggestions (
  id uuid default uuid_generate_v4() primary key,
  clip_id uuid references public.clips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  track_name text not null,
  track_artist text not null,
  remix_note text, -- e.g. "VIP Edit", "Extended Mix", "ID Remix"
  streaming_url text,
  votes integer default 0,
  created_at timestamp with time zone default timezone('utc', now())
);

ALTER TABLE public.track_id_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view suggestions" ON public.track_id_suggestions FOR SELECT USING (true);
CREATE POLICY "Auth users can suggest" ON public.track_id_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own suggestions" ON public.track_id_suggestions FOR UPDATE USING (auth.uid() = user_id);

-- Track ID votes
CREATE TABLE IF NOT EXISTS public.track_id_votes (
  id uuid default uuid_generate_v4() primary key,
  suggestion_id uuid references public.track_id_suggestions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc', now()),
  UNIQUE(suggestion_id, user_id)
);

ALTER TABLE public.track_id_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view votes" ON public.track_id_votes FOR SELECT USING (true);
CREATE POLICY "Auth users can vote" ON public.track_id_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove vote" ON public.track_id_votes FOR DELETE USING (auth.uid() = user_id);

-- ── clip_likes table ─────────────────────────────────────────────────────────
-- Persists per-user clip likes. clip_id is text to match the clips.id type
-- used throughout the app. user_id references auth.users so likes are
-- automatically cleaned up when an account is deleted.
--
-- Run once against your Supabase project via the SQL editor or CLI.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clip_likes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  clip_id    text        NOT NULL,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (clip_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.clip_likes ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read likes — needed for public like counts
CREATE POLICY "Anyone can view likes"
  ON public.clip_likes
  FOR SELECT
  USING (true);

-- Only authenticated users can insert a like for themselves
CREATE POLICY "Users can like"
  ON public.clip_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "Users can unlike"
  ON public.clip_likes
  FOR DELETE
  USING (auth.uid() = user_id);

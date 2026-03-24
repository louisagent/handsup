-- ============================================================
-- Handsup — Reposts Migration
-- Adds reposts table and repost_count column to clips
-- ============================================================

-- Add repost_count to clips table
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS repost_count INTEGER DEFAULT 0;

-- ============================================================
-- REPOSTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reposts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  clip_id uuid REFERENCES public.clips(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(user_id, clip_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS reposts_user_idx ON public.reposts(user_id);
CREATE INDEX IF NOT EXISTS reposts_clip_idx ON public.reposts(clip_id);
CREATE INDEX IF NOT EXISTS reposts_created_idx ON public.reposts(created_at DESC);

-- ============================================================
-- TRIGGER — keep repost_count in sync
-- ============================================================
CREATE OR REPLACE FUNCTION update_repost_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.clips
    SET repost_count = repost_count + 1
    WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.clips
    SET repost_count = GREATEST(0, repost_count - 1)
    WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_repost_change ON public.reposts;
CREATE TRIGGER on_repost_change
  AFTER INSERT OR DELETE ON public.reposts
  FOR EACH ROW EXECUTE PROCEDURE update_repost_count();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

-- Anyone can see reposts (needed for feed queries and repost counts)
CREATE POLICY "Reposts are viewable by everyone"
  ON public.reposts FOR SELECT
  USING (true);

-- Users can insert their own reposts
CREATE POLICY "Users can insert own reposts"
  ON public.reposts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reposts
CREATE POLICY "Users can delete own reposts"
  ON public.reposts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Handsup — Weekly Challenges Migration
-- Rotating weekly goals with badge rewards on completion
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.goal_type_enum AS ENUM ('upload', 'like', 'comment', 'download');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- CHALLENGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  goal_type     public.goal_type_enum NOT NULL,
  goal_count    INTEGER NOT NULL CHECK (goal_count > 0),
  badge_reward  TEXT NOT NULL,
  week_start    DATE NOT NULL,
  week_end      DATE NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS challenges_week_idx ON public.challenges(week_start, week_end);
CREATE INDEX IF NOT EXISTS challenges_goal_type_idx ON public.challenges(goal_type);

-- ============================================================
-- USER CHALLENGE PROGRESS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_id  uuid REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  current_count INTEGER NOT NULL DEFAULT 0,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  badge_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(user_id, challenge_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS ucp_user_idx      ON public.user_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS ucp_challenge_idx ON public.user_challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS ucp_completed_idx ON public.user_challenge_progress(completed);

-- ============================================================
-- ROW LEVEL SECURITY — challenges
-- ============================================================
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Everyone can read challenges
CREATE POLICY "Challenges are viewable by everyone"
  ON public.challenges FOR SELECT
  USING (true);

-- Only service role can insert/update/delete challenges (admin only)
CREATE POLICY "Only service role can manage challenges"
  ON public.challenges FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- ROW LEVEL SECURITY — user_challenge_progress
-- ============================================================
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own progress
CREATE POLICY "Users can view own challenge progress"
  ON public.user_challenge_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own challenge progress"
  ON public.user_challenge_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own challenge progress"
  ON public.user_challenge_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SEED DATA — 3 sample challenges for the current week
-- ============================================================
-- Week: Mon 24 Mar 2026 → Sun 29 Mar 2026
INSERT INTO public.challenges (title, description, goal_type, goal_count, badge_reward, week_start, week_end)
VALUES
  (
    'Upload 3 Clips',
    'Share the vibe — upload 3 clips from any festival this week.',
    'upload',
    3,
    '🎬',
    '2026-03-23',
    '2026-03-29'
  ),
  (
    'Like 10 Clips',
    'Spread the love — like 10 clips from the community.',
    'like',
    10,
    '❤️',
    '2026-03-23',
    '2026-03-29'
  ),
  (
    'Download 5 Clips',
    'Save the moments — download 5 clips you love.',
    'download',
    5,
    '⬇️',
    '2026-03-23',
    '2026-03-29'
  )
ON CONFLICT DO NOTHING;

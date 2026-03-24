-- ============================================================
-- Handsup — XP & Badges Migration
-- ============================================================

-- XP tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;

-- Badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_key text NOT NULL, -- e.g. 'first_upload', 'festival_regular', 'century_club'
  earned_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(user_id, badge_key)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
ON public.user_badges FOR SELECT USING (true);

CREATE POLICY "System can award badges"
ON public.user_badges FOR INSERT
WITH CHECK (true);

-- RPC to add XP and update level
CREATE OR REPLACE FUNCTION add_xp(user_id uuid, amount integer)
RETURNS void AS $$
DECLARE
  new_xp integer;
  new_level integer;
BEGIN
  UPDATE public.profiles
  SET xp = xp + amount
  WHERE id = user_id
  RETURNING xp INTO new_xp;

  -- Level thresholds: 1=0, 2=100, 3=300, 4=600, 5=1000, 6=1500, 7=2500, 8=4000, 9=6000, 10=10000
  new_level := CASE
    WHEN new_xp >= 10000 THEN 10
    WHEN new_xp >= 6000 THEN 9
    WHEN new_xp >= 4000 THEN 8
    WHEN new_xp >= 2500 THEN 7
    WHEN new_xp >= 1500 THEN 6
    WHEN new_xp >= 1000 THEN 5
    WHEN new_xp >= 600 THEN 4
    WHEN new_xp >= 300 THEN 3
    WHEN new_xp >= 100 THEN 2
    ELSE 1
  END;

  UPDATE public.profiles SET level = new_level WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

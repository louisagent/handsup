-- ============================================================
-- Handsup — Daily Streaks Migration
-- Add streak tracking to profiles + server-side RPC
-- ============================================================

-- Add streak fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_streak  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date date;

-- RPC: call when a user does any action today
-- Returns the new (or unchanged) streak count
CREATE OR REPLACE FUNCTION update_streak(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_last_date   date;
  v_today       date := current_date;
  v_current     integer;
  v_new_streak  integer;
BEGIN
  SELECT last_active_date, current_streak
    INTO v_last_date, v_current
    FROM public.profiles
   WHERE id = p_user_id;

  -- Already active today — return current streak unchanged
  IF v_last_date = v_today THEN
    RETURN v_current;
  END IF;

  -- Active yesterday — extend streak
  IF v_last_date = v_today - 1 THEN
    v_new_streak := COALESCE(v_current, 0) + 1;
  ELSE
    -- Gap of 2+ days (or no previous activity) — reset to 1
    v_new_streak := 1;
  END IF;

  UPDATE public.profiles
     SET current_streak   = v_new_streak,
         longest_streak   = GREATEST(COALESCE(longest_streak, 0), v_new_streak),
         last_active_date = v_today
   WHERE id = p_user_id;

  RETURN v_new_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

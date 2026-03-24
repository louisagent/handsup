// ============================================================
// Handsup — Streaks Service
// Daily engagement streak tracking
// ============================================================

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_LAST_CALLED_KEY = 'handsup_streak_last_called';

/**
 * Update streak — call once per app session.
 * Rate-limited client-side to once per calendar day to avoid hammering Supabase.
 * Returns the current streak count.
 */
export async function touchStreak(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const today = new Date().toDateString();
  const lastCalled = await AsyncStorage.getItem(STREAK_LAST_CALLED_KEY);

  if (lastCalled === today) {
    // Already called today — just read current streak from profile
    const { data } = await supabase
      .from('profiles')
      .select('current_streak')
      .eq('id', user.id)
      .single();
    return data?.current_streak ?? 0;
  }

  // Call the DB function — it handles all streak logic server-side
  const { data, error } = await supabase.rpc('update_streak', { p_user_id: user.id });

  if (!error) {
    await AsyncStorage.setItem(STREAK_LAST_CALLED_KEY, today);

    // Award XP for showing up today
    const { awardXP } = await import('./xp');
    awardXP('daily_login').catch(() => {});

    return (data as number) ?? 0;
  }

  return 0;
}

/**
 * Get streak info for any user (for display on profile).
 */
export async function getStreakInfo(userId: string): Promise<{ current: number; longest: number }> {
  const { data } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak')
    .eq('id', userId)
    .single();

  return {
    current: data?.current_streak ?? 0,
    longest: data?.longest_streak ?? 0,
  };
}

// ============================================================
// Handsup — Weekly Challenges Service
// Rotating weekly goals with badge rewards on completion
// ============================================================

import { supabase } from './supabase';

export type GoalType = 'upload' | 'like' | 'comment' | 'download';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  goal_type: GoalType;
  goal_count: number;
  badge_reward: string;
  week_start: string;
  week_end: string;
  created_at: string;
}

export interface UserChallengeProgress {
  id: string;
  user_id: string;
  challenge_id: string;
  current_count: number;
  completed: boolean;
  badge_claimed: boolean;
  completed_at: string | null;
  created_at: string;
  // Joined challenge data
  challenge?: Challenge;
}

/**
 * Fetch this week's active challenges.
 * "Active" = today falls within week_start..week_end (inclusive).
 */
export async function getActiveChallenges(): Promise<Challenge[]> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .lte('week_start', today)
    .gte('week_end', today)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Challenge[];
}

/**
 * Fetch a user's progress rows for all active challenges.
 * Returns an array with challenge data joined in.
 */
export async function getUserProgress(userId: string): Promise<UserChallengeProgress[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('user_challenge_progress')
    .select(`
      *,
      challenge:challenges (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Filter to only include active challenges
  const rows = (data ?? []) as UserChallengeProgress[];
  return rows.filter((row) => {
    const ch = row.challenge;
    if (!ch) return false;
    return ch.week_start <= today && ch.week_end >= today;
  });
}

/**
 * Increment progress for a given goalType action.
 * Called whenever the user performs an upload / like / comment / download.
 * Auto-marks completed if the goal is reached.
 *
 * Uses an upsert so calling this before the row exists creates it.
 */
export async function incrementProgress(userId: string, goalType: GoalType): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // 1. Find active challenges matching this goal type
  const { data: challenges, error: chalErr } = await supabase
    .from('challenges')
    .select('*')
    .eq('goal_type', goalType)
    .lte('week_start', today)
    .gte('week_end', today);

  if (chalErr || !challenges?.length) return;

  for (const challenge of challenges as Challenge[]) {
    // 2. Fetch or create the progress row
    const { data: existing } = await supabase
      .from('user_challenge_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('challenge_id', challenge.id)
      .maybeSingle();

    if (existing?.completed) continue; // Already done — skip

    const currentCount = (existing?.current_count ?? 0) + 1;
    const completed = currentCount >= challenge.goal_count;
    const completedAt = completed ? new Date().toISOString() : null;

    if (existing) {
      // Update existing row
      await supabase
        .from('user_challenge_progress')
        .update({
          current_count: currentCount,
          completed,
          ...(completedAt ? { completed_at: completedAt } : {}),
        })
        .eq('id', existing.id);
    } else {
      // Create new progress row
      await supabase
        .from('user_challenge_progress')
        .insert({
          user_id: userId,
          challenge_id: challenge.id,
          current_count: currentCount,
          completed,
          badge_claimed: false,
          ...(completedAt ? { completed_at: completedAt } : {}),
        });
    }
  }
}

/**
 * Mark a badge as claimed for a completed challenge.
 * No-ops gracefully if not completed or already claimed.
 */
export async function claimBadge(userId: string, challengeId: string): Promise<boolean> {
  // Verify it's completed before allowing claim
  const { data: row } = await supabase
    .from('user_challenge_progress')
    .select('id, completed, badge_claimed')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .maybeSingle();

  if (!row || !row.completed || row.badge_claimed) return false;

  const { error } = await supabase
    .from('user_challenge_progress')
    .update({ badge_claimed: true })
    .eq('id', row.id);

  return !error;
}

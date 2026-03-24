// ============================================================
// Handsup — Weekly Challenges Service
// ============================================================

import { supabase } from './supabase';

// Challenge definitions — rotate weekly based on ISO week number
export interface Challenge {
  key: string;
  title: string;
  description: string;
  emoji: string;
  target: number;
  xpReward: number;
  badgeKey?: string;
  type: 'upload' | 'like' | 'download' | 'comment' | 'follow' | 'repost';
}

// 3 challenges always active per week — selected by week number mod
export const ALL_CHALLENGES: Challenge[] = [
  { key: 'upload_3', title: 'Triple Threat', description: 'Upload 3 clips this week', emoji: '🎬', target: 3, xpReward: 150, type: 'upload' },
  { key: 'upload_1', title: 'Weekly Uploader', description: 'Upload 1 clip this week', emoji: '📹', target: 1, xpReward: 60, type: 'upload' },
  { key: 'like_10', title: 'Show Some Love', description: 'Like 10 clips this week', emoji: '❤️', target: 10, xpReward: 40, type: 'like' },
  { key: 'like_25', title: 'Love Machine', description: 'Like 25 clips this week', emoji: '💜', target: 25, xpReward: 80, type: 'like' },
  { key: 'comment_5', title: 'Conversation Starter', description: 'Leave 5 comments this week', emoji: '💬', target: 5, xpReward: 60, type: 'comment' },
  { key: 'download_3', title: 'Collector', description: 'Download 3 clips this week', emoji: '⬇️', target: 3, xpReward: 40, type: 'download' },
  { key: 'follow_3', title: 'Connector', description: 'Follow 3 new creators this week', emoji: '👥', target: 3, xpReward: 50, type: 'follow' },
  { key: 'repost_2', title: 'Amplifier', description: 'Repost 2 clips this week', emoji: '🔁', target: 2, xpReward: 40, type: 'repost' },
  { key: 'get_5_downloads', title: 'Getting Popular', description: 'Get 5 downloads on your clips this week', emoji: '🔥', target: 5, xpReward: 100, type: 'download' },
];

// Get ISO week key e.g. "2026-W12"
export function getWeekKey(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Get the 3 active challenges for the current week
export function getWeeklyChallenges(): Challenge[] {
  const weekKey = getWeekKey();
  const weekNum = parseInt(weekKey.split('-W')[1], 10);
  // Rotate through challenges based on week
  const start = (weekNum * 3) % ALL_CHALLENGES.length;
  return [
    ALL_CHALLENGES[start % ALL_CHALLENGES.length],
    ALL_CHALLENGES[(start + 1) % ALL_CHALLENGES.length],
    ALL_CHALLENGES[(start + 2) % ALL_CHALLENGES.length],
  ];
}

// Get progress for all current week challenges
export async function getWeeklyChallengeProgress(): Promise<
  Array<Challenge & { progress: number; completed: boolean }>
> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getWeeklyChallenges().map((c) => ({ ...c, progress: 0, completed: false }));

  const weekKey = getWeekKey();
  const challenges = getWeeklyChallenges();

  const { data } = await supabase
    .from('challenge_progress')
    .select('challenge_key, progress, completed')
    .eq('user_id', user.id)
    .eq('week_key', weekKey);

  const progressMap: Record<string, { progress: number; completed: boolean }> = {};
  data?.forEach((row: { challenge_key: string; progress: number; completed: boolean }) => {
    progressMap[row.challenge_key] = { progress: row.progress, completed: row.completed };
  });

  return challenges.map((c) => {
    const key = `${c.key}_${weekKey}`;
    return {
      ...c,
      progress: progressMap[key]?.progress ?? 0,
      completed: progressMap[key]?.completed ?? false,
    };
  });
}

// Increment progress on a challenge type
export async function incrementChallengeProgress(type: Challenge['type']): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const weekKey = getWeekKey();
  const challenges = getWeeklyChallenges().filter((c) => c.type === type);

  for (const challenge of challenges) {
    const challengeKey = `${challenge.key}_${weekKey}`;

    // Get current progress
    const { data: existing } = await supabase
      .from('challenge_progress')
      .select('progress, completed')
      .eq('user_id', user.id)
      .eq('challenge_key', challengeKey)
      .eq('week_key', weekKey)
      .maybeSingle();

    if (existing?.completed) continue; // Already done

    const newProgress = (existing?.progress ?? 0) + 1;
    const completed = newProgress >= challenge.target;

    await supabase
      .from('challenge_progress')
      .upsert({
        user_id: user.id,
        challenge_key: challengeKey,
        week_key: weekKey,
        progress: newProgress,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      });

    // Award XP on completion
    if (completed) {
      try {
        await supabase.rpc('add_xp', { user_id: user.id, amount: challenge.xpReward });
      } catch {
        // fire-and-forget — ignore errors
      }
    }
  }
}

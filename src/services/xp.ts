// ============================================================
// Handsup — XP & Badges Service
// ============================================================

import { supabase } from './supabase';

// XP values per action
export const XP_VALUES = {
  upload: 50,
  like: 2,
  comment: 5,
  download: 3,
  follow: 5,
  repost: 4,
  daily_login: 10,
} as const;

export type XPAction = keyof typeof XP_VALUES;

// All possible badges
export const BADGES: Record<string, { label: string; emoji: string; description: string }> = {
  first_upload:      { label: 'First Upload',     emoji: '🎬', description: 'Uploaded your first clip' },
  ten_uploads:       { label: 'Clip Maker',        emoji: '📹', description: 'Uploaded 10 clips' },
  fifty_uploads:     { label: 'Festival Regular',  emoji: '🎪', description: 'Uploaded 50 clips' },
  hundred_uploads:   { label: 'Century Club',      emoji: '💯', description: 'Uploaded 100 clips' },
  first_download:    { label: 'Downloaded',        emoji: '⬇️', description: 'Got your first download' },
  hundred_downloads: { label: 'Popular',           emoji: '🔥', description: '100 people downloaded your clips' },
  thousand_downloads:{ label: 'Viral',             emoji: '🚀', description: '1,000 downloads across your clips' },
  first_follower:    { label: 'Social',            emoji: '👥', description: 'Got your first follower' },
  fifty_followers:   { label: 'Influencer',        emoji: '⭐', description: 'Reached 50 followers' },
  first_like:        { label: 'Liked',             emoji: '❤️', description: 'Got your first like' },
  level_5:           { label: 'Rising Star',       emoji: '🌟', description: 'Reached Level 5' },
  level_10:          { label: 'Legend',            emoji: '👑', description: 'Reached Level 10' },
  multi_festival:    { label: 'Festival Hopper',   emoji: '🎡', description: 'Uploaded from 3+ different festivals' },
};

// Award XP to current user
export async function awardXP(action: XPAction): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const amount = XP_VALUES[action];
  try {
    await supabase.rpc('add_xp', { user_id: user.id, amount });
  } catch {
    // fire-and-forget — ignore errors
  }
}

// Award a badge (idempotent — safe to call multiple times)
export async function awardBadge(userId: string, badgeKey: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_badges')
    .insert({ user_id: userId, badge_key: badgeKey });

  // If error is unique violation, badge already exists — not a real error
  if (error && !error.message.includes('duplicate')) {
    return false;
  }
  return !error;
}

// Get all badges for a user
export async function getUserBadges(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_badges')
    .select('badge_key')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  return data?.map((b: { badge_key: string }) => b.badge_key) ?? [];
}

// Check and award upload-related badges
export async function checkUploadBadges(userId: string, totalUploads: number): Promise<void> {
  if (totalUploads === 1) await awardBadge(userId, 'first_upload');
  if (totalUploads >= 10) await awardBadge(userId, 'ten_uploads');
  if (totalUploads >= 50) await awardBadge(userId, 'fifty_uploads');
  if (totalUploads >= 100) await awardBadge(userId, 'hundred_uploads');
}

// Check and award download milestone badges
export async function checkDownloadBadges(userId: string, totalDownloads: number): Promise<void> {
  if (totalDownloads >= 1) await awardBadge(userId, 'first_download');
  if (totalDownloads >= 100) await awardBadge(userId, 'hundred_downloads');
  if (totalDownloads >= 1000) await awardBadge(userId, 'thousand_downloads');
}

// Check and award follower badges
export async function checkFollowerBadges(userId: string, followerCount: number): Promise<void> {
  if (followerCount >= 1) await awardBadge(userId, 'first_follower');
  if (followerCount >= 50) await awardBadge(userId, 'fifty_followers');
}

// Check level badges
export async function checkLevelBadges(userId: string, level: number): Promise<void> {
  if (level >= 5) await awardBadge(userId, 'level_5');
  if (level >= 10) await awardBadge(userId, 'level_10');
}

// Get XP needed for next level
export function xpForLevel(level: number): number {
  const thresholds = [0, 0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];
  return thresholds[Math.min(level, 10)] ?? 10000;
}

// Derive level from XP (using thresholds)
export function levelFromXp(xp: number): number {
  const thresholds = [0, 0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];
  let level = 1;
  for (let i = thresholds.length - 1; i >= 1; i--) {
    if (xp >= thresholds[i]) { level = i; break; }
  }
  return level;
}

export function levelProgress(xp: number, level: number): number {
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  if (next <= current) return 1;
  return Math.min(1, (xp - current) / (next - current));
}

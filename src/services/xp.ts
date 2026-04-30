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
  // Uploads
  first_upload:        { label: 'First Upload',      emoji: '🎬', description: 'Uploaded your first clip' },
  ten_uploads:         { label: 'Clip Maker',         emoji: '📹', description: 'Uploaded 10 clips' },
  twenty_five_uploads: { label: 'Content Creator',   emoji: '🎥', description: 'Uploaded 25 clips' },
  fifty_uploads:       { label: 'Festival Regular',  emoji: '🎪', description: 'Uploaded 50 clips' },
  hundred_uploads:     { label: 'Century Club',       emoji: '💯', description: 'Uploaded 100 clips' },
  
  // Downloads
  first_download:         { label: 'First Download',  emoji: '⬇️', description: 'Got your first download' },
  ten_downloads:          { label: 'Getting Noticed', emoji: '👀', description: '10 people downloaded your clips' },
  fifty_downloads:        { label: 'Rising',          emoji: '📈', description: '50 downloads across your clips' },
  hundred_downloads:      { label: 'Popular',         emoji: '🔥', description: '100 people downloaded your clips' },
  five_hundred_downloads: { label: 'On Fire',         emoji: '🔥🔥', description: '500 downloads' },
  thousand_downloads:     { label: 'Viral',           emoji: '🚀', description: '1,000 downloads across your clips' },
  five_thousand_downloads:{ label: 'Legendary',       emoji: '👑', description: '5,000 downloads' },
  
  // Followers
  first_follower:     { label: 'Social',        emoji: '👥', description: 'Got your first follower' },
  ten_followers:      { label: 'Growing',       emoji: '🌱', description: 'Reached 10 followers' },
  fifty_followers:    { label: 'Influencer',    emoji: '⭐', description: 'Reached 50 followers' },
  hundred_followers:  { label: 'Popular',       emoji: '🌟', description: 'Reached 100 followers' },
  
  // Likes
  first_like:         { label: 'Liked',         emoji: '❤️', description: 'Got your first like' },
  fifty_likes:        { label: 'Fan Favourite',  emoji: '💜', description: 'Got 50 likes on your clips' },
  hundred_likes:      { label: 'Crowd Pleaser', emoji: '🎉', description: 'Got 100 likes on your clips' },
  
  // Levels
  level_3:            { label: 'Getting Started', emoji: '🎯', description: 'Reached Level 3' },
  level_5:            { label: 'Rising Star',   emoji: '🌟', description: 'Reached Level 5' },
  level_10:           { label: 'Legend',        emoji: '👑', description: 'Reached Level 10' },
  
  // Festivals
  multi_festival:     { label: 'Festival Hopper',   emoji: '🎡', description: 'Uploaded from 3+ different festivals' },
  five_festivals:     { label: 'Festival Pro',      emoji: '🎠', description: 'Uploaded from 5+ different festivals' },
  ten_festivals:      { label: 'Festival Legend',   emoji: '🏆', description: 'Uploaded from 10+ different festivals' },
  first_to_festival:  { label: 'First on the Scene', emoji: '🎯', description: 'First to upload from a festival' },
  
  // Early Adopters (exclusive, prestigious)
  first_100:          { label: 'Founding 100',    emoji: '💎', description: 'Among the first 100 users' },
  first_1000:         { label: 'Pioneer',         emoji: '🌟', description: 'Among the first 1,000 users' },
  first_10000:        { label: 'Early Adopter',   emoji: '🔥', description: 'Among the first 10,000 users' },
  
  // Streaks & engagement
  streak_7:           { label: '7-Day Streak',    emoji: '📅', description: 'Logged in 7 days in a row' },
  streak_30:          { label: '30-Day Streak',   emoji: '⚡', description: 'Logged in 30 days in a row' },
  verified_artist:    { label: 'Verified Artist', emoji: '✅', description: 'Verified as an artist' },
  first_comment:      { label: 'Commenter',       emoji: '💬', description: 'Left your first comment' },
  first_follow:       { label: 'Connected',       emoji: '🤝', description: 'Followed your first creator' },
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
  if (totalUploads >= 1) await awardBadge(userId, 'first_upload');
  if (totalUploads >= 10) await awardBadge(userId, 'ten_uploads');
  if (totalUploads >= 25) await awardBadge(userId, 'twenty_five_uploads');
  if (totalUploads >= 50) await awardBadge(userId, 'fifty_uploads');
  if (totalUploads >= 100) await awardBadge(userId, 'hundred_uploads');
}

// Check and award download milestone badges
export async function checkDownloadBadges(userId: string, totalDownloads: number): Promise<void> {
  if (totalDownloads >= 1) await awardBadge(userId, 'first_download');
  if (totalDownloads >= 10) await awardBadge(userId, 'ten_downloads');
  if (totalDownloads >= 50) await awardBadge(userId, 'fifty_downloads');
  if (totalDownloads >= 100) await awardBadge(userId, 'hundred_downloads');
  if (totalDownloads >= 500) await awardBadge(userId, 'five_hundred_downloads');
  if (totalDownloads >= 1000) await awardBadge(userId, 'thousand_downloads');
  if (totalDownloads >= 5000) await awardBadge(userId, 'five_thousand_downloads');
}

// Check and award follower badges
export async function checkFollowerBadges(userId: string, followerCount: number): Promise<void> {
  if (followerCount >= 1) await awardBadge(userId, 'first_follower');
  if (followerCount >= 10) await awardBadge(userId, 'ten_followers');
  if (followerCount >= 50) await awardBadge(userId, 'fifty_followers');
  if (followerCount >= 100) await awardBadge(userId, 'hundred_followers');
}

// Check level badges
export async function checkLevelBadges(userId: string, level: number): Promise<void> {
  if (level >= 3) await awardBadge(userId, 'level_3');
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

// Check and award early adopter badges based on registration order
export async function checkEarlyAdopterBadges(userId: string): Promise<void> {
  try {
    // Get user's registration rank (how many users joined before them)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();

    if (!userProfile?.created_at) return;

    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .lt('created_at', userProfile.created_at);

    const rank = (count ?? 0) + 1;

    if (rank <= 100) await awardBadge(userId, 'first_100');
    if (rank <= 1000) await awardBadge(userId, 'first_1000');
    if (rank <= 10000) await awardBadge(userId, 'first_10000');
  } catch {
    // Silently fail
  }
}

// Check and award first-to-festival badge
export async function checkFirstToFestival(userId: string, festivalName: string): Promise<void> {
  try {
    // Check if this user was the first to upload to this festival
    const { data: clips } = await supabase
      .from('clips')
      .select('uploader_id, created_at')
      .ilike('festival_name', festivalName)
      .order('created_at', { ascending: true })
      .limit(1);

    if (clips && clips.length > 0 && clips[0].uploader_id === userId) {
      await awardBadge(userId, 'first_to_festival');
    }
  } catch {
    // Silently fail
  }
}

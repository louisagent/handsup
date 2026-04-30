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
  // ═══ UPLOADS ═══
  first_upload:        { label: 'First Upload',      emoji: '🎬', description: 'Uploaded your first clip' },
  ten_uploads:         { label: 'Clip Maker',         emoji: '📹', description: 'Uploaded 10 clips' },
  twenty_five_uploads: { label: 'Content Creator',   emoji: '🎥', description: 'Uploaded 25 clips' },
  fifty_uploads:       { label: 'Festival Regular',  emoji: '🎪', description: 'Uploaded 50 clips' },
  hundred_uploads:     { label: 'Century Club',       emoji: '💯', description: 'Uploaded 100 clips' },
  five_hundred_uploads:{ label: 'Prolific',          emoji: '🎞️', description: 'Uploaded 500 clips' },
  thousand_uploads:    { label: 'Archive Keeper',    emoji: '📼', description: 'Uploaded 1,000 clips' },
  
  // ═══ DOWNLOADS ═══
  first_download:         { label: 'First Download',  emoji: '⬇️', description: 'Got your first download' },
  ten_downloads:          { label: 'Getting Noticed', emoji: '👀', description: '10 people downloaded your clips' },
  fifty_downloads:        { label: 'Rising',          emoji: '📈', description: '50 downloads across your clips' },
  hundred_downloads:      { label: 'Popular',         emoji: '📉', description: '100 people downloaded your clips' },
  five_hundred_downloads: { label: 'On Fire',         emoji: '🔥🔥', description: '500 downloads' },
  thousand_downloads:     { label: 'Viral',           emoji: '🚀', description: '1,000 downloads across your clips' },
  five_thousand_downloads:{ label: 'Legendary',       emoji: '🌟', description: '5,000 downloads' },
  ten_thousand_downloads: { label: 'Icon',            emoji: '⭐', description: '10,000 downloads' },
  fifty_thousand_downloads:{ label: 'Hall of Fame',   emoji: '🏆', description: '50,000 downloads' },
  
  // ═══ SINGLE VIDEO PERFORMANCE (Views on ONE clip) ═══
  hit_100_views:      { label: 'Hundred Club',   emoji: '👏', description: 'A clip hit 100 views' },
  hit_500_views:      { label: 'Crowd Pleaser',  emoji: '🎊', description: 'A clip hit 500 views' },
  hit_1k_views:       { label: 'Trending',       emoji: '📊', description: 'A clip hit 1K views' },
  hit_5k_views:       { label: 'Going Viral',    emoji: '📈', description: 'A clip hit 5K views' },
  hit_10k_views:      { label: 'Viral Hit',      emoji: '💥', description: 'A clip hit 10K views' },
  hit_50k_views:      { label: 'Mega Viral',     emoji: '🔥', description: 'A clip hit 50K views' },
  hit_100k_views:     { label: 'Phenomenon',     emoji: '🎆', description: 'A clip hit 100K views' },
  hit_1m_views:       { label: 'Million Views',  emoji: '💎', description: 'A clip hit 1M views' },
  
  // ═══ TOTAL VIEWS (Across all clips) ═══
  total_1k_views:     { label: 'Seen',           emoji: '👁️', description: '1K total views' },
  total_10k_views:    { label: 'Watched',        emoji: '👀', description: '10K total views' },
  total_100k_views:   { label: 'Famous',         emoji: '🎬', description: '100K total views' },
  total_1m_views:     { label: 'Star',           emoji: '🌠', description: '1M total views' },
  total_10m_views:    { label: 'Superstar',      emoji: '✨', description: '10M total views' },
  
  // ═══ FOLLOWERS ═══
  first_follower:     { label: 'Social',        emoji: '👥', description: 'Got your first follower' },
  ten_followers:      { label: 'Growing',       emoji: '🌱', description: 'Reached 10 followers' },
  fifty_followers:    { label: 'Connected',     emoji: '🤝', description: 'Reached 50 followers' },
  hundred_followers:  { label: 'Popular',       emoji: '👋', description: 'Reached 100 followers' },
  five_hundred_followers: { label: 'Rising Star', emoji: '💫', description: 'Reached 500 followers' },
  thousand_followers: { label: 'Influencer',    emoji: '🎖️', description: 'Reached 1K followers' },
  
  // ═══ LIKES & ENGAGEMENT ═══
  first_like:         { label: 'Liked',           emoji: '❤️', description: 'Got your first like' },
  fifty_likes:        { label: 'Fan Favourite',    emoji: '💜', description: 'Got 50 likes on your clips' },
  hundred_likes:      { label: 'Loved',            emoji: '💗', description: 'Got 100 likes on your clips' },
  five_hundred_likes: { label: 'Adored',           emoji: '💖', description: 'Got 500 likes on your clips' },
  thousand_likes:     { label: 'Beloved',          emoji: '💕', description: 'Got 1K likes on your clips' },
  
  // ═══ SAVES & BOOKMARKS ═══
  first_save:         { label: 'Saved',            emoji: '🔖', description: 'A clip was saved for later' },
  fifty_saves:        { label: 'Worth Saving',     emoji: '💾', description: '50 saves across clips' },
  hundred_saves:      { label: 'Must-Save',        emoji: '📌', description: '100 saves across clips' },
  
  // ═══ SHARES & REPOSTS ═══
  first_share:        { label: 'Shareable',        emoji: '🔗', description: 'A clip was shared' },
  ten_shares:         { label: 'Worth Sharing',    emoji: '📤', description: '10 shares across clips' },
  fifty_shares:       { label: 'Viral-Worthy',     emoji: '🌐', description: '50 shares across clips' },
  first_repost:       { label: 'Reposted',         emoji: '🔁', description: 'Someone reposted your clip' },
  ten_reposts:        { label: 'Repost Magnet',    emoji: '♻️', description: '10 reposts' },
  
  // Levels
  level_3:            { label: 'Getting Started', emoji: '🎯', description: 'Reached Level 3' },
  level_5:            { label: 'Leveling Up',   emoji: '🆙', description: 'Reached Level 5' },
  level_10:           { label: 'Legend',        emoji: '🏅', description: 'Reached Level 10' },
  
  // ═══ FESTIVALS & EVENTS ═══
  multi_festival:     { label: 'Festival Hopper',   emoji: '🎡', description: 'Uploaded from 3+ different festivals' },
  five_festivals:     { label: 'Festival Pro',      emoji: '🎠', description: 'Uploaded from 5+ different festivals' },
  ten_festivals:      { label: 'Festival Legend',   emoji: '🎪', description: 'Uploaded from 10+ different festivals' },
  twenty_festivals:   { label: 'Festival Collector', emoji: '🎟️', description: 'Uploaded from 20+ different festivals' },
  first_to_festival:  { label: 'First on the Scene', emoji: '🚩', description: 'First to upload from a festival' },
  weekend_warrior:    { label: 'Weekend Warrior',   emoji: '🎉', description: 'Uploaded from 5 weekend festivals' },
  full_lineup:        { label: 'Full Lineup',       emoji: '🎶', description: 'Uploaded 10+ artists from one festival' },
  
  // Early Adopters (exclusive, prestigious)
  first_100:          { label: 'Founding 100',    emoji: '💎', description: 'Among the first 100 users' },
  first_1000:         { label: 'Pioneer',         emoji: '🎖️', description: 'Among the first 1,000 users' },
  first_10000:        { label: 'Early Adopter',   emoji: '🆕', description: 'Among the first 10,000 users' },
  
  // ═══ TIME-BASED & SPECIAL MOMENTS ═══
  night_owl:          { label: 'Night Owl',        emoji: '🦉', description: 'Uploaded after midnight' },
  early_bird:         { label: 'Early Bird',       emoji: '🐥', description: 'Uploaded before 6 AM' },
  golden_hour:        { label: 'Golden Hour',      emoji: '🌅', description: 'Uploaded during sunset' },
  sunrise_set:        { label: 'Sunrise Set',      emoji: '🌄', description: 'Captured a sunrise set' },
  closing_set:        { label: 'Closing Time',     emoji: '🌙', description: 'Captured the closing set' },
  opening_act:        { label: 'Opening Act',      emoji: '🎸', description: 'Captured the opening set' },
  headliner_moment:   { label: 'Headliner',        emoji: '🎤', description: 'Captured a headliner set' },
  backstage_pass:     { label: 'Backstage',        emoji: '🎭', description: 'Uploaded backstage content' },
  front_row:          { label: 'Front Row',        emoji: '👋', description: 'Captured from the front row' },
  secret_set:         { label: 'Secret Set',       emoji: '🤫', description: 'Captured a surprise/secret set' },
  
  // ═══ EXPLORATION & DISCOVERY ═══
  explorer:           { label: 'Explorer',         emoji: '🧭', description: 'Watched clips from 20+ artists' },
  music_lover:        { label: 'Music Lover',      emoji: '🎵', description: 'Watched clips from 50+ artists' },
  genre_hopper:       { label: 'Genre Hopper',     emoji: '🎶', description: 'Explored 5+ music genres' },
  global_citizen:     { label: 'Global Citizen',   emoji: '🌍', description: 'Watched clips from 10+ countries' },
  
  // ═══ STREAKS & CONSISTENCY ═══
  streak_3:           { label: '3-Day Streak',     emoji: '🔥', description: 'Logged in 3 days in a row' },
  streak_7:           { label: '7-Day Streak',     emoji: '📅', description: 'Logged in 7 days in a row' },
  streak_30:          { label: '30-Day Streak',    emoji: '⚡', description: 'Logged in 30 days in a row' },
  streak_100:         { label: '100-Day Streak',   emoji: '💯', description: 'Logged in 100 days in a row' },
  
  // ═══ SPECIAL STATUS ═══
  verified_artist:    { label: 'Verified Artist',  emoji: '✅', description: 'Verified as an artist' },
  first_comment:      { label: 'Commenter',        emoji: '💬', description: 'Left your first comment' },
  first_follow:       { label: 'Connected',        emoji: '🤝', description: 'Followed your first creator' },
  community_helper:   { label: 'Helper',           emoji: '🤝', description: 'Helped 10 users with tips' },
  reporter:           { label: 'Guardian',         emoji: '🛡️', description: 'Reported inappropriate content' },
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
  if (totalUploads >= 500) await awardBadge(userId, 'five_hundred_uploads');
  if (totalUploads >= 1000) await awardBadge(userId, 'thousand_uploads');
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
  if (totalDownloads >= 10000) await awardBadge(userId, 'ten_thousand_downloads');
  if (totalDownloads >= 50000) await awardBadge(userId, 'fifty_thousand_downloads');
}

// Check and award follower badges
export async function checkFollowerBadges(userId: string, followerCount: number): Promise<void> {
  if (followerCount >= 1) await awardBadge(userId, 'first_follower');
  if (followerCount >= 10) await awardBadge(userId, 'ten_followers');
  if (followerCount >= 50) await awardBadge(userId, 'fifty_followers');
  if (followerCount >= 100) await awardBadge(userId, 'hundred_followers');
  if (followerCount >= 500) await awardBadge(userId, 'five_hundred_followers');
  if (followerCount >= 1000) await awardBadge(userId, 'thousand_followers');
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

// Check and award single-video view milestones
export async function checkSingleVideoViewBadges(userId: string, viewCount: number): Promise<void> {
  if (viewCount >= 100) await awardBadge(userId, 'hit_100_views');
  if (viewCount >= 500) await awardBadge(userId, 'hit_500_views');
  if (viewCount >= 1000) await awardBadge(userId, 'hit_1k_views');
  if (viewCount >= 5000) await awardBadge(userId, 'hit_5k_views');
  if (viewCount >= 10000) await awardBadge(userId, 'hit_10k_views');
  if (viewCount >= 50000) await awardBadge(userId, 'hit_50k_views');
  if (viewCount >= 100000) await awardBadge(userId, 'hit_100k_views');
  if (viewCount >= 1000000) await awardBadge(userId, 'hit_1m_views');
}

// Check and award total view milestones (across all clips)
export async function checkTotalViewBadges(userId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('clips')
      .select('view_count')
      .eq('uploader_id', userId);

    const totalViews = data?.reduce((sum, clip) => sum + (clip.view_count ?? 0), 0) ?? 0;

    if (totalViews >= 1000) await awardBadge(userId, 'total_1k_views');
    if (totalViews >= 10000) await awardBadge(userId, 'total_10k_views');
    if (totalViews >= 100000) await awardBadge(userId, 'total_100k_views');
    if (totalViews >= 1000000) await awardBadge(userId, 'total_1m_views');
    if (totalViews >= 10000000) await awardBadge(userId, 'total_10m_views');
  } catch {
    // Silently fail
  }
}

// Check and award like milestones
export async function checkLikeBadges(userId: string, totalLikes: number): Promise<void> {
  if (totalLikes >= 1) await awardBadge(userId, 'first_like');
  if (totalLikes >= 50) await awardBadge(userId, 'fifty_likes');
  if (totalLikes >= 100) await awardBadge(userId, 'hundred_likes');
  if (totalLikes >= 500) await awardBadge(userId, 'five_hundred_likes');
  if (totalLikes >= 1000) await awardBadge(userId, 'thousand_likes');
}

// Check and award save/bookmark milestones
export async function checkSaveBadges(userId: string, totalSaves: number): Promise<void> {
  if (totalSaves >= 1) await awardBadge(userId, 'first_save');
  if (totalSaves >= 50) await awardBadge(userId, 'fifty_saves');
  if (totalSaves >= 100) await awardBadge(userId, 'hundred_saves');
}

// Check and award share milestones
export async function checkShareBadges(userId: string, totalShares: number): Promise<void> {
  if (totalShares >= 1) await awardBadge(userId, 'first_share');
  if (totalShares >= 10) await awardBadge(userId, 'ten_shares');
  if (totalShares >= 50) await awardBadge(userId, 'fifty_shares');
}

// Check and award repost milestones
export async function checkRepostBadges(userId: string, totalReposts: number): Promise<void> {
  if (totalReposts >= 1) await awardBadge(userId, 'first_repost');
  if (totalReposts >= 10) await awardBadge(userId, 'ten_reposts');
}

// Check and award festival diversity badges
export async function checkFestivalBadges(userId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('clips')
      .select('festival_name')
      .eq('uploader_id', userId)
      .not('festival_name', 'is', null);

    const uniqueFestivals = new Set(data?.map(c => c.festival_name.toLowerCase()));
    const count = uniqueFestivals.size;

    if (count >= 3) await awardBadge(userId, 'multi_festival');
    if (count >= 5) await awardBadge(userId, 'five_festivals');
    if (count >= 10) await awardBadge(userId, 'ten_festivals');
    if (count >= 20) await awardBadge(userId, 'twenty_festivals');
  } catch {
    // Silently fail
  }
}

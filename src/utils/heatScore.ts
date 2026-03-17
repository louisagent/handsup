// ============================================================
// Handsup — Scoring Algorithms
//
// TWO separate formulas:
//
// 1. TRENDING SCORE (for home feed / discover)
//    Weighted heavily toward comments (high social signal),
//    then likes, then downloads, then full views.
//    Age decay applied so fresh content rises fast.
//
//    trending = (comments * 10 + likes * 3 + downloads * 2 + full_views) / (age_hours + 2)^1.5
//
// 2. LEADERBOARD POINTS (per uploader, all-time or monthly)
//    Downloads carry the most weight (strongest intent signal).
//    Full views are second. Likes are a lighter signal.
//    No age decay — these are cumulative career stats.
//
//    points = downloads * 5 + full_views * 2 + likes * 1
//
// ============================================================

export interface HeatInput {
  views: number;
  full_views: number;
  downloads: number;
  likes: number;
  comments: { id: string }[]; // only need array length
  created_at: string; // ISO date string
}

export type HeatTier = 'on-fire' | 'hot' | 'rising' | 'fresh' | 'cool';

export interface HeatResult {
  score: number;
  tier: HeatTier;
  label: string;
  emoji: string;
  color: string;
}

// ─── Trending Score ───────────────────────────────────────────────────────────
// Used for home feed ordering and "Trending this week" strip.
// Comments are weighted 10x — active conversation = relevant content.

export function getTrendingScore(clip: HeatInput): number {
  const ageMs = Date.now() - new Date(clip.created_at).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const commentCount = clip.comments?.length ?? 0;

  const engagement =
    commentCount * 10 +
    clip.likes * 3 +
    clip.downloads * 2 +
    clip.full_views * 1;

  return engagement / Math.pow(ageHours + 2, 1.5);
}

// Keep backward-compatible alias
export function getHeatScore(clip: HeatInput): HeatResult {
  const score = getTrendingScore(clip);
  const tier = getTier(score);
  return { score, ...tierMeta[tier], tier };
}

function getTier(score: number): HeatTier {
  if (score >= 80) return 'on-fire';
  if (score >= 30) return 'hot';
  if (score >= 8)  return 'rising';
  if (score >= 1)  return 'fresh';
  return 'cool';
}

const tierMeta: Record<HeatTier, { label: string; emoji: string; color: string }> = {
  'on-fire': { label: 'On fire', emoji: '🔥🔥🔥', color: '#EF4444' },
  'hot':     { label: 'Hot',     emoji: '🔥',      color: '#F97316' },
  'rising':  { label: 'Rising',  emoji: '📈',      color: '#EAB308' },
  'fresh':   { label: 'Fresh',   emoji: '✨',      color: '#8B5CF6' },
  'cool':    { label: '',        emoji: '',         color: 'transparent' },
};

// ─── Leaderboard Points ───────────────────────────────────────────────────────
// Downloads = 5 pts each (strongest intent — someone saved this forever)
// Full views = 2 pts each (watched to the end = quality signal)
// Likes = 1 pt each (lightweight but meaningful)

export function getUploaderPoints(clip: HeatInput): number {
  return clip.downloads * 5 + clip.full_views * 2 + clip.likes * 1;
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

export function sortByHeat<T extends HeatInput>(clips: T[]): T[] {
  return [...clips].sort(
    (a, b) => getTrendingScore(b) - getTrendingScore(a)
  );
}

export function sortByPoints<T extends HeatInput>(clips: T[]): T[] {
  return [...clips].sort(
    (a, b) => getUploaderPoints(b) - getUploaderPoints(a)
  );
}

// ─── Badge helper ─────────────────────────────────────────────────────────────

export function getHeatBadge(clip: HeatInput): { emoji: string; label: string; color: string } | null {
  const result = getHeatScore(clip);
  if (result.tier === 'cool') return null;
  return { emoji: result.emoji, label: result.label, color: result.color };
}

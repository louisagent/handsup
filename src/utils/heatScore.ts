// ============================================================
// Handsup — Heat Score Algorithm
// Ranks clips by a combination of recency + engagement velocity
//
// Formula inspired by Reddit/Hacker News ranking:
//   score = (downloads * 2 + views) / (age_in_hours + 2)^1.5
//
// Downloads worth 2x views (stronger intent signal)
// Age penalty gets steeper over time (fresh content rises fast)
// +2 prevents division by zero for brand new clips
// ============================================================

export interface HeatInput {
  views: number;
  downloads: number;
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

export function getHeatScore(clip: HeatInput): HeatResult {
  const ageMs = Date.now() - new Date(clip.created_at).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  const engagement = clip.downloads * 2 + clip.views;
  const score = engagement / Math.pow(ageHours + 2, 1.5);

  const tier = getTier(score);

  return {
    score,
    ...tierMeta[tier],
    tier,
  };
}

function getTier(score: number): HeatTier {
  if (score >= 80) return 'on-fire';
  if (score >= 30) return 'hot';
  if (score >= 8)  return 'rising';
  if (score >= 1)  return 'fresh';
  return 'cool';
}

const tierMeta: Record<HeatTier, { label: string; emoji: string; color: string }> = {
  'on-fire': { label: 'On fire',  emoji: '🔥🔥🔥',  color: '#EF4444' }, // red
  'hot':     { label: 'Hot',      emoji: '🔥',  color: '#F97316' }, // orange
  'rising':  { label: 'Rising',   emoji: '📈',  color: '#EAB308' }, // yellow
  'fresh':   { label: 'Fresh',    emoji: '✨',  color: '#8B5CF6' }, // purple
  'cool':    { label: '',         emoji: '',    color: 'transparent' },
};

// Sort an array of clips by heat score (descending)
export function sortByHeat<T extends HeatInput>(clips: T[]): T[] {
  return [...clips].sort(
    (a, b) => getHeatScore(b).score - getHeatScore(a).score
  );
}

// Get just the badge for inline display
export function getHeatBadge(clip: HeatInput): { emoji: string; label: string; color: string } | null {
  const result = getHeatScore(clip);
  if (result.tier === 'cool') return null;
  return { emoji: result.emoji, label: result.label, color: result.color };
}

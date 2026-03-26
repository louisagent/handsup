// ============================================================
// Handsup — Clips Service
// All clip-related API calls. Swap mockData usage for these
// once Supabase is connected.
// ============================================================

import { supabase } from './supabase';
import { Clip, SearchParams } from '../types';

// Get recent clips for home feed
export async function getRecentClips(limit = 20, offset = 0): Promise<Clip[]> {
  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles!uploader_id(username, is_verified), event:events(name, slug)')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}

// Get trending clips (most downloaded in last 7 days)
export async function getTrendingClips(limit = 10): Promise<Clip[]> {
  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles!uploader_id(username, is_verified)')
    .eq('is_approved', true)
    .order('download_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// Search clips by artist, festival, location, or date
export async function searchClips(params: SearchParams): Promise<Clip[]> {
  let query = supabase
    .from('clips')
    .select('*, uploader:profiles!uploader_id(username)')
    .eq('is_approved', true);

  if (params.query) {
    // Full-text search across artist, festival, location
    query = query.textSearch(
      'artist,festival_name,location',
      params.query,
      { type: 'websearch' }
    );
  }

  if (params.artist) {
    query = query.ilike('artist', `%${params.artist}%`);
  }

  if (params.location) {
    query = query.ilike('location', `%${params.location}%`);
  }

  if (params.festival) {
    query = query.ilike('festival_name', `%${params.festival}%`);
  }

  if (params.date) {
    query = query.eq('clip_date', params.date);
  }

  if (params.description) {
    // Hashtag search — search description field with ilike
    query = query.ilike('description', `%${params.description}%`);
  }

  const { data, error } = await query
    .order('download_count', { ascending: false })
    .limit(params.limit ?? 50)
    .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50) - 1);

  if (error) throw error;
  return data ?? [];
}

// Get all clips for a specific artist
export async function getClipsByArtist(artist: string): Promise<Clip[]> {
  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles!uploader_id(username)')
    .eq('is_approved', true)
    .ilike('artist', artist)
    .order('clip_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Get clips for a specific event
//
// TODO(private-events): Private event clips should only be visible to:
//   1. The event creator (events.created_by = auth.uid())
//   2. Members who joined via invite code (event_members.user_id = auth.uid())
//
// Full enforcement should be handled via Supabase Row Level Security (RLS) on
// the 'clips' table — e.g.:
//
//   CREATE POLICY "Private event clips: creator + members only"
//   ON public.clips FOR SELECT
//   USING (
//     event_id IS NULL
//     OR NOT EXISTS (SELECT 1 FROM events WHERE id = event_id AND is_private = true)
//     OR EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid())
//     OR EXISTS (SELECT 1 FROM event_members WHERE event_id = clips.event_id AND user_id = auth.uid())
//   );
//
// Until that policy is applied, private event clips are still queryable if you
// know the event_id. Apply the migration in supabase/private_events_migration.sql
// and add the RLS policy above to fully secure clips.
export async function getClipsByEvent(eventId: string): Promise<Clip[]> {
  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles!uploader_id(username)')
    .eq('is_approved', true)
    .eq('event_id', eventId)
    .order('download_count', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Get single clip by ID
export async function getClip(clipId: string): Promise<Clip | null> {
  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles!uploader_id(*), event:events(*)')
    .eq('id', clipId)
    .single();

  if (error) return null;
  return data;
}

// Upload a new clip (metadata only — video file handled separately via Storage)
export async function uploadClip(clip: {
  artist: string;
  festival_name: string;
  location: string;
  clip_date: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  event_id?: string;
}): Promise<Clip> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('clips')
    .insert({ ...clip, uploader_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Record a download
export async function recordDownload(clipId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Upsert — doesn't duplicate if already downloaded
  await supabase
    .from('downloads')
    .upsert({ user_id: user.id, clip_id: clipId });
}

// Check if user has downloaded a clip
export async function hasDownloaded(clipId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('downloads')
    .select('id')
    .eq('user_id', user.id)
    .eq('clip_id', clipId)
    .maybeSingle();

  return !!data;
}

// Track a view
export async function trackView(clipId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase
    .from('clip_views')
    .insert({ clip_id: clipId, user_id: user?.id ?? null });
}

// Get clips from people the current user follows
export async function getFollowingClips(limit = 20): Promise<Clip[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: followData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  if (!followData || followData.length === 0) return [];

  const followingIds = followData.map((f: { following_id: string }) => f.following_id);

  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles!uploader_id(username, is_verified), event:events(name, slug)')
    .eq('is_approved', true)
    .in('uploader_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// Get trending artists by clip count (client-side aggregation)
export async function getTrendingArtists(limit = 5): Promise<{ artist: string; count: number }[]> {
  const { data } = await supabase
    .from('clips')
    .select('artist')
    .eq('is_approved', true)
    .limit(200);

  if (!data) return [];
  const counts: Record<string, number> = {};
  data.forEach((c: { artist: string }) => {
    counts[c.artist] = (counts[c.artist] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Delete a clip (uploader only — RLS enforces this)
export async function deleteClip(clipId: string): Promise<void> {
  const { error } = await supabase
    .from('clips')
    .delete()
    .eq('id', clipId);

  if (error) throw error;
}

// Get leaderboard — top clips sorted by download_count
export async function getLeaderboard(period: 'week' | 'month' | 'all' = 'all'): Promise<Clip[]> {
  let query = supabase
    .from('clips')
    .select('*, uploader:profiles!uploader_id(username, is_verified)')
    .eq('is_approved', true)
    .order('download_count', { ascending: false })
    .limit(20);

  if (period === 'week') {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    query = query.gte('created_at', since.toISOString());
  } else if (period === 'month') {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    query = query.gte('created_at', since.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// Get leaderboard filtered by festival name
export async function getLeaderboardByEvent(festival: string, limit = 20): Promise<Clip[]> {
  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles!uploader_id(username, is_verified)')
    .eq('is_approved', true)
    .ilike('festival_name', `%${festival}%`)
    .order('download_count', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Get clips uploaded by a specific user
export async function getClipsByUploader(userId: string): Promise<Clip[]> {
  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles!uploader_id(username, is_verified)')
    .eq('uploader_id', userId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Get all pending (unresolved) reports — admin only
export async function getPendingReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*, clip:clips(*, uploader:profiles!uploader_id(username)), reporter:profiles!reporter_id(username)')
    .eq('resolved', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Mark a report as resolved
export async function resolveReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .update({ resolved: true })
    .eq('id', reportId);
  if (error) throw error;
}

// ── Clip Likes ─────────────────────────────────────────────
// Delegated to the dedicated likes service. Re-exported here so that
// existing imports from '../services/clips' continue to work unchanged.

export { likeClip, unlikeClip, hasLiked, getLikeCount } from './likes';

// ── Clip Reactions ─────────────────────────────────────────

export async function getReactions(clipId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('clip_reactions')
    .select('emoji')
    .eq('clip_id', clipId);
  const counts: Record<string, number> = {};
  data?.forEach((r: { emoji: string }) => {
    counts[r.emoji] = (counts[r.emoji] || 0) + 1;
  });
  return counts;
}

export async function addReaction(clipId: string, emoji: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('clip_reactions')
    .upsert({ clip_id: clipId, user_id: user.id, emoji });
}

export async function removeReaction(clipId: string, emoji: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('clip_reactions')
    .delete()
    .eq('clip_id', clipId)
    .eq('user_id', user.id)
    .eq('emoji', emoji);
}

export async function getMyReactions(clipId: string): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('clip_reactions')
    .select('emoji')
    .eq('clip_id', clipId)
    .eq('user_id', user.id);
  return data?.map((r: { emoji: string }) => r.emoji) ?? [];
}

// Report a clip
export async function reportClip(clipId: string, reason: string, detail?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('reports')
    .insert({ clip_id: clipId, reporter_id: user?.id, reason, detail });

  if (error) throw error;
}

// Get clips from same week last year (±7 days)
export async function getThisTimeLastYearClips(limit = 5): Promise<Clip[]> {
  const today = new Date();
  const lastYear = new Date(today);
  lastYear.setFullYear(lastYear.getFullYear() - 1);

  const from = new Date(lastYear);
  from.setDate(from.getDate() - 7);
  const to = new Date(lastYear);
  to.setDate(to.getDate() + 7);

  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles!uploader_id(username, is_verified)')
    .eq('is_approved', true)
    .gte('clip_date', from.toISOString().split('T')[0])
    .lte('clip_date', to.toISOString().split('T')[0])
    .order('download_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// Get featured festival clips for empty feed state
export async function getFeaturedFestivalClips(): Promise<{ festivalName: string; clips: Clip[] } | null> {
  // Get the festival with most clips as the "featured" one
  const { data: festivalData } = await supabase
    .from('clips')
    .select('festival_name')
    .eq('is_approved', true)
    .limit(100);

  if (!festivalData || festivalData.length === 0) return null;

  // Count clips per festival
  const counts: Record<string, number> = {};
  festivalData.forEach((c: { festival_name: string }) => {
    counts[c.festival_name] = (counts[c.festival_name] ?? 0) + 1;
  });

  const topFestival = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)[0]?.[0];

  if (!topFestival) return null;

  const { data: clips } = await supabase
    .from('clips')
    .select('*, uploader:profiles!uploader_id(username, is_verified)')
    .eq('is_approved', true)
    .eq('festival_name', topFestival)
    .order('download_count', { ascending: false })
    .limit(8);

  return { festivalName: topFestival, clips: clips ?? [] };
}

// Get clip count for a specific artist at a specific event/festival
export async function getClipCountForSet(artist: string, festivalName: string): Promise<number> {
  const { count } = await supabase
    .from('clips')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', true)
    .ilike('artist', artist)
    .ilike('festival_name', festivalName);

  return count ?? 0;
}

// ── Signed URL helpers (private clips bucket) ──────────────

/**
 * Generate a fresh signed URL for a given storage path.
 * Path should be relative to the clips bucket, e.g. "user-id/filename.mp4"
 */
export async function getSignedUrl(path: string, expiresInSeconds = 60 * 60 * 24 * 7): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('clips')
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/**
 * Resolve the best playable URL for a clip.
 * - Signed URL (contains token=): return as-is
 * - Public URL (/object/public/clips/...): extract path and generate signed URL
 * - Storage path (clips/... or user-id/...): generate signed URL directly
 */
export async function resolveVideoUrl(clip: Clip): Promise<string> {
  const url = clip.video_url;
  if (!url) return '';

  // Already a signed URL — return as-is (may be expired, but best we can do without path)
  if (url.startsWith('http') && url.includes('token=')) {
    return url;
  }

  // Public-style URL — extract path after /public/clips/
  if (url.startsWith('http') && url.includes('/object/public/clips/')) {
    const match = url.match(/\/object\/public\/clips\/(.+)/);
    if (match?.[1]) {
      const signed = await getSignedUrl(decodeURIComponent(match[1]));
      return signed ?? url;
    }
    return url;
  }

  // Storage path — either "clips/..." or bare "user-id/file.mp4"
  let storagePath = url;
  if (storagePath.startsWith('clips/')) {
    storagePath = storagePath.replace(/^clips\//, '');
  }
  const signed = await getSignedUrl(storagePath);
  return signed ?? url;
}

// ── Algorithmic For You Feed ────────────────────────────────

// Get "For You" feed — personalised mix based on engagement history
export async function getForYouFeed(limit = 20): Promise<Clip[]> {
  const { data: { user } } = await supabase.auth.getUser();

  // If not logged in, just return trending
  if (!user) {
    return getTrendingClips(limit);
  }

  // 0. Fetch user's genre preferences
  const { data: profile } = await supabase
    .from('profiles')
    .select('genre_preferences')
    .eq('id', user.id)
    .single();

  const genrePrefs: string[] = profile?.genre_preferences ?? [];

  // 1. Get artists/festivals the user has liked or downloaded
  const [likedClips, downloadedClips, followingIds] = await Promise.all([
    supabase
      .from('clip_likes')
      .select('clip:clips(artist, festival_name)')
      .eq('user_id', user.id)
      .limit(30),
    supabase
      .from('downloads')
      .select('clip:clips(artist, festival_name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id),
  ]);

  // Extract preferred artists and festivals
  const artistScores: Record<string, number> = {};
  const festivalScores: Record<string, number> = {};

  const processClip = (clip: any, weight: number) => {
    if (!clip) return;
    if (clip.artist) artistScores[clip.artist] = (artistScores[clip.artist] ?? 0) + weight;
    if (clip.festival_name) festivalScores[clip.festival_name] = (festivalScores[clip.festival_name] ?? 0) + weight;
  };

  likedClips.data?.forEach((r: any) => processClip(r.clip, 1));
  downloadedClips.data?.forEach((r: any) => processClip(r.clip, 2)); // downloads weigh more

  const topArtists = Object.entries(artistScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([artist]) => artist);

  const topFestivals = Object.entries(festivalScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([festival]) => festival);

  const followingUserIds = followingIds.data?.map((f: { following_id: string }) => f.following_id) ?? [];

  // 2. Fetch candidate clips in parallel
  const [
    followingClips,
    artistClips,
    festivalClips,
    trendingClips,
    genreClips,
  ] = await Promise.all([
    // Clips from followed users (recent)
    followingUserIds.length > 0
      ? supabase
          .from('clips')
          .select('*, uploader:profiles!uploader_id(username, is_verified)')
          .eq('is_approved', true)
          .in('uploader_id', followingUserIds)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),

    // Clips from artists the user likes
    topArtists.length > 0
      ? supabase
          .from('clips')
          .select('*, uploader:profiles!uploader_id(username, is_verified)')
          .eq('is_approved', true)
          .in('artist', topArtists)
          .order('download_count', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),

    // Clips from festivals the user likes
    topFestivals.length > 0
      ? supabase
          .from('clips')
          .select('*, uploader:profiles!uploader_id(username, is_verified)')
          .eq('is_approved', true)
          .in('festival_name', topFestivals)
          .order('download_count', { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),

    // Trending clips for discovery
    supabase
      .from('clips')
      .select('*, uploader:profiles!uploader_id(username, is_verified)')
      .eq('is_approved', true)
      .order('download_count', { ascending: false })
      .limit(10),

    // Clips matching user's genre preferences (onboarding data)
    genrePrefs.length > 0
      ? supabase
          .from('clips')
          .select('*, uploader:profiles!uploader_id(username, is_verified)')
          .eq('is_approved', true)
          .or(genrePrefs.map((g) => `description.ilike.%${g}%`).join(','))
          .order('download_count', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
  ]);

  // 3. Merge, deduplicate, and rank
  const seen = new Set<string>();
  const scored: Array<{ clip: Clip; score: number }> = [];

  const addClips = (clips: Clip[], baseScore: number) => {
    clips?.forEach((clip, i) => {
      if (seen.has(clip.id)) return;
      seen.add(clip.id);
      // Score: base + recency bonus (newer = higher position bonus)
      const recencyBonus = Math.max(0, 10 - i);
      const popularityBonus = Math.min(10, Math.log10((clip.download_count ?? 0) + 1) * 2);
      scored.push({ clip, score: baseScore + recencyBonus + popularityBonus });
    });
  };

  addClips((followingClips.data ?? []) as Clip[], 100);  // Following: highest priority
  addClips((artistClips.data ?? []) as Clip[], 60);      // Liked artists
  addClips((festivalClips.data ?? []) as Clip[], 40);    // Liked festivals
  addClips((genreClips.data ?? []) as Clip[], 50);       // Genre preferences (onboarding)
  addClips((trendingClips.data ?? []) as Clip[], 20);    // Discovery

  // Sort by score (with slight shuffle for freshness)
  scored.sort((a, b) => b.score - a.score + (Math.random() - 0.5) * 5);

  return scored.slice(0, limit).map((s) => s.clip);
}

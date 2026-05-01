// ============================================================
// Trending Festivals Service
// Rank festivals by recent activity: clips, views, unique uploaders
// ============================================================

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'trending_festivals_cache';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export interface TrendingFestival {
  name: string;
  slug?: string;
  clipCount: number;
  viewCount: number;
  uniqueUploaders: number;
  trendingScore: number;
  recentClips?: Array<{
    id: string;
    artist: string;
    thumbnail_url?: string;
    view_count: number;
  }>;
}

interface CachedTrendingData {
  data: TrendingFestival[];
  timestamp: number;
}

/**
 * Get trending festivals ranked by activity
 * @param days - Number of days to look back (default: 7)
 * @param limit - Max number of results (default: 10)
 */
export async function getTrendingFestivals(
  days: number = 7,
  limit: number = 10
): Promise<TrendingFestival[]> {
  try {
    // Check cache first
    const cached = await getCachedTrending();
    if (cached) {
      return cached.slice(0, limit);
    }

    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const dateString = dateThreshold.toISOString();

    // Query clips from last N days
    const { data: recentClips, error: clipsError } = await supabase
      .from('clips')
      .select('id, festival_name, artist, uploader_id, view_count, thumbnail_url, created_at')
      .gte('created_at', dateString)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (clipsError) {
      console.error('[trending] Failed to fetch clips:', clipsError);
      return [];
    }

    if (!recentClips || recentClips.length === 0) {
      return [];
    }

    // Group by festival and calculate metrics
    const festivalMap = new Map<string, {
      clips: typeof recentClips;
      uploaders: Set<string>;
      totalViews: number;
    }>();

    for (const clip of recentClips) {
      if (!clip.festival_name) continue;

      const festivalName = clip.festival_name.trim();
      if (!festivalMap.has(festivalName)) {
        festivalMap.set(festivalName, {
          clips: [],
          uploaders: new Set(),
          totalViews: 0,
        });
      }

      const festival = festivalMap.get(festivalName)!;
      festival.clips.push(clip);
      if (clip.uploader_id) {
        festival.uploaders.add(clip.uploader_id);
      }
      festival.totalViews += clip.view_count ?? 0;
    }

    // Calculate trending scores and build results
    const trending: TrendingFestival[] = [];

    for (const [name, data] of festivalMap.entries()) {
      // Trending score algorithm:
      // - Recent clips (weight: 1x)
      // - Unique uploaders (weight: 5x - diversity is valuable)
      // - Views (weight: 0.1x - views accumulate slower)
      const trendingScore =
        data.clips.length * 1 +
        data.uploaders.size * 5 +
        data.totalViews * 0.1;

      // Get event slug if it exists
      const { data: eventData } = await supabase
        .from('events')
        .select('slug')
        .ilike('name', name)
        .limit(1)
        .single();

      trending.push({
        name,
        slug: eventData?.slug,
        clipCount: data.clips.length,
        viewCount: data.totalViews,
        uniqueUploaders: data.uploaders.size,
        trendingScore,
        recentClips: data.clips
          .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
          .slice(0, 3)
          .map((clip) => ({
            id: clip.id,
            artist: clip.artist,
            thumbnail_url: clip.thumbnail_url,
            view_count: clip.view_count ?? 0,
          })),
      });
    }

    // Sort by trending score
    trending.sort((a, b) => b.trendingScore - a.trendingScore);

    // Cache results
    await cacheTrending(trending);

    return trending.slice(0, limit);
  } catch (error) {
    console.error('[trending] Error fetching trending festivals:', error);
    return [];
  }
}

/**
 * Check if a festival is trending
 */
export async function isFestivalTrending(festivalName: string): Promise<boolean> {
  const trending = await getTrendingFestivals(7, 20);
  return trending.some(
    (f) => f.name.toLowerCase() === festivalName.toLowerCase()
  );
}

/**
 * Get trending rank for a festival (1-indexed, null if not trending)
 */
export async function getFestivalTrendingRank(
  festivalName: string
): Promise<number | null> {
  const trending = await getTrendingFestivals(7, 50);
  const index = trending.findIndex(
    (f) => f.name.toLowerCase() === festivalName.toLowerCase()
  );
  return index >= 0 ? index + 1 : null;
}

// ── Cache helpers ────────────────────────────────────────────

async function getCachedTrending(): Promise<TrendingFestival[] | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedTrendingData = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;

    if (age < CACHE_DURATION_MS) {
      return parsed.data;
    }

    // Cache expired
    await AsyncStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

async function cacheTrending(data: TrendingFestival[]): Promise<void> {
  try {
    const cacheData: CachedTrendingData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('[trending] Failed to cache data:', error);
  }
}

/**
 * Clear trending cache (call when new clips are uploaded)
 */
export async function clearTrendingCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('[trending] Failed to clear cache:', error);
  }
}

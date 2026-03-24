// ============================================================
// Handsup — Reposts Service
// Handles reposting clips, checking repost state, and building
// a repost-based feed for users.
//
// Schema: supabase/migrations/reposts_migration.sql
// ============================================================

import { supabase } from './supabase';
import { Clip, Profile } from '../types';

// ── Types ─────────────────────────────────────────────────

export interface RepostFeedItem {
  /** The clip being reposted */
  clip: Clip;
  /** Profile of the person who reposted it */
  reposter: Profile;
  /** When the repost was made */
  reposted_at: string;
}

// ── Repost a clip ─────────────────────────────────────────

/**
 * Repost a clip on behalf of the currently authenticated user.
 * Inserts into `reposts`; the DB trigger increments `repost_count`.
 * Idempotent — upserts so double-calls won't throw.
 */
export async function repostClip(userId: string, clipId: string): Promise<void> {
  const { error } = await supabase
    .from('reposts')
    .upsert({ user_id: userId, clip_id: clipId }, { onConflict: 'user_id,clip_id' });

  if (error) throw error;
}

// ── Undo a repost ─────────────────────────────────────────

/**
 * Remove a repost. The DB trigger decrements `repost_count`.
 * No-ops gracefully if the repost doesn't exist.
 */
export async function undoRepost(userId: string, clipId: string): Promise<void> {
  const { error } = await supabase
    .from('reposts')
    .delete()
    .eq('user_id', userId)
    .eq('clip_id', clipId);

  if (error) throw error;
}

// ── Check if reposted ────────────────────────────────────

/**
 * Returns true if the given user has reposted the given clip.
 * Returns false on any error so callers can fall back gracefully.
 */
export async function hasReposted(userId: string, clipId: string): Promise<boolean> {
  const { data } = await supabase
    .from('reposts')
    .select('id')
    .eq('user_id', userId)
    .eq('clip_id', clipId)
    .maybeSingle();

  return !!data;
}

// ── Repost feed ───────────────────────────────────────────

/**
 * Fetch clips that have been reposted by people the current user follows.
 * Returns items newest-first (by repost time), enriched with reposter info.
 *
 * Query logic:
 *   reposts JOIN clips JOIN profiles
 *   WHERE reposts.user_id IN (
 *     SELECT following_id FROM follows WHERE follower_id = userId
 *   )
 */
export async function getRepostFeed(userId: string): Promise<RepostFeedItem[]> {
  // Step 1 — get the list of people the user follows
  const { data: followData, error: followError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (followError) throw followError;
  if (!followData || followData.length === 0) return [];

  const followingIds = followData.map((row: any) => row.following_id as string);

  // Step 2 — fetch reposts by those followed users, with clip + reposter data
  const { data, error } = await supabase
    .from('reposts')
    .select(`
      id,
      created_at,
      user_id,
      clip_id,
      reposter:profiles!user_id (
        id,
        username,
        display_name,
        avatar_url,
        is_verified,
        total_uploads,
        total_downloads,
        reputation_score,
        created_at
      ),
      clip:clips!clip_id (
        id,
        uploader_id,
        event_id,
        artist,
        festival_name,
        location,
        clip_date,
        description,
        video_url,
        thumbnail_url,
        duration_seconds,
        file_size_bytes,
        resolution,
        view_count,
        download_count,
        repost_count,
        is_approved,
        created_at,
        track_name,
        track_artist,
        track_streaming_url,
        track_id_status
      )
    `)
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!data) return [];

  // Filter out null clips or unapproved content, then map to RepostFeedItem
  return (data as any[])
    .filter((row) => row.clip && row.clip.is_approved && row.reposter)
    .map((row) => ({
      clip: row.clip as Clip,
      reposter: row.reposter as Profile,
      reposted_at: row.created_at as string,
    }));
}

// ── Get repost count for a clip ───────────────────────────

/**
 * Fetch the live repost count from the reposts table.
 * Falls back to 0 on error.
 */
export async function getRepostCount(clipId: string): Promise<number> {
  const { count, error } = await supabase
    .from('reposts')
    .select('id', { count: 'exact', head: true })
    .eq('clip_id', clipId);

  if (error) return 0;
  return count ?? 0;
}

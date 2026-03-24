// ============================================================
// Handsup — Likes Service
// Supabase-backed like/unlike for clips. Used directly by
// VideoDetailScreen and re-exported from clips.ts for backward
// compatibility.
//
// Schema: supabase/likes_schema.sql
// ============================================================

import { supabase } from './supabase';

/**
 * Like a clip. Upserts so duplicate calls are idempotent.
 * Throws if the user is not authenticated.
 */
export async function likeClip(clipId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('clip_likes')
    .upsert({ clip_id: clipId, user_id: user.id });

  if (error) throw error;
}

/**
 * Unlike a clip. No-ops gracefully if the user is not authenticated
 * or hasn't liked the clip.
 */
export async function unlikeClip(clipId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('clip_likes')
    .delete()
    .eq('clip_id', clipId)
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * Check whether a specific user has liked a clip.
 * Accepts an explicit userId so the caller can pass the already-resolved
 * user ID without an extra auth round-trip.
 *
 * Returns false for unauthenticated users without throwing.
 */
export async function hasLiked(clipId: string, userId?: string): Promise<boolean> {
  // Resolve userId: use the provided one or fall back to the session user.
  let uid = userId;
  if (!uid) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    uid = user.id;
  }

  const { data } = await supabase
    .from('clip_likes')
    .select('id')
    .eq('clip_id', clipId)
    .eq('user_id', uid)
    .maybeSingle();

  return !!data;
}

/**
 * Get the total like count for a clip.
 * Returns 0 on any error so callers can safely fall back to mock data.
 */
export async function getLikeCount(clipId: string): Promise<number> {
  const { count, error } = await supabase
    .from('clip_likes')
    .select('id', { count: 'exact', head: true })
    .eq('clip_id', clipId);

  if (error) return 0;
  return count ?? 0;
}

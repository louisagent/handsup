// ============================================================
// Handsup — Profiles Service
// User profile lookups, search, stats
// ============================================================

import { supabase } from './supabase';
import { Profile } from '../types';

// Search profiles by username or display_name
export async function searchProfiles(query: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

// Get a single profile by userId
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

// Pin a clip to the current user's profile (up to 3 pins)
export async function pinClip(clipId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data: prof } = await supabase
    .from('profiles')
    .select('pinned_clip_ids, pinned_clip_id')
    .eq('id', user.id)
    .single();
  
  // Merge old single pin with new array (backward compatibility)
  let existing: string[] = prof?.pinned_clip_ids ?? [];
  if (prof?.pinned_clip_id && !existing.includes(prof.pinned_clip_id)) {
    existing = [prof.pinned_clip_id, ...existing];
  }
  
  if (existing.includes(clipId)) return; // Already pinned
  if (existing.length >= 3) throw new Error('You can pin up to 3 clips');
  
  const updated = [...existing, clipId];
  const { error } = await supabase
    .from('profiles')
    .update({ pinned_clip_ids: updated })
    .eq('id', user.id);
  if (error) throw error;
}

// Unpin a specific clip from the current user's profile
export async function unpinClip(clipId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data: prof } = await supabase
    .from('profiles')
    .select('pinned_clip_ids')
    .eq('id', user.id)
    .single();
  
  const existing: string[] = prof?.pinned_clip_ids ?? [];
  const updated = existing.filter((id: string) => id !== clipId);
  
  const { error } = await supabase
    .from('profiles')
    .update({ pinned_clip_ids: updated })
    .eq('id', user.id);
  if (error) throw error;
}

// Get suggested users to follow — top uploaders not already followed by current user
export async function getSuggestedUsers(limit = 8): Promise<Profile[]> {
  const { data: { user } } = await supabase.auth.getUser();

  // Get IDs the user already follows
  let followingIds: string[] = [];
  if (user) {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    followingIds = follows?.map((f: { following_id: string }) => f.following_id) ?? [];
    followingIds.push(user.id); // exclude self
  }

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('total_uploads', { ascending: false })
    .limit(limit + followingIds.length + 5); // overfetch then filter

  if (!data) return [];

  return data
    .filter((p: Profile) => !followingIds.includes(p.id))
    .slice(0, limit);
}

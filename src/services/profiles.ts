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

// Pin a clip to the current user's profile
export async function pinClip(clipId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('profiles')
    .update({ pinned_clip_id: clipId })
    .eq('id', user.id);
  if (error) throw error;
}

// Unpin the current user's pinned clip
export async function unpinClip(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('profiles')
    .update({ pinned_clip_id: null })
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

// ============================================================
// Handsup — Follows Service
// Handles all follow/unfollow logic against the `follows` table
// ============================================================

import { supabase } from './supabase';
import { Profile } from '../types';

// Re-export muted-users helpers from the dedicated service so any existing
// imports from 'follows' continue to work unchanged.
export {
  getMutedUserIds as getMutedUsers,
  muteUser,
  unmuteUser,
  isUserMuted,
} from './mutedUsers';

// Follow a user
export async function followUser(userId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: userId });

  if (error) throw error;
}

// Unfollow a user
export async function unfollowUser(userId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', userId);

  if (error) throw error;
}

// Check if current user is following a specific user
export async function isFollowing(userId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', userId)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

// Get a list of profiles following `userId`
export async function getFollowers(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower:profiles!follower_id(*)')
    .eq('following_id', userId);

  if (error) throw error;
  return (data ?? []).map((row: any) => row.follower as Profile);
}

// Get a list of profiles that `userId` is following
export async function getFollowing(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('following:profiles!following_id(*)')
    .eq('follower_id', userId);

  if (error) throw error;
  return (data ?? []).map((row: any) => row.following as Profile);
}

// Get follow counts for a user
export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [followersRes, followingRes] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);

  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  };
}

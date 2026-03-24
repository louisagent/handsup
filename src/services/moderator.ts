// ============================================================
// Handsup — Moderator Service
// Role checking + moderator actions (ban, remove, etc.)
// ============================================================

import { supabase } from './supabase';

export type UserRole = 'user' | 'moderator' | 'admin';

// Get the current user's role
export async function getCurrentUserRole(): Promise<UserRole> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'user';

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return (data?.role as UserRole) ?? 'user';
}

// Check if the current user is a moderator or admin
export async function isModerator(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'moderator' || role === 'admin';
}

// Ban a user (moderator action)
export async function banUser(userId: string, reason?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('banned_users')
    .upsert({
      user_id: userId,
      banned_by: user.id,
      reason: reason ?? null,
      banned_at: new Date().toISOString(),
    });

  if (error) throw error;
}

// Unban a user
export async function unbanUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('banned_users')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

// Check if a user is banned
export async function isUserBanned(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('banned_users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

// Moderator delete a clip (bypasses uploader check)
export async function modDeleteClip(clipId: string): Promise<void> {
  const { error } = await supabase
    .from('clips')
    .delete()
    .eq('id', clipId);

  if (error) throw error;
}

// Get all banned users (for admin view)
export async function getBannedUsers(): Promise<Array<{
  id: string;
  user_id: string;
  reason: string | null;
  banned_at: string;
  user?: { username: string };
}>> {
  const { data, error } = await supabase
    .from('banned_users')
    .select('*, user:profiles!user_id(username)')
    .order('banned_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

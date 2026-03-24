// ============================================================
// Handsup — Notifications DB Service
// Reads/writes the notifications table in Supabase.
// Separate from push notifications (src/services/notifications.ts).
// ============================================================

import { supabase } from './supabase';
import { Profile, Clip } from '../types';

export type NotificationType = 'new_follower' | 'clip_liked' | 'comment' | 'clip_downloaded';

export interface DbNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  clip_id: string | null;
  read: boolean;
  created_at: string;
  // Joined
  actor?: Pick<Profile, 'username' | 'is_verified'> | null;
  clip?: Pick<Clip, 'artist' | 'festival_name'> | null;
}

// Fetch the current user's notifications, newest first
export async function getNotifications(): Promise<DbNotification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!actor_id(username, is_verified), clip:clips(artist, festival_name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

// Mark all of the current user's unread notifications as read
export async function markAllRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) throw error;
}

// Count of unread notifications for the current user
export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) return 0;
  return count ?? 0;
}

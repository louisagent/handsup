// ============================================================
// Handsup — Crew Finder Service
// ============================================================

import { supabase } from './supabase';

export interface CrewListing {
  id: string;
  user_id: string;
  event_id: string;
  bio: string | null;
  created_at: string;
  user?: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    total_uploads: number;
    xp?: number;
    level?: number;
  };
}

export interface CrewRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  event_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  from_user?: { username: string; avatar_url: string | null };
  to_user?: { username: string; avatar_url: string | null };
  event?: { name: string };
}

// Get all active crew listings for an event (excluding current user)
export async function getCrewListings(eventId: string): Promise<CrewListing[]> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('crew_listings')
    .select('*, user:profiles!user_id(username, avatar_url, is_verified, total_uploads, xp, level)')
    .eq('event_id', eventId)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Filter out current user
  return (data ?? []).filter((l: CrewListing) => l.user_id !== user?.id);
}

// Post a crew listing for an event
export async function postCrewListing(eventId: string, bio?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Safety gate: must have at least 1 upload
  const { count } = await supabase
    .from('clips')
    .select('*', { count: 'exact', head: true })
    .eq('uploader_id', user.id);

  if ((count ?? 0) < 1) {
    throw new Error('You need to upload at least one clip before you can post as looking for crew.');
  }

  const { error } = await supabase
    .from('crew_listings')
    .upsert({
      user_id: user.id,
      event_id: eventId,
      bio: bio?.trim() || null,
      active: true,
    });

  if (error) throw error;
}

// Remove/deactivate crew listing
export async function removeCrewListing(eventId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('crew_listings')
    .update({ active: false })
    .eq('user_id', user.id)
    .eq('event_id', eventId);
}

// Check if current user has an active listing for this event
export async function hasCrewListing(eventId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('crew_listings')
    .select('id')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .eq('active', true)
    .maybeSingle();

  return !!data;
}

// Send a crew request
export async function sendCrewRequest(toUserId: string, eventId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('crew_requests')
    .insert({
      from_user_id: user.id,
      to_user_id: toUserId,
      event_id: eventId,
    });

  if (error && !error.message.includes('duplicate')) throw error;
}

// Get pending crew requests sent TO the current user
export async function getIncomingCrewRequests(): Promise<CrewRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('crew_requests')
    .select('*, from_user:profiles!from_user_id(username, avatar_url), event:events(name)')
    .eq('to_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return data ?? [];
}

// Accept or decline a crew request
export async function respondToCrewRequest(requestId: string, accept: boolean): Promise<void> {
  const { error } = await supabase
    .from('crew_requests')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', requestId);

  if (error) throw error;
}

// Get accepted crew connections for current user
export async function getMyCrewConnections(): Promise<CrewRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('crew_requests')
    .select('*, from_user:profiles!from_user_id(username, avatar_url), to_user:profiles!to_user_id(username, avatar_url), event:events(name)')
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  return data ?? [];
}

// Check if current user has already sent a request to someone for an event
export async function hasSentRequest(toUserId: string, eventId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('crew_requests')
    .select('id')
    .eq('from_user_id', user.id)
    .eq('to_user_id', toUserId)
    .eq('event_id', eventId)
    .maybeSingle();

  return !!data;
}

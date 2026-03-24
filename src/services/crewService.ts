// ============================================================
// Handsup — Find Your Crew Service
// Solo festival-goer discovery and connection
// ============================================================

import { supabase } from './supabase';

// ── Types ────────────────────────────────────────────────────

export interface CrewLookup {
  id: string;
  user_id: string;
  event_id: string;
  message: string;
  active: boolean;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    display_name: string | null;
  };
}

export interface CrewConnection {
  id: string;
  user_a_id: string;
  user_b_id: string;
  event_id: string;
  status: 'pending' | 'connected';
  created_at: string;
}

// ── Functions ────────────────────────────────────────────────

/**
 * Post or update a "looking for crew" entry for an event.
 * Uses upsert on (user_id, event_id) unique constraint.
 */
export async function postLookingForCrew(
  userId: string,
  eventId: string,
  message: string,
): Promise<void> {
  const { error } = await supabase
    .from('crew_lookups')
    .upsert(
      { user_id: userId, event_id: eventId, message, active: true },
      { onConflict: 'user_id,event_id' },
    );

  if (error) throw error;
}

/**
 * Stop looking for crew — sets active to false.
 */
export async function stopLookingForCrew(
  userId: string,
  eventId: string,
): Promise<void> {
  const { error } = await supabase
    .from('crew_lookups')
    .update({ active: false })
    .eq('user_id', userId)
    .eq('event_id', eventId);

  if (error) throw error;
}

/**
 * Fetch all active lookups for an event, excluding the current user.
 * Joins the profiles table so we get display info.
 */
export async function getCrewLookups(
  eventId: string,
  currentUserId: string,
): Promise<CrewLookup[]> {
  const { data, error } = await supabase
    .from('crew_lookups')
    .select('*, profile:profiles(username, avatar_url, display_name)')
    .eq('event_id', eventId)
    .eq('active', true)
    .neq('user_id', currentUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CrewLookup[];
}

/**
 * Get the current user's own lookup for an event (if any).
 */
export async function getMyCrewLookup(
  userId: string,
  eventId: string,
): Promise<CrewLookup | null> {
  const { data } = await supabase
    .from('crew_lookups')
    .select('*')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();

  return data as CrewLookup | null;
}

/**
 * Send a crew connection request.
 * If the other person has already sent a request to you, this auto-connects both.
 */
export async function sendCrewRequest(
  userAId: string,
  userBId: string,
  eventId: string,
): Promise<{ status: 'pending' | 'connected'; connectionId: string }> {
  // Check if user_b already sent a request to user_a
  const { data: existing } = await supabase
    .from('crew_connections')
    .select('id, status')
    .eq('user_a_id', userBId)
    .eq('user_b_id', userAId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (existing) {
    // Mutual — upgrade both to connected
    await supabase
      .from('crew_connections')
      .update({ status: 'connected' })
      .eq('id', existing.id);

    // Insert the reverse connection as connected too
    const { data: inserted, error: insertError } = await supabase
      .from('crew_connections')
      .upsert(
        { user_a_id: userAId, user_b_id: userBId, event_id: eventId, status: 'connected' },
        { onConflict: 'user_a_id,user_b_id,event_id' },
      )
      .select('id')
      .single();

    if (insertError) throw insertError;
    return { status: 'connected', connectionId: inserted.id };
  }

  // No mutual — insert as pending
  const { data: inserted, error } = await supabase
    .from('crew_connections')
    .upsert(
      { user_a_id: userAId, user_b_id: userBId, event_id: eventId, status: 'pending' },
      { onConflict: 'user_a_id,user_b_id,event_id' },
    )
    .select('id')
    .single();

  if (error) throw error;
  return { status: 'pending', connectionId: inserted.id };
}

/**
 * Accept a pending crew request (called by user_b).
 */
export async function acceptCrewRequest(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from('crew_connections')
    .update({ status: 'connected' })
    .eq('id', connectionId);

  if (error) throw error;
}

/**
 * Fetch all connected crew members for the current user at an event.
 */
export async function getMyConnections(
  userId: string,
  eventId: string,
): Promise<CrewConnection[]> {
  const { data, error } = await supabase
    .from('crew_connections')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'connected')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  if (error) throw error;
  return (data ?? []) as CrewConnection[];
}

/**
 * Get the connection status between two users at an event.
 * Returns the connection row (either direction) or null.
 */
export async function getConnectionStatus(
  userAId: string,
  userBId: string,
  eventId: string,
): Promise<CrewConnection | null> {
  const { data } = await supabase
    .from('crew_connections')
    .select('*')
    .eq('event_id', eventId)
    .or(
      `and(user_a_id.eq.${userAId},user_b_id.eq.${userBId}),and(user_a_id.eq.${userBId},user_b_id.eq.${userAId})`,
    )
    .maybeSingle();

  return data as CrewConnection | null;
}

// ============================================================
// Handsup — Event Attendance Service
// "I Was There" feature
// ============================================================

import { supabase } from './supabase';

export async function markAttended(eventId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('event_attendance')
    .insert({ user_id: user.id, event_id: eventId });

  if (error && !error.message.includes('duplicate')) throw error;
}

export async function unmarkAttended(eventId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('event_attendance')
    .delete()
    .eq('user_id', user.id)
    .eq('event_id', eventId);

  if (error) throw error;
}

export async function hasAttended(eventId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('event_attendance')
    .select('id')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .maybeSingle();

  return !!data;
}

export async function getAttendeeCount(eventId: string): Promise<number> {
  const { count } = await supabase
    .from('event_attendance')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  return count ?? 0;
}

// Get all events a user has attended (for profile display)
export async function getUserAttendedEvents(userId: string): Promise<Array<{
  event_id: string;
  event: { name: string; start_date: string; location: string };
  created_at: string;
}>> {
  const { data } = await supabase
    .from('event_attendance')
    .select('event_id, created_at, event:events(name, start_date, location)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (data ?? []) as any;
}

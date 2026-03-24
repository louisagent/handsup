// ============================================================
// Handsup — Lineups Service
// Festival lineup data
// ============================================================

import { supabase } from './supabase';

export interface LineupEntry {
  id: string;
  event_id: string;
  artist_name: string;
  stage: string | null;
  set_time: string | null;
  set_end_time: string | null;
  day_label: string | null;
  order_index: number;
}

// Get all lineup entries for an event, grouped by day
export async function getEventLineup(eventId: string): Promise<LineupEntry[]> {
  const { data, error } = await supabase
    .from('lineups')
    .select('*')
    .eq('event_id', eventId)
    .order('day_label', { ascending: true })
    .order('order_index', { ascending: true })
    .order('set_time', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data ?? [];
}

// Get upcoming events where an artist is playing
export async function getArtistUpcomingGigs(artistName: string): Promise<Array<LineupEntry & {
  event: { id: string; name: string; location: string; start_date: string; city: string };
}>> {
  const today = new Date().toISOString();

  const { data } = await supabase
    .from('lineups')
    .select('*, event:events(id, name, location, start_date, city)')
    .ilike('artist_name', artistName)
    .gte('set_time', today)
    .order('set_time', { ascending: true })
    .limit(5);

  return (data ?? []) as any;
}

// Get upcoming gigs by artist name even without set_time (just event date)
export async function getArtistFestivalAppearances(artistName: string): Promise<Array<LineupEntry & {
  event: { id: string; name: string; location: string; start_date: string; city: string };
}>> {
  const { data } = await supabase
    .from('lineups')
    .select('*, event:events(id, name, location, start_date, city)')
    .ilike('artist_name', `%${artistName}%`)
    .order('created_at', { ascending: false })
    .limit(10);

  return (data ?? []) as any;
}

// Add a lineup entry (mod only — enforced by RLS)
export async function addLineupEntry(entry: {
  eventId: string;
  artistName: string;
  stage?: string;
  setTime?: string;
  setEndTime?: string;
  dayLabel?: string;
  orderIndex?: number;
}): Promise<void> {
  const { error } = await supabase
    .from('lineups')
    .insert({
      event_id: entry.eventId,
      artist_name: entry.artistName,
      stage: entry.stage ?? null,
      set_time: entry.setTime ?? null,
      set_end_time: entry.setEndTime ?? null,
      day_label: entry.dayLabel ?? null,
      order_index: entry.orderIndex ?? 0,
    });
  if (error) throw error;
}

// Delete a lineup entry
export async function deleteLineupEntry(id: string): Promise<void> {
  const { error } = await supabase.from('lineups').delete().eq('id', id);
  if (error) throw error;
}

// Bulk insert lineup from text (one artist per line, optionally "ArtistName | Stage | Day")
export async function bulkImportLineup(eventId: string, text: string): Promise<number> {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const entries = lines.map((line, i) => {
    const parts = line.split('|').map((p) => p.trim());
    return {
      event_id: eventId,
      artist_name: parts[0],
      stage: parts[1] ?? null,
      day_label: parts[2] ?? null,
      order_index: i,
    };
  });

  if (entries.length === 0) return 0;

  const { error } = await supabase.from('lineups').insert(entries);
  if (error) throw error;
  return entries.length;
}

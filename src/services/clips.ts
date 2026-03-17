// ============================================================
// Handsup — Clips Service
// All clip-related API calls. Swap mockData usage for these
// once Supabase is connected.
// ============================================================

import { supabase } from './supabase';
import { Clip, SearchParams } from '../types';

// Get recent clips for home feed
export async function getRecentClips(limit = 20): Promise<Clip[]> {
  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles(username, is_verified), event:events(name, slug)')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// Get trending clips (most downloaded in last 7 days)
export async function getTrendingClips(limit = 10): Promise<Clip[]> {
  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles(username, is_verified)')
    .eq('is_approved', true)
    .order('download_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// Search clips by artist, festival, location, or date
export async function searchClips(params: SearchParams): Promise<Clip[]> {
  let query = supabase
    .from('clips')
    .select('*, uploader:profiles(username)')
    .eq('is_approved', true);

  if (params.query) {
    // Full-text search across artist, festival, location
    query = query.textSearch(
      'artist,festival_name,location',
      params.query,
      { type: 'websearch' }
    );
  }

  if (params.artist) {
    query = query.ilike('artist', `%${params.artist}%`);
  }

  if (params.location) {
    query = query.ilike('location', `%${params.location}%`);
  }

  if (params.festival) {
    query = query.ilike('festival_name', `%${params.festival}%`);
  }

  if (params.date) {
    query = query.eq('clip_date', params.date);
  }

  const { data, error } = await query
    .order('download_count', { ascending: false })
    .limit(params.limit ?? 50)
    .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50) - 1);

  if (error) throw error;
  return data ?? [];
}

// Get all clips for a specific artist
export async function getClipsByArtist(artist: string): Promise<Clip[]> {
  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles(username)')
    .eq('is_approved', true)
    .ilike('artist', artist)
    .order('clip_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Get clips for a specific event
export async function getClipsByEvent(eventId: string): Promise<Clip[]> {
  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles(username)')
    .eq('is_approved', true)
    .eq('event_id', eventId)
    .order('download_count', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Get single clip by ID
export async function getClip(clipId: string): Promise<Clip | null> {
  const { data, error } = await supabase
    .from('clips')
    .select('*, uploader:profiles(*), event:events(*)')
    .eq('id', clipId)
    .single();

  if (error) return null;
  return data;
}

// Upload a new clip (metadata only — video file handled separately via Storage)
export async function uploadClip(clip: {
  artist: string;
  festival_name: string;
  location: string;
  clip_date: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  event_id?: string;
}): Promise<Clip> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('clips')
    .insert({ ...clip, uploader_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Record a download
export async function recordDownload(clipId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Upsert — doesn't duplicate if already downloaded
  await supabase
    .from('downloads')
    .upsert({ user_id: user.id, clip_id: clipId });
}

// Check if user has downloaded a clip
export async function hasDownloaded(clipId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('downloads')
    .select('id')
    .eq('user_id', user.id)
    .eq('clip_id', clipId)
    .maybeSingle();

  return !!data;
}

// Track a view
export async function trackView(clipId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase
    .from('clip_views')
    .insert({ clip_id: clipId, user_id: user?.id ?? null });
}

// Delete a clip (uploader only — RLS enforces this)
export async function deleteClip(clipId: string): Promise<void> {
  const { error } = await supabase
    .from('clips')
    .delete()
    .eq('id', clipId);

  if (error) throw error;
}

// Report a clip
export async function reportClip(clipId: string, reason: string, detail?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('reports')
    .insert({ clip_id: clipId, reporter_id: user?.id, reason, detail });

  if (error) throw error;
}

import { supabase } from './supabase';

export interface ArtistDiscussion {
  id: string;
  artist_slug: string;
  user_id: string;
  username: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  like_count: number;
}

export interface EventDiscussion {
  id: string;
  event_id: string;
  user_id: string;
  username: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  like_count: number;
}

export async function getArtistDiscussions(artistSlug: string): Promise<ArtistDiscussion[]> {
  const { data, error } = await supabase
    .from('artist_discussions')
    .select('*')
    .eq('artist_slug', artistSlug)
    .is('parent_id', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getDiscussionReplies(parentId: string): Promise<ArtistDiscussion[]> {
  const { data, error } = await supabase
    .from('artist_discussions')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function postArtistDiscussion(params: {
  artist_slug: string;
  body: string;
  username: string;
  parent_id?: string;
}): Promise<ArtistDiscussion> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('artist_discussions')
    .insert({
      artist_slug: params.artist_slug,
      user_id: user.id,
      username: params.username,
      body: params.body.trim(),
      parent_id: params.parent_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getEventDiscussions(eventId: string): Promise<EventDiscussion[]> {
  const { data, error } = await supabase
    .from('event_discussions')
    .select('*')
    .eq('event_id', eventId)
    .is('parent_id', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function postEventDiscussion(params: {
  event_id: string;
  body: string;
  username: string;
  parent_id?: string;
}): Promise<EventDiscussion> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('event_discussions')
    .insert({
      event_id: params.event_id,
      user_id: user.id,
      username: params.username,
      body: params.body.trim(),
      parent_id: params.parent_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

import { supabase } from './supabase';

export interface TrackIdSuggestion {
  id: string;
  clip_id: string;
  user_id: string;
  track_name: string;
  track_artist: string;
  remix_note?: string;
  streaming_url?: string;
  votes: number;
  created_at: string;
  user?: { username: string };
}

export async function getTrackIdSuggestions(clipId: string): Promise<TrackIdSuggestion[]> {
  const { data, error } = await supabase
    .from('track_id_suggestions')
    .select('*, user:profiles!user_id(username)')
    .eq('clip_id', clipId)
    .order('votes', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function submitTrackIdSuggestion(
  clipId: string,
  trackName: string,
  trackArtist: string,
  remixNote?: string,
  streamingUrl?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('track_id_suggestions').insert({
    clip_id: clipId,
    user_id: user.id,
    track_name: trackName,
    track_artist: trackArtist,
    remix_note: remixNote || null,
    streaming_url: streamingUrl || null,
    votes: 1,
  });
  if (error) throw error;
  // Update clip status to 'suggested'
  await supabase.from('clips').update({ track_id_status: 'suggested' }).eq('id', clipId);
}

export async function voteForSuggestion(suggestionId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  // Upsert vote
  await supabase.from('track_id_votes').upsert({ suggestion_id: suggestionId, user_id: user.id });
  // Increment vote count
  const { data: suggestion } = await supabase
    .from('track_id_suggestions')
    .select('votes')
    .eq('id', suggestionId)
    .single();
  if (suggestion) {
    await supabase
      .from('track_id_suggestions')
      .update({ votes: suggestion.votes + 1 })
      .eq('id', suggestionId);
  }
}

export async function confirmTrackId(clipId: string, suggestionId: string): Promise<void> {
  // Only the uploader can confirm
  const { data: suggestion } = await supabase
    .from('track_id_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single();
  if (!suggestion) return;
  await supabase.from('clips').update({
    track_name: suggestion.track_name,
    track_artist: suggestion.track_artist,
    track_streaming_url: suggestion.streaming_url,
    track_id_status: 'confirmed',
  }).eq('id', clipId);
}

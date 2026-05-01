import { supabase } from './supabase';
import type { Playlist, Clip } from '../types';

/**
 * Get all playlists for the current user
 */
export async function getPlaylists(): Promise<Playlist[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      clip_count:playlist_clips(count)
    `)
    .or(`owner_id.eq.${user.id},collaborators.cs.{${user.id}}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new playlist
 */
export async function createPlaylist(
  name: string,
  description?: string,
  isCollaborative = false
): Promise<Playlist> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      name,
      description,
      owner_id: user.id,
      is_collaborative: isCollaborative,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update playlist details
 */
export async function updatePlaylist(
  playlistId: string,
  updates: Partial<Playlist>
): Promise<Playlist> {
  const { data, error } = await supabase
    .from('playlists')
    .update(updates)
    .eq('id', playlistId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(playlistId: string): Promise<void> {
  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId);

  if (error) throw error;
}

/**
 * Get all clips in a playlist
 */
export async function getPlaylistClips(playlistId: string): Promise<Clip[]> {
  const { data, error } = await supabase
    .from('playlist_clips')
    .select(`
      clip:clips(*)
    `)
    .eq('playlist_id', playlistId)
    .order('added_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((item: any) => item.clip);
}

/**
 * Add a clip to a playlist
 */
export async function addClipToPlaylist(
  playlistId: string,
  clipId: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('playlist_clips')
    .insert({
      playlist_id: playlistId,
      clip_id: clipId,
      added_by: user.id,
    });

  if (error) {
    if (error.code === '23505') {
      throw new Error('Clip already in playlist');
    }
    throw error;
  }
}

/**
 * Remove a clip from a playlist
 */
export async function removeClipFromPlaylist(
  playlistId: string,
  clipId: string
): Promise<void> {
  const { error } = await supabase
    .from('playlist_clips')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('clip_id', clipId);

  if (error) throw error;
}

/**
 * Add a collaborator to a playlist
 */
export async function addCollaborator(
  playlistId: string,
  username: string
): Promise<void> {
  // First, get the user ID from the username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    throw new Error('User not found');
  }

  // Get the current playlist
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('collaborators')
    .eq('id', playlistId)
    .single();

  if (playlistError) throw playlistError;

  // Add the collaborator to the array
  const collaborators = playlist.collaborators || [];
  if (collaborators.includes(profile.id)) {
    throw new Error('User is already a collaborator');
  }

  const { error: updateError } = await supabase
    .from('playlists')
    .update({
      collaborators: [...collaborators, profile.id],
    })
    .eq('id', playlistId);

  if (updateError) throw updateError;
}

/**
 * Remove a collaborator from a playlist
 */
export async function removeCollaborator(
  playlistId: string,
  userId: string
): Promise<void> {
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('collaborators')
    .eq('id', playlistId)
    .single();

  if (playlistError) throw playlistError;

  const collaborators = (playlist.collaborators || []).filter(
    (id: string) => id !== userId
  );

  const { error: updateError } = await supabase
    .from('playlists')
    .update({ collaborators })
    .eq('id', playlistId);

  if (updateError) throw updateError;
}

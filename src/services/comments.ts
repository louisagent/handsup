// ============================================================
// Handsup — Comments Service
// Real comments on clips via Supabase
// ============================================================

import { supabase } from './supabase';
import { Profile } from '../types';
import { extractMentions } from '../utils/tags';

export interface Comment {
  id: string;
  clip_id: string;
  user_id: string | null;
  text: string;
  created_at: string;
  user?: Pick<Profile, 'username' | 'is_verified'> | null;
}

// Fetch all comments for a clip, with user profile joined
export async function getComments(clipId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*, user:profiles(username, is_verified)')
    .eq('clip_id', clipId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// Post a comment on a clip — requires auth
export async function postComment(clipId: string, text: string): Promise<Comment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('comments')
    .insert({ clip_id: clipId, user_id: user.id, text })
    .select('*, user:profiles(username, is_verified)')
    .single();

  if (error) throw error;

  // Fire mention notifications (non-blocking — don't fail the comment if this errors)
  try {
    const mentions = extractMentions(text);
    for (const username of mentions) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();
      if (profile && profile.id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: profile.id,
          type: 'mention',
          actor_id: user.id,
          clip_id: clipId,
        });
      }
    }
  } catch {
    // Silently ignore notification errors
  }

  return data;
}

// Delete own comment
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}

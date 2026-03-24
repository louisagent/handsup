import { supabase } from './supabase';
import { Clip } from '../types';

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  clip_count?: number;
}

// ── Fetch current user's collections ──────────────────────

export async function getMyCollections(): Promise<Collection[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ── Create a new collection ────────────────────────────────

export async function createCollection(
  name: string,
  description?: string,
  isPublic = false
): Promise<Collection> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() ?? null,
      is_public: isPublic,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Add clip to a collection ───────────────────────────────

export async function addClipToCollection(
  collectionId: string,
  clipId: string
): Promise<void> {
  const { error } = await supabase.from('collection_clips').upsert({
    collection_id: collectionId,
    clip_id: clipId,
    added_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// ── Remove clip from a collection ─────────────────────────

export async function removeClipFromCollection(
  collectionId: string,
  clipId: string
): Promise<void> {
  const { error } = await supabase
    .from('collection_clips')
    .delete()
    .eq('collection_id', collectionId)
    .eq('clip_id', clipId);
  if (error) throw error;
}

// ── Get clips in a collection ──────────────────────────────

export async function getCollectionClips(collectionId: string): Promise<Clip[]> {
  const { data, error } = await supabase
    .from('collection_clips')
    .select('clip_id, clips(*, uploader:profiles(username, is_verified))')
    .eq('collection_id', collectionId)
    .order('added_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as any[])
    .map((row) => row.clips)
    .filter(Boolean) as Clip[];
}

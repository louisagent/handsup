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

// ── Get or create "Watch Later" collection ─────────────

export async function getOrCreateWatchLaterCollection(): Promise<Collection> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Try to find existing Watch Later collection
  const { data: existing, error: fetchError } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user.id)
    .eq('name', 'Watch Later')
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing;

  // Create new Watch Later collection
  return await createCollection(
    'Watch Later',
    'Save clips to watch later',
    false
  );
}

// ── Check if clip is in Watch Later ───────────────────

export async function isInWatchLater(clipId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: collection } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', 'Watch Later')
    .maybeSingle();

  if (!collection) return false;

  const { data } = await supabase
    .from('collection_clips')
    .select('clip_id')
    .eq('collection_id', collection.id)
    .eq('clip_id', clipId)
    .maybeSingle();

  return !!data;
}

// ── Toggle clip in Watch Later ──────────────────────

export async function toggleWatchLater(clipId: string): Promise<boolean> {
  const collection = await getOrCreateWatchLaterCollection();
  const inWatchLater = await isInWatchLater(clipId);

  if (inWatchLater) {
    await removeClipFromCollection(collection.id, clipId);
    return false;
  } else {
    await addClipToCollection(collection.id, clipId);
    return true;
  }
}

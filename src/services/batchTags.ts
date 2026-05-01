// ============================================================
// Handsup — Batch Tagging Service
// Apply artist/festival/location tags to multiple clips at once
// ============================================================

import { supabase } from './supabase';

export interface BatchTagUpdate {
  artist?: string;
  festival_name?: string;
  location?: string;
  description?: string;
}

/**
 * Apply tags to multiple clips at once
 * Only updates fields that are provided (undefined fields are skipped)
 */
export async function batchUpdateClips(
  clipIds: string[],
  updates: BatchTagUpdate
): Promise<{ success: number; failed: number; errors: string[] }> {
  if (clipIds.length === 0) {
    return { success: 0, failed: 0, errors: ['No clips selected'] };
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    results.errors.push('Not authenticated');
    return results;
  }

  // Filter out undefined fields
  const cleanUpdates: any = {};
  if (updates.artist !== undefined) cleanUpdates.artist = updates.artist;
  if (updates.festival_name !== undefined) cleanUpdates.festival_name = updates.festival_name;
  if (updates.location !== undefined) cleanUpdates.location = updates.location;
  if (updates.description !== undefined) cleanUpdates.description = updates.description;

  if (Object.keys(cleanUpdates).length === 0) {
    results.errors.push('No updates provided');
    return results;
  }

  // Update each clip
  // Note: We update individually to handle permissions properly
  // (users can only update their own clips)
  for (const clipId of clipIds) {
    try {
      const { error } = await supabase
        .from('clips')
        .update(cleanUpdates)
        .eq('id', clipId)
        .eq('uploader_id', user.id); // Only update own clips

      if (error) {
        results.failed++;
        results.errors.push(`Failed to update clip ${clipId}: ${error.message}`);
      } else {
        results.success++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Error updating clip ${clipId}: ${error}`);
    }
  }

  return results;
}

/**
 * Get clips that can be batch-updated (user's own clips)
 */
export async function getUserClipsForBatchUpdate(limit = 100): Promise<any[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('clips')
    .select('id, artist, festival_name, location, description, thumbnail_url, created_at')
    .eq('uploader_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching user clips:', error);
    return [];
  }

  return data ?? [];
}

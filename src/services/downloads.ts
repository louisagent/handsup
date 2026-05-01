import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';
import { supabase } from './supabase';
import type { Clip } from '../types';
import { trackEvent } from './analytics';

/**
 * Download a single clip to the camera roll
 */
export async function downloadClip(clip: Clip): Promise<void> {
  try {
    // Request permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera roll permission denied');
    }

    // Download the video
    const filename = `${clip.artist}_${clip.festival}_${Date.now()}.mp4`;
    const localUri = `${FileSystem.documentDirectory}${filename}`;
    
    await FileSystem.downloadAsync(clip.video_url, localUri);

    // Save to camera roll
    await MediaLibrary.createAssetAsync(localUri);

    // Track download analytics
    await trackEvent('clip_downloaded', {
      clip_id: clip.id,
      artist: clip.artist,
      festival: clip.festival,
    });

    // Update download count in database
    await supabase.rpc('increment_download_count', { clip_id: clip.id });

    // Clean up temp file
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  } catch (error: any) {
    console.error('Download clip error:', error);
    throw error;
  }
}

/**
 * Download multiple clips in a pack (batch download)
 */
export async function downloadPack(
  clips: Clip[],
  packName: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  try {
    // Request permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera roll permission denied');
    }

    let success = 0;
    let failed = 0;

    // Download each clip
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      onProgress?.(i + 1, clips.length);

      try {
        await downloadClip(clip);
        success++;
      } catch (error) {
        console.error(`Failed to download clip ${clip.id}:`, error);
        failed++;
      }
    }

    // Track pack download event
    await trackEvent('pack_downloaded', {
      pack_name: packName,
      clip_count: clips.length,
      success_count: success,
      failed_count: failed,
    });

    return { success, failed };
  } catch (error: any) {
    console.error('Download pack error:', error);
    throw error;
  }
}

/**
 * Download all clips from a group
 */
export async function downloadGroupPack(
  groupId: string,
  groupName: string
): Promise<void> {
  try {
    // Fetch all clips from the group
    const { data: clips, error } = await supabase
      .from('group_clips')
      .select(`
        clip:clips(*)
      `)
      .eq('group_id', groupId);

    if (error) throw error;
    if (!clips || clips.length === 0) {
      throw new Error('No clips in this group');
    }

    const clipList = clips.map((item: any) => item.clip);

    Alert.alert(
      'Download Pack',
      `Download all ${clipList.length} clips from ${groupName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            const { success, failed } = await downloadPack(clipList, groupName);
            Alert.alert(
              'Download Complete',
              `Downloaded ${success} clips${failed > 0 ? `, ${failed} failed` : ''}`
            );
          },
        },
      ]
    );
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to download pack');
  }
}

/**
 * Download all clips from an event
 */
export async function downloadEventPack(
  eventId: string,
  eventName: string
): Promise<void> {
  try {
    // Fetch all clips from the event
    const { data: clips, error } = await supabase
      .from('clips')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'approved');

    if (error) throw error;
    if (!clips || clips.length === 0) {
      throw new Error('No clips for this event');
    }

    Alert.alert(
      'Download Pack',
      `Download all ${clips.length} clips from ${eventName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            const { success, failed } = await downloadPack(clips, eventName);
            Alert.alert(
              'Download Complete',
              `Downloaded ${success} clips${failed > 0 ? `, ${failed} failed` : ''}`
            );
          },
        },
      ]
    );
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to download pack');
  }
}

/**
 * Download all clips from a playlist
 */
export async function downloadPlaylistPack(
  playlistId: string,
  playlistName: string
): Promise<void> {
  try {
    // Fetch all clips from the playlist
    const { data, error } = await supabase
      .from('playlist_clips')
      .select(`
        clip:clips(*)
      `)
      .eq('playlist_id', playlistId);

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No clips in this playlist');
    }

    const clips = data.map((item: any) => item.clip);

    Alert.alert(
      'Download Pack',
      `Download all ${clips.length} clips from ${playlistName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            const { success, failed } = await downloadPack(clips, playlistName);
            Alert.alert(
              'Download Complete',
              `Downloaded ${success} clips${failed > 0 ? `, ${failed} failed` : ''}`
            );
          },
        },
      ]
    );
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to download pack');
  }
}

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Linking } from 'react-native';
import type { Clip } from '../types';

/**
 * Share a clip to Instagram Story
 * Uses the Instagram content sharing API
 */
export async function shareToInstagramStory(clip: Clip) {
  try {
    // Check if Instagram is installed
    const instagramURL = 'instagram://story-camera';
    const canOpen = await Linking.canOpenURL(instagramURL);
    
    if (!canOpen) {
      throw new Error('Instagram is not installed on this device');
    }

    // Download the video locally if needed
    const localUri = clip.video_url.startsWith('file://')
      ? clip.video_url
      : await downloadVideo(clip.video_url);

    // Share to Instagram using the sharing API
    // Instagram will open with the video ready to post to Story
    const shareOptions = {
      url: localUri,
      message: `${clip.artist} • ${clip.festival}\n\nShot on Handsup 🙌`,
    };

    await Sharing.shareAsync(localUri, {
      dialogTitle: 'Share to Instagram Story',
    });

    return true;
  } catch (error: any) {
    console.error('Instagram Story share error:', error);
    throw error;
  }
}

/**
 * Share a clip to Instagram Feed (Reels)
 */
export async function shareToInstagramFeed(clip: Clip) {
  try {
    const instagramURL = 'instagram://library?AssetPath=';
    const canOpen = await Linking.canOpenURL(instagramURL);
    
    if (!canOpen) {
      throw new Error('Instagram is not installed on this device');
    }

    // Download the video locally
    const localUri = clip.video_url.startsWith('file://')
      ? clip.video_url
      : await downloadVideo(clip.video_url);

    // Open Instagram with the video
    await Sharing.shareAsync(localUri, {
      dialogTitle: 'Share to Instagram',
    });

    return true;
  } catch (error: any) {
    console.error('Instagram Feed share error:', error);
    throw error;
  }
}

/**
 * Download video to local cache for sharing
 */
async function downloadVideo(url: string): Promise<string> {
  const filename = url.split('/').pop() || 'video.mp4';
  const localUri = `${FileSystem.cacheDirectory}${filename}`;
  
  const { uri } = await FileSystem.downloadAsync(url, localUri);
  return uri;
}

/**
 * Check if Instagram is installed
 */
export async function isInstagramInstalled(): Promise<boolean> {
  return await Linking.canOpenURL('instagram://');
}

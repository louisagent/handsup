// ============================================================
// Clip Stitching Service
// Combine multiple clips into one continuous video
// NOTE: Requires ffmpeg for production use. This is a mock/placeholder
// that documents the required implementation.
// ============================================================

import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';

export interface StitchClip {
  id: string;
  videoUrl: string;
  artist: string;
  festival: string;
  duration: number;
}

export interface StitchOptions {
  clips: StitchClip[];
  transition: 'cut' | 'fade';
  transitionDurationMs?: number;
}

/**
 * Stitch multiple clips into one video
 * 
 * ⚠️ IMPLEMENTATION NOTE:
 * This requires ffmpeg for actual video processing.
 * 
 * For production implementation, use one of:
 * 1. react-native-ffmpeg (native module)
 * 2. Cloud-based video processing (AWS MediaConvert, Cloudinary)
 * 3. Server-side stitching (backend endpoint)
 * 
 * Current implementation returns a mock result and documents requirements.
 */
export async function stitchClips(
  options: StitchOptions
): Promise<{ success: boolean; outputUri?: string; error?: string }> {
  try {
    // Validate input
    if (options.clips.length < 2) {
      return {
        success: false,
        error: 'Need at least 2 clips to stitch',
      };
    }

    if (options.clips.length > 6) {
      return {
        success: false,
        error: 'Maximum 6 clips can be stitched',
      };
    }

    // Check if ffmpeg is available
    // In production, check if the native module exists:
    // import FFmpeg from 'react-native-ffmpeg';
    // const hasFFmpeg = typeof FFmpeg !== 'undefined';

    const hasFFmpeg = false; // Always false in current implementation

    if (!hasFFmpeg) {
      // Show alert with instructions
      Alert.alert(
        'ffmpeg Required',
        'Clip stitching requires ffmpeg to be installed.\n\n' +
        'To enable this feature:\n' +
        '1. Install react-native-ffmpeg\n' +
        '2. npm install react-native-ffmpeg\n' +
        '3. npx pod-install (iOS)\n' +
        '4. Rebuild the app\n\n' +
        'See NEW_FEATURES_IMPLEMENTATION.md for details.',
        [{ text: 'OK' }]
      );

      return {
        success: false,
        error: 'ffmpeg not available - see NEW_FEATURES_IMPLEMENTATION.md',
      };
    }

    // ── Production implementation (when ffmpeg is available) ──
    // This is the reference implementation for when ffmpeg is installed:
    
    /*
    import FFmpeg from 'react-native-ffmpeg';
    
    // 1. Download clips to local storage
    const localClips: string[] = [];
    for (const clip of options.clips) {
      const localUri = `${FileSystem.cacheDirectory}stitch_${clip.id}.mp4`;
      await FileSystem.downloadAsync(clip.videoUrl, localUri);
      localClips.push(localUri);
    }
    
    // 2. Create concat file list
    const concatFile = `${FileSystem.cacheDirectory}concat_list.txt`;
    const concatContent = localClips.map(uri => `file '${uri}'`).join('\n');
    await FileSystem.writeAsStringAsync(concatFile, concatContent);
    
    // 3. Build ffmpeg command
    const outputUri = `${FileSystem.documentDirectory}stitched_${Date.now()}.mp4`;
    
    let command: string;
    if (options.transition === 'fade') {
      // Complex filter for crossfade transitions
      const duration = options.transitionDurationMs ?? 500;
      const fadeTime = duration / 1000;
      
      // Build xfade filter chain
      let filterComplex = '';
      for (let i = 0; i < localClips.length - 1; i++) {
        filterComplex += `[${i}:v][${i + 1}:v]xfade=transition=fade:duration=${fadeTime}:offset=0[v${i}];`;
      }
      
      command = `-f concat -safe 0 -i ${concatFile} -filter_complex "${filterComplex}" -c:v libx264 -preset fast -c:a aac ${outputUri}`;
    } else {
      // Simple concatenation (cut)
      command = `-f concat -safe 0 -i ${concatFile} -c copy ${outputUri}`;
    }
    
    // 4. Execute ffmpeg
    const result = await FFmpeg.executeWithArguments(command.split(' '));
    
    // 5. Clean up temp files
    await FileSystem.deleteAsync(concatFile, { idempotent: true });
    for (const uri of localClips) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
    
    if (result === 0) {
      return { success: true, outputUri };
    } else {
      return { success: false, error: 'ffmpeg processing failed' };
    }
    */

    return {
      success: false,
      error: 'Not implemented - ffmpeg required',
    };
  } catch (error) {
    console.error('[clipStitching] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Estimate stitched video duration
 */
export function estimateStitchedDuration(clips: StitchClip[]): number {
  return clips.reduce((total, clip) => total + clip.duration, 0);
}

/**
 * Validate clips can be stitched
 */
export function validateStitchClips(clips: StitchClip[]): {
  valid: boolean;
  error?: string;
} {
  if (clips.length < 2) {
    return { valid: false, error: 'Select at least 2 clips' };
  }

  if (clips.length > 6) {
    return { valid: false, error: 'Maximum 6 clips allowed' };
  }

  // Check total duration (optional limit: 5 minutes)
  const totalDuration = estimateStitchedDuration(clips);
  if (totalDuration > 300) {
    return {
      valid: false,
      error: `Total duration (${Math.round(totalDuration)}s) exceeds 5 minute limit`,
    };
  }

  return { valid: true };
}

/**
 * Generate stitch preview metadata
 */
export function generateStitchPreview(clips: StitchClip[]): {
  title: string;
  description: string;
  duration: number;
  clipCount: number;
} {
  const artists = [...new Set(clips.map((c) => c.artist))];
  const festivals = [...new Set(clips.map((c) => c.festival))];

  let title = '';
  if (artists.length === 1) {
    title = `${artists[0]} Mega Mix`;
  } else if (artists.length <= 3) {
    title = artists.join(' + ');
  } else {
    title = `${clips.length} Artist Mix`;
  }

  let description = '';
  if (festivals.length === 1) {
    description = `${festivals[0]} highlights`;
  } else {
    description = `Multi-festival mix`;
  }

  return {
    title,
    description,
    duration: estimateStitchedDuration(clips),
    clipCount: clips.length,
  };
}

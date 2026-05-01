// ============================================================
// Voice Comments Service
// Record and play audio replies to clips
// ============================================================

import { Audio } from 'expo-av';
import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

const MAX_RECORDING_DURATION_MS = 30000; // 30 seconds
const STORAGE_BUCKET = 'voice-comments';

export interface VoiceComment {
  id: string;
  clip_id: string;
  user_id: string;
  audio_url: string;
  duration_ms: number;
  created_at: string;
  // Joined from profiles
  username?: string;
  avatar_url?: string;
}

/**
 * Request audio recording permissions
 */
export async function requestAudioPermissions(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[voiceComments] Permission request failed:', error);
    return false;
  }
}

/**
 * Start recording a voice comment
 */
export async function startRecording(): Promise<Audio.Recording | null> {
  try {
    // Request permission
    const hasPermission = await requestAudioPermissions();
    if (!hasPermission) {
      console.warn('[voiceComments] Audio permission not granted');
      return null;
    }

    // Configure audio mode for recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    // Create recording instance
    const recording = new Audio.Recording();

    await recording.prepareToRecordAsync({
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      },
    });

    await recording.startAsync();

    // Auto-stop after max duration
    setTimeout(async () => {
      try {
        const status = await recording.getStatusAsync();
        if (status.isRecording) {
          await recording.stopAndUnloadAsync();
        }
      } catch {
        // Already stopped
      }
    }, MAX_RECORDING_DURATION_MS);

    return recording;
  } catch (error) {
    console.error('[voiceComments] Failed to start recording:', error);
    return null;
  }
}

/**
 * Stop recording and get the audio file URI
 */
export async function stopRecording(
  recording: Audio.Recording
): Promise<{ uri: string; duration: number } | null> {
  try {
    const status = await recording.getStatusAsync();
    if (!status.isRecording) {
      return null;
    }

    await recording.stopAndUnloadAsync();

    const uri = recording.getURI();
    if (!uri) {
      return null;
    }

    const duration = status.durationMillis ?? 0;

    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    return { uri, duration };
  } catch (error) {
    console.error('[voiceComments] Failed to stop recording:', error);
    return null;
  }
}

/**
 * Upload voice comment to Supabase
 */
export async function uploadVoiceComment(
  clipId: string,
  audioUri: string,
  durationMs: number
): Promise<{ success: boolean; commentId?: string; audioUrl?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false };
    }

    // Read audio file
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (!fileInfo.exists) {
      console.error('[voiceComments] Audio file not found');
      return { success: false };
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}.m4a`;
    
    // Read file as blob directly
    const response = await fetch(audioUri);
    const blob = await response.blob();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, blob, {
        contentType: 'audio/m4a',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('[voiceComments] Upload failed:', uploadError);
      return { success: false };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    const audioUrl = urlData.publicUrl;

    // Insert comment record
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        clip_id: clipId,
        user_id: user.id,
        audio_url: audioUrl,
        text: '[Voice comment]', // Placeholder text
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[voiceComments] Failed to insert comment:', insertError);
      // Clean up uploaded file
      await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
      return { success: false };
    }

    return {
      success: true,
      commentId: comment.id,
      audioUrl,
    };
  } catch (error) {
    console.error('[voiceComments] Upload error:', error);
    return { success: false };
  }
}

/**
 * Play a voice comment
 */
export async function playVoiceComment(
  audioUrl: string
): Promise<Audio.Sound | null> {
  try {
    // Configure audio mode for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: true }
    );

    return sound;
  } catch (error) {
    console.error('[voiceComments] Playback failed:', error);
    return null;
  }
}

/**
 * Get recording status (duration, metering level)
 */
export async function getRecordingStatus(
  recording: Audio.Recording
): Promise<{
  isRecording: boolean;
  durationMs: number;
  meteringLevel?: number;
} | null> {
  try {
    const status = await recording.getStatusAsync();
    if (!status.isRecording) {
      return null;
    }

    return {
      isRecording: true,
      durationMs: status.durationMillis ?? 0,
      meteringLevel: status.metering,
    };
  } catch (error) {
    console.error('[voiceComments] Failed to get status:', error);
    return null;
  }
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Fetch voice comments for a clip
 */
export async function getVoiceComments(
  clipId: string
): Promise<VoiceComment[]> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        clip_id,
        user_id,
        audio_url,
        created_at,
        profiles:user_id (
          username,
          avatar_url
        )
      `)
      .eq('clip_id', clipId)
      .not('audio_url', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[voiceComments] Failed to fetch:', error);
      return [];
    }

    return (data ?? []).map((comment: any) => ({
      id: comment.id,
      clip_id: comment.clip_id,
      user_id: comment.user_id,
      audio_url: comment.audio_url,
      duration_ms: 0, // Not stored yet - could add column
      created_at: comment.created_at,
      username: comment.profiles?.username,
      avatar_url: comment.profiles?.avatar_url,
    }));
  } catch (error) {
    console.error('[voiceComments] Fetch error:', error);
    return [];
  }
}

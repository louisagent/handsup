import { supabase } from './supabase';

export interface TrackDetectionResult {
  matched: boolean;
  track_name?: string;
  track_artist?: string;
  streaming_url?: string;
  acr_code?: number;
  acr_msg?: string;
}

/**
 * Triggers ACRCloud audio fingerprinting for a clip via the Supabase edge function.
 * Called fire-and-forget after a successful upload — does not block the UX.
 *
 * @param clipId  - The clips.id from Supabase
 * @param videoUrl - The signed/public URL of the uploaded video
 */
export async function detectTrackForClip(
  clipId: string,
  videoUrl: string
): Promise<TrackDetectionResult> {
  const { data, error } = await supabase.functions.invoke('detect-track', {
    body: { clip_id: clipId, video_url: videoUrl },
  });

  if (error) throw error;

  return data as TrackDetectionResult;
}

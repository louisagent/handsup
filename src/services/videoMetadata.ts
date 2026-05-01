// ============================================================
// Video Metadata Extraction Service
// Extract GPS, timestamp, and filename data from video files
// ============================================================

import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';

export interface VideoMetadata {
  location?: {
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  timestamp?: Date;
  suggestedArtist?: string;
  suggestedDate?: Date;
}

/**
 * Extract metadata from a video file
 * @param uri - Video file URI
 * @param filename - Video filename (used for artist name parsing)
 */
export async function extractVideoMetadata(
  uri: string,
  filename?: string
): Promise<VideoMetadata> {
  const metadata: VideoMetadata = {};

  try {
    // Request permissions
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    if (mediaStatus !== 'granted') {
      console.warn('[videoMetadata] Media library permission not granted');
      return metadata;
    }

    // Try to get asset info from media library
    const asset = await MediaLibrary.getAssetInfoAsync(uri);
    
    // Extract creation date
    if (asset.creationTime) {
      metadata.timestamp = new Date(asset.creationTime);
      metadata.suggestedDate = new Date(asset.creationTime);
    }

    // Extract GPS location if available
    if (asset.location) {
      metadata.location = {
        latitude: asset.location.latitude,
        longitude: asset.location.longitude,
      };

      // Reverse geocode to get city name
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: asset.location.latitude,
          longitude: asset.location.longitude,
        });

        if (reverseGeocode.length > 0) {
          const place = reverseGeocode[0];
          metadata.location.city = place.city || place.subregion || place.region || undefined;
          metadata.location.country = place.country || undefined;
        }
      } catch (geocodeError) {
        console.warn('[videoMetadata] Geocoding failed:', geocodeError);
      }
    }
  } catch (assetError) {
    console.warn('[videoMetadata] Failed to extract asset metadata:', assetError);
  }

  // Parse artist name from filename
  if (filename) {
    const suggestedArtist = parseArtistFromFilename(filename);
    if (suggestedArtist) {
      metadata.suggestedArtist = suggestedArtist;
    }
  }

  return metadata;
}

/**
 * Parse artist name from filename
 * Examples:
 * - "tiesto_ultra_2024.mp4" → "Tiësto"
 * - "fisher-coachella.mp4" → "Fisher"
 * - "tame_impala_laneway.mp4" → "Tame Impala"
 */
function parseArtistFromFilename(filename: string): string | null {
  try {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.(mp4|mov|avi|mkv)$/i, '');

    // Common patterns to extract artist name
    // Pattern 1: artist_festival_year (e.g., "tiesto_ultra_2024")
    // Pattern 2: artist-festival (e.g., "fisher-coachella")
    // Pattern 3: artist_festival (e.g., "tame_impala_laneway")

    // Split by common delimiters
    const parts = nameWithoutExt.split(/[-_\s]/);

    if (parts.length === 0) return null;

    // Take the first part as artist name (most common convention)
    const artistRaw = parts[0];

    // Skip if it looks like a date or generic prefix
    if (/^\d{4}$/.test(artistRaw)) return null;
    if (/^(vid|video|clip|rec|recording)/i.test(artistRaw)) return null;

    // Capitalize properly
    const artist = artistRaw
      .split(/[-_\s]/)
      .map((word) => {
        // Handle common DJ/artist name exceptions
        const lower = word.toLowerCase();
        if (['dj', 'mc'].includes(lower)) {
          return word.toUpperCase();
        }
        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    return artist.length > 0 ? artist : null;
  } catch {
    return null;
  }
}

/**
 * Get location suggestions from GPS coordinates
 */
export async function getLocationFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const reverseGeocode = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (reverseGeocode.length > 0) {
      const place = reverseGeocode[0];
      return place.city || place.subregion || place.region || null;
    }
  } catch (error) {
    console.warn('[videoMetadata] Geocoding failed:', error);
  }

  return null;
}

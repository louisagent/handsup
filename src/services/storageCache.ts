// ============================================================
// Handsup — Storage Cache Service
// Caches signed URLs from Supabase storage to reduce API calls
// ============================================================

import { supabase } from './supabase';

interface CachedUrl {
  url: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

// In-memory cache: Map<storagePath, CachedUrl>
const urlCache = new Map<string, CachedUrl>();

// TTL: 50 minutes (Supabase signed URLs expire at 60 min by default)
const TTL_MS = 50 * 60 * 1000;

/**
 * Get a signed URL for a storage path, using cache when available.
 * @param bucket - Storage bucket name (e.g., 'clips')
 * @param path - File path within the bucket (e.g., 'user-id/filename.mp4')
 * @param expiresInSeconds - URL expiration time (default: 60 minutes)
 * @returns Signed URL or null on error
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 60 * 60
): Promise<string | null> {
  const cacheKey = `${bucket}/${path}`;
  const now = Date.now();

  // Check cache first
  const cached = urlCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  // Cache miss or expired — fetch from Supabase
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  // Store in cache with TTL
  urlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: now + TTL_MS,
  });

  return data.signedUrl;
}

/**
 * Batch-fetch signed URLs for multiple paths. Uses cache where available.
 * @param bucket - Storage bucket name
 * @param paths - Array of file paths
 * @returns Array of signed URLs (null for errors)
 */
export async function batchGetSignedUrls(
  bucket: string,
  paths: string[]
): Promise<Array<string | null>> {
  return Promise.all(paths.map((path) => getSignedUrl(bucket, path)));
}

/**
 * Clear the entire signed URL cache (useful for testing or memory management).
 */
export function clearCache(): void {
  urlCache.clear();
}

/**
 * Prefetch signed URLs for upcoming content (e.g., next page of clips).
 * This runs in the background and doesn't block rendering.
 * @param bucket - Storage bucket name
 * @param paths - Array of file paths to prefetch
 */
export function prefetchSignedUrls(bucket: string, paths: string[]): void {
  // Run in background, don't await
  Promise.all(paths.map((path) => getSignedUrl(bucket, path))).catch(() => {
    // Silently ignore prefetch errors
  });
}

// ============================================================
// Handsup — Network & Cache Service
// Offline detection + AsyncStorage clip cache
// (Uses fetch-based ping — no extra packages needed)
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Clip } from '../types';

const CACHE_KEY_HOME_FEED = 'handsup_cache_home_feed';
const CACHE_KEY_TIMESTAMP = 'handsup_cache_home_feed_ts';
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

// Check if device is online by pinging a reliable endpoint
export async function isOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    await fetch('https://exp.host', { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

// Poll for network changes every 10 seconds
export function subscribeToNetwork(
  callback: (online: boolean) => void
): () => void {
  let cancelled = false;

  const check = async () => {
    if (cancelled) return;
    const online = await isOnline();
    if (!cancelled) callback(online);
  };

  const interval = setInterval(check, 10_000);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

// Save clips to offline cache
export async function cacheHomeFeed(clips: Clip[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY_HOME_FEED, JSON.stringify(clips));
    await AsyncStorage.setItem(CACHE_KEY_TIMESTAMP, String(Date.now()));
  } catch {
    // silently fail — storage errors shouldn't break the app
  }
}

// Load clips from cache (returns null if empty or stale)
export async function getCachedHomeFeed(): Promise<Clip[] | null> {
  try {
    const [data, ts] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEY_HOME_FEED),
      AsyncStorage.getItem(CACHE_KEY_TIMESTAMP),
    ]);
    if (!data) return null;
    // Enforce TTL
    if (ts && Date.now() - Number(ts) > CACHE_TTL_MS) return null;
    return JSON.parse(data) as Clip[];
  } catch {
    return null;
  }
}

// Clear offline cache
export async function clearClipCache(): Promise<void> {
  await AsyncStorage.multiRemove([CACHE_KEY_HOME_FEED, CACHE_KEY_TIMESTAMP]);
}

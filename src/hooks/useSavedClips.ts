// ============================================================
// Handsup — useSavedClips hook
// Persists bookmarked clip IDs to AsyncStorage.
// Swap the storage layer for Supabase saves table when ready.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'handsup_saved_clips';

export function useSavedClips() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const ids: string[] = JSON.parse(raw);
          setSavedIds(new Set(ids));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (ids: Set<string>) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  }, []);

  const isSaved = useCallback(
    (clipId: string) => savedIds.has(clipId),
    [savedIds]
  );

  const toggleSave = useCallback(
    async (clipId: string) => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (next.has(clipId)) {
          next.delete(clipId);
        } else {
          next.add(clipId);
        }
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return { savedIds, isSaved, toggleSave, loaded };
}

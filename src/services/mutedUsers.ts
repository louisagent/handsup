// ============================================================
// Handsup — Muted Users Service
// Stores muted user IDs in AsyncStorage so they persist
// across sessions without requiring a backend round-trip.
// Key: 'handsup_muted_users'
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const MUTED_USERS_KEY = 'handsup_muted_users';

/** Returns the full list of muted user IDs for the current device. */
export async function getMutedUserIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(MUTED_USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

/** Adds userId to the muted list (idempotent). */
export async function muteUser(userId: string): Promise<void> {
  const muted = await getMutedUserIds();
  if (!muted.includes(userId)) {
    muted.push(userId);
    await AsyncStorage.setItem(MUTED_USERS_KEY, JSON.stringify(muted));
  }
}

/** Removes userId from the muted list (idempotent). */
export async function unmuteUser(userId: string): Promise<void> {
  const muted = await getMutedUserIds();
  const updated = muted.filter((id) => id !== userId);
  await AsyncStorage.setItem(MUTED_USERS_KEY, JSON.stringify(updated));
}

/** Returns true if userId is currently muted. */
export async function isUserMuted(userId: string): Promise<boolean> {
  const muted = await getMutedUserIds();
  return muted.includes(userId);
}

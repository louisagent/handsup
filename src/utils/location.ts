// ============================================================
// Handsup — Location Utility
// Thin layer on top of expo-location + AsyncStorage.
// Uses { lat, lng } shape (distinct from the services/location
// module which uses { latitude, longitude }).
// ============================================================

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const COORDS_KEY = 'handsup_user_coords';

export interface Coords {
  lat: number;
  lng: number;
}

// ── Permission ─────────────────────────────────────────────

/**
 * Request foreground location permission.
 * Returns true if granted.
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

// ── Get current coords ─────────────────────────────────────

/**
 * Request permission, get the current GPS position, store it,
 * and return { lat, lng }. Returns null on any failure.
 */
export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const granted = await requestLocationPermission();
    if (!granted) return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const coords: Coords = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
    await storeCoords(coords);
    return coords;
  } catch {
    return null;
  }
}

// ── AsyncStorage helpers ───────────────────────────────────

/**
 * Persist coords to AsyncStorage.
 */
export async function storeCoords(coords: Coords): Promise<void> {
  try {
    await AsyncStorage.setItem(COORDS_KEY, JSON.stringify(coords));
  } catch {
    // swallow — non-critical
  }
}

/**
 * Read previously stored coords. Returns null if not set.
 */
export async function getStoredCoords(): Promise<Coords | null> {
  try {
    const raw = await AsyncStorage.getItem(COORDS_KEY);
    return raw ? (JSON.parse(raw) as Coords) : null;
  } catch {
    return null;
  }
}

// ── Haversine distance ─────────────────────────────────────

/**
 * Returns the great-circle distance between two lat/lng points in km.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_CACHE_KEY = 'handsup_user_location';

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<UserLocation | null> {
  try {
    const granted = await requestLocationPermission();
    if (!granted) return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const userLoc: UserLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(userLoc));
    return userLoc;
  } catch { return null; }
}

export async function getCachedLocation(): Promise<UserLocation | null> {
  const raw = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

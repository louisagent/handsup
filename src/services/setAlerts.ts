import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SetTime } from '../data/eventsData';

export interface SetAlertData {
  eventId: string;
  artist: string;
  stage: string;
  startTime: string;
  minutesBefore: number;
  notificationId?: string;
}

// Save a set alert locally (AsyncStorage for offline use, no Supabase needed for MVP)
export async function addSetAlert(
  eventId: string,
  set: SetTime,
  minutesBefore: number,
): Promise<void> {
  // Cancel any existing notification for this set first
  await removeSetAlert(eventId, set.artist);

  let notificationId: string | undefined;

  // Schedule the local notification
  const notifyAt = new Date(set.startTime);
  notifyAt.setMinutes(notifyAt.getMinutes() - minutesBefore);

  if (notifyAt > new Date()) {
    notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎵 ${set.artist} is up soon!`,
        body: `Starting in ${minutesBefore} minutes on ${set.stage}. Put your hands up! 🙌`,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notifyAt },
    });
  }

  const alertData: SetAlertData = {
    eventId,
    artist: set.artist,
    stage: set.stage,
    startTime: set.startTime,
    minutesBefore,
    notificationId,
  };

  const key = `handsup_alert_${eventId}_${set.artist}`;
  await AsyncStorage.setItem(key, JSON.stringify(alertData));
}

export async function removeSetAlert(eventId: string, artist: string): Promise<void> {
  const key = `handsup_alert_${eventId}_${artist}`;
  const val = await AsyncStorage.getItem(key);
  if (val) {
    try {
      const data: SetAlertData = JSON.parse(val);
      if (data.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(data.notificationId);
      }
    } catch {
      // ignore parse errors
    }
  }
  await AsyncStorage.removeItem(key);
}

export async function hasSetAlert(eventId: string, artist: string): Promise<boolean> {
  const key = `handsup_alert_${eventId}_${artist}`;
  const val = await AsyncStorage.getItem(key);
  return !!val;
}

export async function getSetAlertMinutes(
  eventId: string,
  artist: string,
): Promise<number | null> {
  const key = `handsup_alert_${eventId}_${artist}`;
  const val = await AsyncStorage.getItem(key);
  if (!val) return null;
  try {
    const data: SetAlertData = JSON.parse(val);
    return data.minutesBefore ?? null;
  } catch {
    return null;
  }
}

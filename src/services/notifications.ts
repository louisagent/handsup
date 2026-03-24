// ============================================================
// Handsup — Push Notifications Service
//
// IMPORTANT: Before push tokens will save, you must add a
// `push_token` column to the `profiles` table in Supabase.
// Run this in the Supabase SQL editor:
//
//   ALTER TABLE public.profiles
//   ADD COLUMN IF NOT EXISTS push_token text;
//
// ============================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const STORAGE_KEY_NOTIF_SOUND = 'handsup_notif_sound';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const soundPref = await AsyncStorage.getItem(STORAGE_KEY_NOTIF_SOUND);
    const shouldPlaySound = soundPref === null ? true : soundPref === 'true';
    return {
      shouldShowAlert: true,
      shouldPlaySound,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

// Register device for push notifications and save token to Supabase
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators don't support push

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync();

  // Save token to user's profile in Supabase
  // NOTE: Requires the `push_token` column to exist on the profiles table.
  // Run supabase/push_notifications_migration.sql to add it.
  const { data: { user } } = await supabase.auth.getUser();
  if (user && token) {
    try {
      await supabase
        .from('profiles')
        .update({ push_token: token.data } as any)
        .eq('id', user.id);
    } catch {
      // silently fail
    }
  }

  return token.data;
}

// Schedule a local notification (for testing)
export async function scheduleLocalNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // immediate
  });
}

// Notify followers of a new clip upload.
// In production this would run server-side (e.g. a Supabase Edge Function or cron job)
// iterating over all followers and sending Expo push notifications to their stored tokens.
// For now we fire a local notification on the uploader's device as a demo.
export async function notifyFollowersOfNewClip(
  _clipId: string,
  artist: string,
  festival: string,
  uploaderUsername: string
): Promise<void> {
  // Production: fetch followers of uploaderUsername from `follows` table and
  // send push notifications via Expo Push API to each follower's push_token.
  await scheduleLocalNotification(
    `New clip from ${artist}`,
    `@${uploaderUsername} uploaded from ${festival} 🙌`
  );
}

// ── Push notification helpers ────────────────────────────────────────────────

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default';
  badge?: number;
}

export async function sendPushToUser(
  recipientId: string,
  message: Omit<ExpoMessage, 'to'>
): Promise<void> {
  // Get recipient's push token
  const { data: profile } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', recipientId)
    .single();

  if (!(profile as any)?.push_token) return; // User hasn't enabled push notifications

  const payload: ExpoMessage = {
    to: (profile as any).push_token,
    sound: 'default',
    ...message,
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silently fail — don't block the action that triggered the notification
  }
}

export async function notifyLike(clipId: string, clipArtist: string, uploaderId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id === uploaderId) return; // Don't notify yourself

  const { data: liker } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  await sendPushToUser(uploaderId, {
    title: '❤️ New like',
    body: `@${(liker as any)?.username ?? 'Someone'} liked your ${clipArtist} clip`,
    data: { type: 'like', clipId },
  });
}

export async function notifyComment(
  clipId: string,
  clipArtist: string,
  uploaderId: string,
  commentText: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id === uploaderId) return;

  const { data: commenter } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const preview = commentText.length > 50 ? commentText.slice(0, 47) + '...' : commentText;

  await sendPushToUser(uploaderId, {
    title: '💬 New comment',
    body: `@${(commenter as any)?.username ?? 'Someone'}: ${preview}`,
    data: { type: 'comment', clipId },
  });
}

export async function notifyFollow(followedUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id === followedUserId) return;

  const { data: follower } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  await sendPushToUser(followedUserId, {
    title: '👤 New follower',
    body: `@${(follower as any)?.username ?? 'Someone'} started following you`,
    data: { type: 'follow', followerId: user.id },
  });
}

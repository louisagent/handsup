// ============================================================
// Handsup — Settings Screen
// User preferences, account management, app info
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { isModerator } from '../services/moderator';

const APP_VERSION = '1.0.0';

export const STORAGE_KEY_AUTOPLAY = 'handsup_autoplay';
export const STORAGE_KEY_DATA_SAVER = 'handsup_data_saver';
export const STORAGE_KEY_PUSH_NOTIF = 'handsup_push_notifications';
export const STORAGE_KEY_EMAIL_NOTIF = 'handsup_email_notifications';
export const STORAGE_KEY_NOTIF_SOUND = 'handsup_notif_sound';

// ── Setting row components ─────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  sublabel,
  onPress,
  chevron = true,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  chevron?: boolean;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconBox, danger && styles.iconBoxDanger]}>
        <Ionicons name={icon} size={20} color={danger ? '#EF4444' : '#8B5CF6'} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      {chevron && <Ionicons name="chevron-forward" size={18} color="#333" />}
    </TouchableOpacity>
  );
}

function ToggleRow({
  icon,
  label,
  sublabel,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color="#8B5CF6" />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#222', true: '#8B5CF6' }}
        thumbColor={value ? '#fff' : '#555'}
        ios_backgroundColor="#222"
      />
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────

export default function SettingsScreen({ navigation }: any) {
  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [notifSound, setNotifSound] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [commentsPref, setCommentsPref] = useState<'everyone' | 'following'>('everyone');
  const [autoplay, setAutoplay] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [isModUser, setIsModUser] = useState(false);

  // Load saved prefs on mount
  useEffect(() => {
    (async () => {
      const [ap, ds, pn, en, ns] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_AUTOPLAY),
        AsyncStorage.getItem(STORAGE_KEY_DATA_SAVER),
        AsyncStorage.getItem(STORAGE_KEY_PUSH_NOTIF),
        AsyncStorage.getItem(STORAGE_KEY_EMAIL_NOTIF),
        AsyncStorage.getItem(STORAGE_KEY_NOTIF_SOUND),
      ]);
      if (ap !== null) setAutoplay(ap === 'true');
      if (ds !== null) setDataSaver(ds === 'true');
      if (pn !== null) setPushNotif(pn === 'true');
      if (en !== null) setEmailNotif(en === 'true');
      if (ns !== null) setNotifSound(ns === 'true');
      isModerator().then(setIsModUser).catch(() => {});
    })();
  }, []);

  const handleAutoplay = async (val: boolean) => {
    setAutoplay(val);
    await AsyncStorage.setItem(STORAGE_KEY_AUTOPLAY, String(val));
  };

  const handleDataSaver = async (val: boolean) => {
    setDataSaver(val);
    await AsyncStorage.setItem(STORAGE_KEY_DATA_SAVER, String(val));
    if (val) {
      // When data saver is on, also disable autoplay
      setAutoplay(false);
      await AsyncStorage.setItem(STORAGE_KEY_AUTOPLAY, 'false');
    }
  };

  const handlePushNotif = async (val: boolean) => {
    setPushNotif(val);
    await AsyncStorage.setItem(STORAGE_KEY_PUSH_NOTIF, String(val));
  };

  const handleNotifSound = async (val: boolean) => {
    setNotifSound(val);
    await AsyncStorage.setItem(STORAGE_KEY_NOTIF_SOUND, String(val));
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your clips. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => Alert.alert('Contact Support', 'To delete your account, please email support@handsuplive.com'),
        },
      ]
    );
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'A password reset email will be sent to your registered address.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Email',
          onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
              await supabase.auth.resetPasswordForEmail(user.email);
              Alert.alert('Sent!', 'Check your email for the password reset link.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Account */}
      <SectionHeader title="Account" />
      <View style={styles.block}>
        <SettingRow
          icon="person-circle-outline"
          label="Edit Profile"
          onPress={() => navigation.navigate('EditProfile')}
        />
        <SettingRow
          icon="lock-closed-outline"
          label="Change Password"
          onPress={handleChangePassword}
        />
        <SettingRow
          icon="trash-outline"
          label="Delete Account"
          danger
          chevron={false}
          onPress={handleDeleteAccount}
        />
      </View>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      <View style={styles.block}>
        <ToggleRow
          icon="notifications-outline"
          label="Push Notifications"
          sublabel="Get notified about likes, comments & follows"
          value={pushNotif}
          onValueChange={handlePushNotif}
        />
        <ToggleRow
          icon="volume-high-outline"
          label="Notification Sound"
          sublabel="Play a sound with push notifications"
          value={notifSound}
          onValueChange={handleNotifSound}
        />
        <ToggleRow
          icon="mail-outline"
          label="Email Notifications"
          sublabel="Weekly digest and account updates"
          value={emailNotif}
          onValueChange={setEmailNotif}
        />
      </View>

      {/* Privacy */}
      <SectionHeader title="Privacy" />
      <View style={styles.block}>
        <ToggleRow
          icon="eye-off-outline"
          label="Private Account"
          sublabel="Only approved followers can see your clips"
          value={privateAccount}
          onValueChange={setPrivateAccount}
        />
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => {
            Alert.alert(
              'Who can comment',
              'Select who can comment on your clips.',
              [
                { text: 'Everyone', onPress: () => setCommentsPref('everyone') },
                { text: 'Following only', onPress: () => setCommentsPref('following') },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }}
          activeOpacity={0.75}
        >
          <View style={styles.iconBox}>
            <Ionicons name="chatbubble-outline" size={20} color="#8B5CF6" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Who can comment</Text>
            <Text style={styles.rowSublabel}>
              {commentsPref === 'everyone' ? 'Everyone' : 'Following only'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <SectionHeader title="Content" />
      <View style={styles.block}>
        <ToggleRow
          icon="play-circle-outline"
          label="Autoplay Videos"
          sublabel="Videos play automatically when opened"
          value={autoplay && !dataSaver}
          onValueChange={handleAutoplay}
        />
        <ToggleRow
          icon="cellular-outline"
          label="Data Saver Mode"
          sublabel="Reduces video quality, disables autoplay"
          value={dataSaver}
          onValueChange={handleDataSaver}
        />
      </View>

      {/* About */}
      <SectionHeader title="About" />
      <View style={styles.block}>
        <View style={styles.settingRow}>
          <View style={styles.iconBox}>
            <Ionicons name="information-circle-outline" size={20} color="#8B5CF6" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>App Version</Text>
            <Text style={styles.rowSublabel}>{APP_VERSION}</Text>
          </View>
        </View>
        <SettingRow
          icon="document-text-outline"
          label="Terms of Service"
          onPress={() => navigation.navigate('WebView', { url: 'https://handsuplive.com/terms', title: 'Terms of Service' })}
        />
        <SettingRow
          icon="shield-outline"
          label="Privacy Policy"
          onPress={() => navigation.navigate('WebView', { url: 'https://handsuplive.com/privacy', title: 'Privacy Policy' })}
        />
        <SettingRow
          icon="musical-notes-outline"
          label="DMCA / Copyright"
          onPress={() => navigation.navigate('WebView', { url: 'https://handsuplive.com/dmca', title: 'Copyright' })}
        />
      </View>

      {/* Moderation - only shown to moderators */}
      {isModUser && (
        <>
          <SectionHeader title="Moderation" />
          <View style={[styles.block, styles.modBlock]}>
            <SettingRow
              icon="shield-checkmark-outline"
              label="Moderation Queue"
              sublabel="Review reports and banned users"
              onPress={() => navigation.navigate('Admin')}
            />
          </View>
        </>
      )}

      {/* Danger Zone */}
      <SectionHeader title="Danger Zone" />
      <View style={[styles.block, styles.dangerBlock]}>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { paddingBottom: 60 },

  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  block: {
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  dangerBlock: {
    borderColor: '#EF444422',
    backgroundColor: '#0d0808',
  },
  modBlock: {
    borderColor: '#EF444422',
    backgroundColor: '#0d0808',
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDanger: {
    backgroundColor: '#1c0808',
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, color: '#fff', fontWeight: '500' },
  rowLabelDanger: { color: '#EF4444' },
  rowSublabel: { fontSize: 12, color: '#444', marginTop: 2 },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  signOutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
});

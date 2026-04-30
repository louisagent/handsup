// ============================================================
// Handsup — Edit Profile Screen
// Black bg, purple accents, dark input fields
// ============================================================

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { getCurrentProfile, updateProfile } from '../services/auth';
import { supabase } from '../services/supabase';
import { Profile } from '../types';

const HOME_CITY_KEY = 'handsup_home_city';

// ── Helpers ────────────────────────────────────────────────

function getInitials(name?: string, username?: string): string {
  const src = name || username || '?';
  const parts = src.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

// ── Screen ─────────────────────────────────────────────────

export default function EditProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [supportUrl, setSupportUrl] = useState('');

  // Username availability check
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, city] = await Promise.all([
          getCurrentProfile(),
          AsyncStorage.getItem(HOME_CITY_KEY).catch(() => null),
        ]);
        if (p) {
          setProfile(p);
          setDisplayName(p.display_name ?? '');
          setUsername(p.username ?? '');
          setBio(p.bio ?? '');
          setAvatarUrl(p.avatar_url ?? null);
          setSupportUrl(p.support_url ?? '');
        }
        setHomeCity(city ?? '');
      } catch {
        Alert.alert('Error', 'Could not load profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Debounced username availability check
  useEffect(() => {
    // Clear previous timeout
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    // Skip check if username is empty or unchanged from profile
    if (!username || username === profile?.username) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }

    // Debounce: wait 500ms after user stops typing
    setCheckingUsername(true);
    usernameCheckTimeout.current = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUsernameAvailable(null);
          setCheckingUsername(false);
          return;
        }

        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('username', username.toLowerCase())
          .neq('id', user.id);

        setUsernameAvailable(count === 0);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => {
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current);
      }
    };
  }, [username, profile?.username]);

  // ── Shared upload logic ───────────────────────────────────

  const uploadAsset = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = uri.split('.').pop() ?? 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          upsert: true,
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(urlData.publicUrl);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Could not upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const launchLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadAsset(result.assets[0].uri);
  };

  const launchCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadAsset(result.assets[0].uri);
  };

  const handlePickAvatar = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) launchCamera();
          else if (buttonIndex === 2) launchLibrary();
        }
      );
    } else {
      Alert.alert(
        'Change Photo',
        'Choose a source',
        [
          { text: 'Take Photo', onPress: launchCamera },
          { text: 'Choose from Library', onPress: launchLibrary },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Required', 'Display name cannot be empty.');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Required', 'Username cannot be empty.');
      return;
    }
    if (usernameAvailable === false) {
      Alert.alert('Username Taken', 'This username is already taken. Please choose another.');
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        updateProfile({
          display_name: displayName.trim(),
          username: username.trim().toLowerCase(),
          bio: bio.trim() || undefined,
          avatar_url: avatarUrl ?? undefined,
          support_url: supportUrl.trim() || null,
        }),
        AsyncStorage.setItem(HOME_CITY_KEY, homeCity.trim()),
      ]);
      Alert.alert('Profile updated!', '', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const initials = getInitials(displayName, username);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Avatar ── */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <TouchableOpacity
          style={styles.changePhotoBtn}
          onPress={handlePickAvatar}
          disabled={uploadingAvatar}
          activeOpacity={0.8}
        >
          {uploadingAvatar ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={16} color="#8B5CF6" />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </>
          )}
        </TouchableOpacity>
        {avatarUrl && (
          <Text style={styles.avatarUrlNote} numberOfLines={1}>
            ✓ Photo uploaded
          </Text>
        )}
      </View>

      {/* ── Form ── */}
      <View style={styles.form}>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor="#444"
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Username</Text>
          <View style={styles.usernameRow}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={[styles.input, styles.usernameInput]}
              value={username}
              onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
              placeholder="username"
              placeholderTextColor="#444"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {checkingUsername && (
              <ActivityIndicator size="small" color="#8B5CF6" style={styles.usernameIndicator} />
            )}
            {!checkingUsername && usernameAvailable === true && (
              <Text style={[styles.usernameIndicator, styles.usernameAvailableIcon]}>✓</Text>
            )}
            {!checkingUsername && usernameAvailable === false && (
              <Text style={[styles.usernameIndicator, styles.usernameTakenIcon]}>✕</Text>
            )}
          </View>
          {usernameAvailable === true && (
            <Text style={styles.usernameAvailableText}>✓ Username available</Text>
          )}
          {usernameAvailable === false && (
            <Text style={styles.usernameTakenText}>✕ Username already taken</Text>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.bioHeader}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <Text style={styles.charCount}>{bio.length}/160</Text>
          </View>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, 160))}
            placeholder="Tell the crew about yourself…"
            placeholderTextColor="#444"
            multiline
            maxLength={160}
            returnKeyType="done"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Home City</Text>
          <TextInput
            style={styles.input}
            value={homeCity}
            onChangeText={setHomeCity}
            placeholder="e.g. Melbourne, London"
            placeholderTextColor="#444"
            autoCapitalize="words"
            returnKeyType="done"
          />
          <Text style={styles.fieldHint}>📍 Used as fallback when GPS location isn't available</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Support Link (Ko-fi, PayPal, etc.)</Text>
          <TextInput
            style={styles.input}
            value={supportUrl}
            onChangeText={setSupportUrl}
            placeholder="https://ko-fi.com/yourname"
            placeholderTextColor="#444"
            autoCapitalize="none"
            keyboardType="url"
            returnKeyType="done"
          />
          <Text style={styles.fieldHint}>☕ Fans can tip you directly from your profile</Text>
        </View>

      </View>

      {/* ── Save Button ── */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save Changes</Text>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 60,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#8B5CF6',
    marginBottom: 14,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarInitials: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
  },
  changePhotoText: {
    color: '#8B5CF6',
    fontWeight: '700',
    fontSize: 14,
  },
  avatarUrlNote: {
    marginTop: 8,
    fontSize: 12,
    color: '#4ade80',
    fontWeight: '600',
  },

  // Form
  form: {
    gap: 20,
    marginBottom: 32,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    paddingLeft: 14,
  },
  atSign: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 2,
  },
  usernameInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingLeft: 0,
  },
  usernameIndicator: {
    marginRight: 14,
  },
  usernameAvailableIcon: {
    color: '#4ade80',
    fontSize: 18,
    fontWeight: '700',
  },
  usernameTakenIcon: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '700',
  },
  usernameAvailableText: {
    fontSize: 12,
    color: '#4ade80',
    marginTop: 5,
    fontWeight: '600',
  },
  usernameTakenText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 5,
    fontWeight: '600',
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 11,
    color: '#444',
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 11,
    color: '#444',
    marginTop: 5,
    fontStyle: 'italic',
  },
  bioInput: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  // Save
  saveBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnDisabled: {
    backgroundColor: '#4a2a8a',
    shadowOpacity: 0,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: -0.2,
  },
});

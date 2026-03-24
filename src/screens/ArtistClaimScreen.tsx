// ============================================================
// Handsup — Artist Claim Screen
// Artists claim their page, add bio + social links
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { submitArtistClaim } from '../services/artistClaim';

export default function ArtistClaimScreen({ route, navigation }: any) {
  const { artistName } = route.params as { artistName: string };

  const [bio, setBio] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [soundcloudUrl, setSoundcloudUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitArtistClaim({
        artistName,
        bio: bio.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        spotifyUrl: spotifyUrl.trim() || undefined,
        soundcloudUrl: soundcloudUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
      });
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="checkmark-circle" size={64} color="#8B5CF6" />
        <Text style={styles.successTitle}>Claim Submitted! 🎤</Text>
        <Text style={styles.successSub}>
          We'll review your claim for <Text style={{ color: '#8B5CF6', fontWeight: '700' }}>{artistName}</Text> and get back to you within 1–3 days.
        </Text>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Ionicons name="shield-checkmark-outline" size={48} color="#8B5CF6" />
          <Text style={styles.title}>Claim Your Artist Page</Text>
          <Text style={styles.subtitle}>
            Verify that you are <Text style={{ color: '#8B5CF6', fontWeight: '700' }}>{artistName}</Text> and get a verified badge on your page.
            Add your bio and social links to help fans connect with you.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Bio (optional)</Text>
            <Text style={styles.hint}>Tell fans a bit about yourself.</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="e.g. DJ based in Melbourne. Playing hard techno and industrial since 2015..."
              placeholderTextColor="#333"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
            />
            <Text style={styles.charCount}>{bio.length}/300</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Instagram URL (optional)</Text>
            <TextInput
              style={styles.input}
              value={instagramUrl}
              onChangeText={setInstagramUrl}
              placeholder="https://instagram.com/yourname"
              placeholderTextColor="#333"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Spotify URL (optional)</Text>
            <TextInput
              style={styles.input}
              value={spotifyUrl}
              onChangeText={setSpotifyUrl}
              placeholder="https://open.spotify.com/artist/..."
              placeholderTextColor="#333"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>SoundCloud URL (optional)</Text>
            <TextInput
              style={styles.input}
              value={soundcloudUrl}
              onChangeText={setSoundcloudUrl}
              placeholder="https://soundcloud.com/yourname"
              placeholderTextColor="#333"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Website (optional)</Text>
            <TextInput
              style={styles.input}
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              placeholder="https://yourwebsite.com"
              placeholderTextColor="#333"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color="#555" />
          <Text style={styles.infoText}>
            Claims are reviewed by the Handsup team. We may ask for proof of identity before approving.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Claim</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 60 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },

  successTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  successSub: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
  doneBtn: {
    marginTop: 8,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },

  form: { gap: 20 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '700', color: '#fff' },
  hint: { fontSize: 12, color: '#555' },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    color: '#333',
    textAlign: 'right',
    marginTop: 2,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 14,
    marginTop: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
  },
  submitBtnDisabled: { backgroundColor: '#3b2a6e' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

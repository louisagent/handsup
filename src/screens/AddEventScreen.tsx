// ============================================================
// Handsup — Add Event Screen
// Form to add a new festival/event to the events table
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createEvent } from '../services/events';

/**
 * Generates a random 6-character alphanumeric invite code (uppercase).
 * e.g. "XK93PQ"
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const GENRE_OPTIONS = [
  'Rock',
  'Electronic',
  'Hip Hop',
  'Indie',
  'Alternative',
  'Dance',
  'Pop',
  'All genres',
];

export default function AddEventScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Australia');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [generatedInviteCode, setGeneratedInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdEventName, setCreatedEventName] = useState('');

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const validateDate = (val: string) => /^\d{4}-\d{2}-\d{2}$/.test(val);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter an event name.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Required', 'Please enter a location/venue.');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Required', 'Please enter a city.');
      return;
    }
    if (!startDate.trim()) {
      Alert.alert('Required', 'Please enter a start date (YYYY-MM-DD).');
      return;
    }
    if (!validateDate(startDate)) {
      Alert.alert('Invalid Date', 'Start date must be in YYYY-MM-DD format.');
      return;
    }
    if (endDate && !validateDate(endDate)) {
      Alert.alert('Invalid Date', 'End date must be in YYYY-MM-DD format.');
      return;
    }

    setLoading(true);
    try {
      const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      // Generate invite code on the client so we can show it in the success screen
      const inviteCode = isPrivate ? generateInviteCode() : undefined;
      await createEvent({
        name: name.trim(),
        slug,
        location: location.trim(),
        city: city.trim(),
        country: country.trim() || 'Australia',
        start_date: startDate.trim(),
        end_date: endDate.trim() || undefined,
        description: description.trim() || undefined,
        genre_tags: selectedGenres.length > 0 ? selectedGenres : undefined,
        website_url: websiteUrl.trim() || undefined,
        is_private: isPrivate,
        invite_code: inviteCode,
      });
      setCreatedEventName(name.trim());
      if (inviteCode) setGeneratedInviteCode(inviteCode);
      setSuccess(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not add event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>{generatedInviteCode ? '🔒' : '🎪'}</Text>
        <Text style={styles.successTitle}>Event added!</Text>
        <Text style={styles.successSubtitle}>{createdEventName} is now on Handsup</Text>

        {/* Show invite code for private events */}
        {generatedInviteCode ? (
          <View style={styles.inviteCodeBox}>
            <Text style={styles.inviteCodeLabel}>🔒 Private Event — Invite Code</Text>
            <Text style={styles.inviteCodeValue}>{generatedInviteCode}</Text>
            <Text style={styles.inviteCodeHint}>Share this code with people you want to invite. They can enter it via "Join Private Event" in the Events tab.</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.uploadClipBtn}
          onPress={() =>
            navigation.navigate('Upload', { festivalName: createdEventName })
          }
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.uploadClipGradient}
          >
            <Ionicons name="videocam-outline" size={20} color="#fff" />
            <Text style={styles.uploadClipText}>Upload a clip from this event</Text>
          </LinearGradient>
        </TouchableOpacity>

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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Add Event</Text>
        <Text style={styles.pageSubtitle}>Add a festival or event to the Handsup community</Text>

        {/* Event Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Event Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Splendour in the Grass 2025"
            placeholderTextColor="#444"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Location / Venue */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Location / Venue <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. North Byron Parklands"
            placeholderTextColor="#444"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* City */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>City <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Byron Bay"
            placeholderTextColor="#444"
            value={city}
            onChangeText={setCity}
          />
        </View>

        {/* Country */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            placeholder="Australia"
            placeholderTextColor="#444"
            value={country}
            onChangeText={setCountry}
          />
        </View>

        {/* Start Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Start Date <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#444"
            value={startDate}
            onChangeText={setStartDate}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        {/* End Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>End Date <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#444"
            value={endDate}
            onChangeText={setEndDate}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell us about this event..."
            placeholderTextColor="#444"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Genre Tags */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Genre Tags <Text style={styles.optional}>(optional)</Text></Text>
          <View style={styles.genreRow}>
            {GENRE_OPTIONS.map((genre) => {
              const selected = selectedGenres.includes(genre);
              return (
                <TouchableOpacity
                  key={genre}
                  style={[styles.genreChip, selected && styles.genreChipActive]}
                  onPress={() => toggleGenre(genre)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.genreChipText, selected && styles.genreChipTextActive]}>
                    {genre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Private Event Toggle */}
        <View style={styles.fieldGroup}>
          <View style={styles.privateRow}>
            <View style={styles.privateInfo}>
              <Text style={styles.label}>Private Event 🔒</Text>
              {isPrivate && (
                <Text style={styles.privateNote}>
                  Only people with the invite code can see this event and upload to it
                </Text>
              )}
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: '#2a2a2a', true: '#7C3AED' }}
              thumbColor={isPrivate ? '#8B5CF6' : '#555'}
            />
          </View>
        </View>

        {/* Website URL */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Website URL <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="https://..."
            placeholderTextColor="#444"
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.submitText}>Add Event</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 60 },

  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 28,
    lineHeight: 20,
  },

  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: '#aaa', marginBottom: 7 },
  required: { color: '#EF4444' },
  optional: { color: '#444', fontWeight: '400' },

  input: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#222',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  genreChipActive: {
    backgroundColor: '#1a1228',
    borderColor: '#8B5CF6',
  },
  genreChipText: { color: '#555', fontSize: 13, fontWeight: '600' },
  genreChipTextActive: { color: '#8B5CF6' },

  privateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222',
  },
  privateInfo: { flex: 1, marginRight: 12 },
  privateNote: {
    fontSize: 12,
    color: '#8B5CF6',
    marginTop: 4,
    lineHeight: 17,
  },
  submitBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Success state
  successContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 40,
    textAlign: 'center',
  },
  uploadClipBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  uploadClipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  uploadClipText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  doneBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
  },
  doneBtnText: { color: '#aaa', fontWeight: '600', fontSize: 15 },

  // Invite code box (success screen — private events only)
  inviteCodeBox: {
    width: '100%',
    backgroundColor: '#0d0d1a',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a1a4a',
    marginBottom: 24,
    alignItems: 'center',
  },
  inviteCodeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  inviteCodeValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#C4B5FD',
    letterSpacing: 6,
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  inviteCodeHint: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    lineHeight: 18,
  },
});

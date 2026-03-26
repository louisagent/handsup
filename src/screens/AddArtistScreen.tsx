import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createArtist } from '../services/artists';

const GENRE_OPTIONS = [
  'Rock', 'Electronic', 'Hip Hop', 'Indie', 'Alternative', 'Dance',
  'Pop', 'Techno', 'House', 'Drum & Bass', 'Jungle', 'Disco',
  'Funk', 'Soul', 'All genres',
];

export default function AddArtistScreen({ route, navigation }: any) {
  const prefill = route.params?.artistName as string | undefined;

  const [name, setName] = useState(prefill ?? '');
  const [bio, setBio] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefill) setName(prefill);
  }, [prefill]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter an artist name.');
      return;
    }
    setSaving(true);
    try {
      await createArtist({
        name: name.trim(),
        bio: bio.trim() || undefined,
        genre_tags: selectedGenres,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create artist. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🎤</Text>
            </View>
            <Text style={styles.heroTitle}>Add Artist</Text>
            <Text style={styles.heroSub}>Create a profile for an artist on Handsup</Text>
          </View>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Artist Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Fred Again.."
              placeholderTextColor="#555"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Genre Pills */}
          <View style={styles.field}>
            <Text style={styles.label}>Genres</Text>
            <View style={styles.genreGrid}>
              {GENRE_OPTIONS.map((genre) => {
                const active = selectedGenres.includes(genre);
                return (
                  <TouchableOpacity
                    key={genre}
                    style={[styles.genrePill, active && styles.genrePillActive]}
                    onPress={() => toggleGenre(genre)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.genrePillText, active && styles.genrePillTextActive]}>
                      {genre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Bio */}
          <View style={styles.field}>
            <Text style={styles.label}>Bio <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Tell us about this artist..."
              placeholderTextColor="#555"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Add Artist</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: 60 },
  hero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1a1228',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconEmoji: { fontSize: 32 },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  field: {
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optional: {
    color: '#555',
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genrePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    backgroundColor: '#111',
  },
  genrePillActive: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: '#8B5CF6',
  },
  genrePillText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  genrePillTextActive: {
    color: '#8B5CF6',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 15,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

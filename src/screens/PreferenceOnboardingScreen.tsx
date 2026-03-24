// ============================================================
// Handsup — Preference Onboarding Screen
// Genre + festival preferences for new users
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../services/supabase';

const GENRES = [
  { key: 'electronic', label: 'Electronic', emoji: '⚡' },
  { key: 'techno', label: 'Techno', emoji: '🔊' },
  { key: 'house', label: 'House', emoji: '🏠' },
  { key: 'dnb', label: 'Drum & Bass', emoji: '🥁' },
  { key: 'hiphop', label: 'Hip Hop', emoji: '🎤' },
  { key: 'indie', label: 'Indie', emoji: '🎸' },
  { key: 'rock', label: 'Rock', emoji: '🤘' },
  { key: 'pop', label: 'Pop', emoji: '🌟' },
  { key: 'reggae', label: 'Reggae', emoji: '🌴' },
  { key: 'metal', label: 'Metal', emoji: '⚔️' },
  { key: 'jazz', label: 'Jazz', emoji: '🎷' },
  { key: 'rnb', label: 'R&B', emoji: '💜' },
];

interface Props {
  onDone: () => void;
}

export default function PreferenceOnboardingScreen({ onDone }: Props) {
  const [step, setStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [festivalSearch, setFestivalSearch] = useState('');
  const [festivalResults, setFestivalResults] = useState<{ id: string; name: string; location: string }[]>([]);
  const [selectedFestivals, setSelectedFestivals] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Search festivals from Supabase
  useEffect(() => {
    if (festivalSearch.length < 2) {
      setFestivalResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('events')
        .select('id, name, location')
        .ilike('name', `%${festivalSearch}%`)
        .limit(8);
      setFestivalResults(data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [festivalSearch]);

  const toggleGenre = (key: string) => {
    setSelectedGenres((prev) =>
      prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key]
    );
  };

  const toggleFestival = (festival: { id: string; name: string }) => {
    setSelectedFestivals((prev) =>
      prev.find((f) => f.id === festival.id)
        ? prev.filter((f) => f.id !== festival.id)
        : [...prev, festival]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Save genre preferences
        await supabase
          .from('profiles')
          .update({
            genre_preferences: selectedGenres,
            onboarding_completed: true,
          })
          .eq('id', user.id);

        // Mark festival attendance for selected festivals
        if (selectedFestivals.length > 0) {
          const attendanceRows = selectedFestivals.map((f) => ({
            user_id: user.id,
            event_id: f.id,
          }));
          await Promise.resolve(
            supabase.from('event_attendance').upsert(attendanceRows)
          ).catch(() => {}); // silently fail if table not ready
        }
      }
    } catch {
      // silently fail — don't block the user
    } finally {
      setSaving(false);
      onDone();
    }
  };

  const progressPct = step / 3;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0d0020', '#000']} style={StyleSheet.absoluteFillObject} />

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct * 100}%` as any }]} />
      </View>

      {/* Step 1: Genres */}
      {step === 1 && (
        <ScrollView contentContainerStyle={styles.stepContent}>
          <Text style={styles.stepNum}>1 of 3</Text>
          <Text style={styles.stepTitle}>What genres do you love?</Text>
          <Text style={styles.stepSub}>We'll personalise your feed based on your taste</Text>
          <View style={styles.genreGrid}>
            {GENRES.map((g) => {
              const selected = selectedGenres.includes(g.key);
              return (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.genreChip, selected && styles.genreChipSelected]}
                  onPress={() => toggleGenre(g.key)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.genreEmoji}>{g.emoji}</Text>
                  <Text style={[styles.genreLabel, selected && styles.genreLabelSelected]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Step 2: Festivals */}
      {step === 2 && (
        <ScrollView contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepNum}>2 of 3</Text>
          <Text style={styles.stepTitle}>Any festivals you've been to?</Text>
          <Text style={styles.stepSub}>We'll show you clips from events you've attended</Text>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#555" />
            <TextInput
              style={styles.searchInput}
              value={festivalSearch}
              onChangeText={setFestivalSearch}
              placeholder="Search festivals..."
              placeholderTextColor="#333"
            />
          </View>

          {festivalResults.map((f) => {
            const selected = selectedFestivals.some((s) => s.id === f.id);
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.festivalRow, selected && styles.festivalRowSelected]}
                onPress={() => toggleFestival(f)}
                activeOpacity={0.8}
              >
                <View style={styles.festivalInfo}>
                  <Text style={styles.festivalName}>{f.name}</Text>
                  <Text style={styles.festivalLocation}>{f.location}</Text>
                </View>
                {selected && <Ionicons name="checkmark-circle" size={22} color="#8B5CF6" />}
              </TouchableOpacity>
            );
          })}

          {selectedFestivals.length > 0 && (
            <View style={styles.selectedSection}>
              <Text style={styles.selectedTitle}>Selected ({selectedFestivals.length})</Text>
              {selectedFestivals.map((f) => (
                <View key={f.id} style={styles.selectedPill}>
                  <Text style={styles.selectedPillText}>{f.name}</Text>
                  <TouchableOpacity onPress={() => toggleFestival(f)}>
                    <Ionicons name="close-circle" size={18} color="#8B5CF6" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <View style={styles.doneStep}>
          <Text style={styles.doneEmoji}>🎪</Text>
          <Text style={styles.doneTitle}>You're all set!</Text>
          <Text style={styles.doneSub}>
            Your feed is personalised.{'\n'}
            {selectedGenres.length > 0 && `${selectedGenres.length} genres selected. `}
            {selectedFestivals.length > 0 && `${selectedFestivals.length} festivals added.`}
          </Text>
          <View style={styles.doneGenres}>
            {selectedGenres.slice(0, 6).map((key) => {
              const g = GENRES.find((genre) => genre.key === key);
              return g ? (
                <View key={key} style={styles.doneGenreChip}>
                  <Text style={styles.doneGenreText}>{g.emoji} {g.label}</Text>
                </View>
              ) : null;
            })}
          </View>
        </View>
      )}

      {/* Bottom navigation */}
      <View style={styles.bottomBar}>
        {step > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => s - 1)} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={20} color="#555" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        {step < 3 && (
          <TouchableOpacity
            style={[styles.nextBtn, step === 1 && selectedGenres.length === 0 && styles.nextBtnDisabled]}
            onPress={() => setStep((s) => s + 1)}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>
              {step === 1 && selectedGenres.length === 0 ? 'Skip' : 'Next'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}
        {step === 3 && (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={handleFinish}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.doneBtnText}>Let's go 🙌</Text>
            )}
          </TouchableOpacity>
        )}
        {step === 1 && selectedGenres.length === 0 && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => {
              setSaving(false);
              onDone();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  progressTrack: {
    height: 3,
    backgroundColor: '#111',
    marginTop: 60,
  },
  progressFill: {
    height: 3,
    backgroundColor: '#8B5CF6',
  },

  stepContent: { padding: 24, paddingBottom: 120 },
  stepNum: { fontSize: 12, color: '#555', fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  stepTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8, letterSpacing: -0.5 },
  stepSub: { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 28 },

  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#222',
    backgroundColor: '#111',
  },
  genreChipSelected: {
    backgroundColor: '#1a1228',
    borderColor: '#8B5CF6',
  },
  genreEmoji: { fontSize: 18 },
  genreLabel: { fontSize: 14, fontWeight: '600', color: '#666' },
  genreLabelSelected: { color: '#fff' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },

  festivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 14,
    marginBottom: 8,
  },
  festivalRowSelected: { borderColor: '#8B5CF6', backgroundColor: '#1a1228' },
  festivalInfo: { flex: 1 },
  festivalName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  festivalLocation: { fontSize: 12, color: '#555', marginTop: 2 },

  selectedSection: { marginTop: 20, gap: 8 },
  selectedTitle: { fontSize: 12, fontWeight: '700', color: '#8B5CF6', letterSpacing: 1 },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1228',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#8B5CF633',
  },
  selectedPillText: { fontSize: 14, color: '#A78BFA', fontWeight: '600' },

  doneStep: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  doneEmoji: { fontSize: 64 },
  doneTitle: { fontSize: 32, fontWeight: '800', color: '#fff' },
  doneSub: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
  doneGenres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  doneGenreChip: {
    backgroundColor: '#1a1228',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#8B5CF633',
  },
  doneGenreText: { color: '#A78BFA', fontSize: 13, fontWeight: '600' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 16,
    gap: 12,
    backgroundColor: 'transparent',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtnText: { color: '#555', fontSize: 15 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  nextBtnDisabled: { backgroundColor: '#3b2a6e' },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  doneBtn: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  skipBtn: { paddingHorizontal: 12 },
  skipBtnText: { color: '#333', fontSize: 14 },
});

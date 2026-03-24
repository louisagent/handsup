// ============================================================
// Handsup — Lineup Admin Screen
// Add and manage festival lineup data (mod only)
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEventLineup, addLineupEntry, deleteLineupEntry, bulkImportLineup, LineupEntry } from '../services/lineups';

export default function LineupAdminScreen({ route, navigation }: any) {
  const { eventId, eventName } = route.params as { eventId: string; eventName: string };

  const [lineup, setLineup] = useState<LineupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'add' | 'bulk'>('list');

  // Single add form
  const [artistName, setArtistName] = useState('');
  const [stage, setStage] = useState('');
  const [dayLabel, setDayLabel] = useState('');
  const [saving, setSaving] = useState(false);

  // Bulk import
  const [bulkText, setBulkText] = useState('');
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getEventLineup(eventId);
      setLineup(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!artistName.trim()) {
      Alert.alert('Required', 'Artist name is required');
      return;
    }
    setSaving(true);
    try {
      await addLineupEntry({
        eventId,
        artistName: artistName.trim(),
        stage: stage.trim() || undefined,
        dayLabel: dayLabel.trim() || undefined,
        orderIndex: lineup.length,
      });
      setArtistName('');
      setStage('');
      setDayLabel('');
      await load();
      setMode('list');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not add artist');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setImporting(true);
    try {
      const count = await bulkImportLineup(eventId, bulkText);
      setBulkText('');
      await load();
      setMode('list');
      Alert.alert('Imported!', `Added ${count} artists to the lineup.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = (entry: LineupEntry) => {
    Alert.alert('Remove artist?', `Remove ${entry.artist_name} from the lineup?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteLineupEntry(entry.id);
          load();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Mode tabs */}
      <View style={styles.tabs}>
        {(['list', 'add', 'bulk'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.tab, mode === m && styles.tabActive]}
            onPress={() => setMode(m)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === 'list' ? `Lineup (${lineup.length})` : m === 'add' ? 'Add One' : 'Bulk Import'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List mode */}
      {mode === 'list' && (
        loading ? (
          <View style={styles.centered}><ActivityIndicator color="#8B5CF6" /></View>
        ) : (
          <FlatList
            data={lineup}
            keyExtractor={(e) => e.id}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No lineup added yet</Text>
                <Text style={styles.emptySub}>Use "Add One" or "Bulk Import" to add artists</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.lineupRow}>
                <View style={styles.lineupRowInfo}>
                  <Text style={styles.lineupRowArtist}>{item.artist_name}</Text>
                  <Text style={styles.lineupRowMeta}>
                    {[item.day_label, item.stage].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item)} activeOpacity={0.8}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )
      )}

      {/* Add one mode */}
      {mode === 'add' && (
        <ScrollView contentContainerStyle={styles.formContent}>
          <Text style={styles.formLabel}>Artist Name *</Text>
          <TextInput style={styles.input} value={artistName} onChangeText={setArtistName} placeholder="e.g. Fisher" placeholderTextColor="#333" />

          <Text style={styles.formLabel}>Stage (optional)</Text>
          <TextInput style={styles.input} value={stage} onChangeText={setStage} placeholder="e.g. Main Stage" placeholderTextColor="#333" />

          <Text style={styles.formLabel}>Day (optional)</Text>
          <TextInput style={styles.input} value={dayLabel} onChangeText={setDayLabel} placeholder="e.g. Friday" placeholderTextColor="#333" />

          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleAdd} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Artist</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Bulk import mode */}
      {mode === 'bulk' && (
        <ScrollView contentContainerStyle={styles.formContent}>
          <Text style={styles.bulkHint}>
            Paste artists below — one per line.{'\n'}
            Optional format: <Text style={styles.bulkCode}>Artist Name | Stage | Day</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.bulkInput]}
            value={bulkText}
            onChangeText={setBulkText}
            placeholder={"Fisher\nChris Liebing | Techno Stage | Friday\nEric Prydz | Main Stage | Saturday"}
            placeholderTextColor="#333"
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity style={[styles.saveBtn, importing && styles.saveBtnDisabled]} onPress={handleBulkImport} disabled={importing} activeOpacity={0.85}>
            {importing ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Import Lineup</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#0a0a0a',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#8B5CF6' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#555' },
  tabTextActive: { color: '#8B5CF6' },

  lineupRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#0d0d0d',
  },
  lineupRowInfo: { flex: 1 },
  lineupRowArtist: { fontSize: 15, fontWeight: '700', color: '#fff' },
  lineupRowMeta: { fontSize: 12, color: '#555', marginTop: 2 },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#555' },
  emptySub: { fontSize: 14, color: '#333', textAlign: 'center', paddingHorizontal: 32 },

  formContent: { padding: 20, gap: 8, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: '#aaa', marginTop: 12 },
  input: {
    backgroundColor: '#111', borderRadius: 12,
    borderWidth: 1, borderColor: '#222',
    paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 14,
  },
  bulkHint: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 8 },
  bulkCode: { color: '#8B5CF6', fontFamily: 'monospace' },
  bulkInput: { minHeight: 200, paddingTop: 12 },
  saveBtn: {
    backgroundColor: '#8B5CF6', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
  },
  saveBtnDisabled: { backgroundColor: '#3b2a6e' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

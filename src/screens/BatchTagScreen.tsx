// ============================================================
// Handsup — Batch Tag Screen
// Select multiple clips and apply tags to all at once
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserClipsForBatchUpdate, batchUpdateClips, BatchTagUpdate } from '../services/batchTags';

interface ClipItem {
  id: string;
  artist: string;
  festival_name: string;
  location: string;
  description?: string;
  thumbnail_url?: string;
  created_at: string;
}

export default function BatchTagScreen({ navigation }: any) {
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  // Tag inputs
  const [artist, setArtist] = useState('');
  const [festival, setFestival] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadClips();
  }, []);

  const loadClips = async () => {
    setLoading(true);
    try {
      const data = await getUserClipsForBatchUpdate(100);
      setClips(data);
    } catch (error) {
      console.error('Error loading clips:', error);
      Alert.alert('Error', 'Failed to load clips');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === clips.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(clips.map(c => c.id)));
    }
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Selection', 'Please select at least one clip');
      return;
    }

    // Build updates object (only include non-empty fields)
    const updates: BatchTagUpdate = {};
    if (artist.trim()) updates.artist = artist.trim();
    if (festival.trim()) updates.festival_name = festival.trim();
    if (location.trim()) updates.location = location.trim();
    if (description.trim()) updates.description = description.trim();

    if (Object.keys(updates).length === 0) {
      Alert.alert('No Tags', 'Please enter at least one tag to apply');
      return;
    }

    // Confirm
    const updatesList = Object.keys(updates).join(', ');
    Alert.alert(
      'Apply Tags',
      `Apply ${updatesList} to ${selectedIds.size} clip(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          style: 'default',
          onPress: async () => {
            setApplying(true);
            try {
              const result = await batchUpdateClips(Array.from(selectedIds), updates);
              
              if (result.success > 0) {
                Alert.alert(
                  'Success',
                  `Updated ${result.success} clip(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
                // Reload clips to show updates
                await loadClips();
                setSelectedIds(new Set());
                // Clear inputs
                setArtist('');
                setFestival('');
                setLocation('');
                setDescription('');
              } else {
                Alert.alert('Error', result.errors.join('\n') || 'Failed to update clips');
              }
            } catch (error) {
              console.error('Error applying tags:', error);
              Alert.alert('Error', 'An error occurred while updating clips');
            } finally {
              setApplying(false);
            }
          },
        },
      ]
    );
  };

  const renderClip = ({ item }: { item: ClipItem }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.clipItem, isSelected && styles.clipItemSelected]}
        onPress={() => toggleSelect(item.id)}
        activeOpacity={0.7}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnail}>
          {item.thumbnail_url ? (
            <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnailImage} />
          ) : (
            <Ionicons name="play-circle-outline" size={24} color="#555" />
          )}
        </View>

        {/* Info */}
        <View style={styles.clipInfo}>
          <Text style={styles.clipArtist} numberOfLines={1}>
            {item.artist}
          </Text>
          <Text style={styles.clipFestival} numberOfLines={1}>
            {item.festival_name}
          </Text>
          <Text style={styles.clipLocation} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        {/* Checkbox */}
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={18} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Batch Tag Clips</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Batch Tag Clips</Text>
        <TouchableOpacity onPress={selectAll}>
          <Text style={styles.selectAllText}>
            {selectedIds.size === clips.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tag Inputs */}
      <View style={styles.tagsSection}>
        <Text style={styles.sectionTitle}>Apply Tags to Selected Clips</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Artist (optional)"
          placeholderTextColor="#555"
          value={artist}
          onChangeText={setArtist}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Festival (optional)"
          placeholderTextColor="#555"
          value={festival}
          onChangeText={setFestival}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Location (optional)"
          placeholderTextColor="#555"
          value={location}
          onChangeText={setLocation}
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description/Tags (optional)"
          placeholderTextColor="#555"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
        />

        <TouchableOpacity
          style={[styles.applyButton, (selectedIds.size === 0 || applying) && styles.applyButtonDisabled]}
          onPress={handleApply}
          disabled={selectedIds.size === 0 || applying}
        >
          {applying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="pricetags" size={18} color="#fff" />
              <Text style={styles.applyButtonText}>
                Apply to {selectedIds.size} clip{selectedIds.size !== 1 ? 's' : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Clips List */}
      <View style={styles.clipsSection}>
        <Text style={styles.sectionTitle}>
          Your Clips ({clips.length})
        </Text>
        <FlatList
          data={clips}
          renderItem={renderClip}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.clipsList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="videocam-outline" size={48} color="#555" />
              <Text style={styles.emptyText}>No clips found</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
    marginBottom: 10,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 6,
  },
  applyButtonDisabled: {
    backgroundColor: '#333',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  clipsSection: {
    flex: 1,
  },
  clipsList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  clipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  clipItemSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: '#1a0f2e',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  clipInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clipArtist: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 3,
  },
  clipFestival: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 2,
  },
  clipLocation: {
    fontSize: 12,
    color: '#666',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
});

// ============================================================
// Clip Stitching Screen
// Select and combine multiple clips into one video
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { supabase } from '../services/supabase';
import { Ionicons } from '@expo/vector-icons';
import {
  stitchClips,
  validateStitchClips,
  generateStitchPreview,
  estimateStitchedDuration,
  type StitchClip,
} from '../services/clipStitching';

export default function ClipStitchingScreen({ navigation }: any) {
  const [clips, setClips] = useState<any[]>([]);
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [stitching, setStitching] = useState(false);

  useEffect(() => {
    loadUserClips();
  }, []);

  const loadUserClips = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Sign in required', 'Please sign in to stitch clips.');
        navigation.goBack();
        return;
      }

      const { data, error } = await supabase
        .from('clips')
        .select('id, artist, festival_name, location, video_url, thumbnail_url, duration_seconds, created_at')
        .eq('uploader_id', user.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[ClipStitching] Failed to load clips:', error);
        Alert.alert('Error', 'Failed to load your clips.');
        return;
      }

      setClips(data ?? []);
    } catch (err) {
      console.error('[ClipStitching] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (clipId: string) => {
    const newSelection = new Set(selectedClips);
    if (newSelection.has(clipId)) {
      newSelection.delete(clipId);
    } else {
      if (newSelection.size >= 6) {
        Alert.alert('Maximum 6 clips', 'You can stitch up to 6 clips at once.');
        return;
      }
      newSelection.add(clipId);
    }
    setSelectedClips(newSelection);
  };

  const handleStitch = async () => {
    const selectedClipData: StitchClip[] = clips
      .filter((c) => selectedClips.has(c.id))
      .map((c) => ({
        id: c.id,
        videoUrl: c.video_url,
        artist: c.artist,
        festival: c.festival_name,
        duration: c.duration_seconds ?? 0,
      }));

    // Validate
    const validation = validateStitchClips(selectedClipData);
    if (!validation.valid) {
      Alert.alert('Cannot stitch', validation.error);
      return;
    }

    // Generate preview
    const preview = generateStitchPreview(selectedClipData);

    Alert.alert(
      'Stitch Clips',
      `Create: ${preview.title}\n\n${preview.clipCount} clips · ${Math.round(preview.duration)}s total\n\nTransition: Cut (fade not yet supported)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stitch',
          onPress: async () => {
            setStitching(true);
            const result = await stitchClips({
              clips: selectedClipData,
              transition: 'cut',
            });

            setStitching(false);

            if (result.success && result.outputUri) {
              Alert.alert(
                'Success!',
                'Your clips have been stitched together.\n\nOutput: ' + result.outputUri,
                [{ text: 'OK' }]
              );
              setSelectedClips(new Set());
            } else {
              Alert.alert(
                'Not Available Yet',
                result.error || 'Clip stitching requires ffmpeg.\n\nSee NEW_FEATURES_IMPLEMENTATION.md for setup instructions.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const renderClip = ({ item }: { item: any }) => {
    const isSelected = selectedClips.has(item.id);
    const selectionOrder = isSelected
      ? Array.from(selectedClips).indexOf(item.id) + 1
      : null;

    return (
      <TouchableOpacity
        style={[styles.clipItem, isSelected && styles.clipItemSelected]}
        onPress={() => toggleSelection(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.clipThumbnailWrapper}>
          {item.thumbnail_url ? (
            <Image
              source={{ uri: item.thumbnail_url }}
              style={styles.clipThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.clipThumbnail, styles.clipThumbnailPlaceholder]}>
              <Ionicons name="musical-notes" size={24} color="#444" />
            </View>
          )}

          {/* Selection indicator */}
          <View style={[styles.checkboxContainer, isSelected && styles.checkboxSelected]}>
            {isSelected ? (
              <Text style={styles.checkboxText}>{selectionOrder}</Text>
            ) : (
              <View style={styles.checkboxEmpty} />
            )}
          </View>

          {/* Duration badge */}
          {item.duration_seconds && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{item.duration_seconds}s</Text>
            </View>
          )}
        </View>

        <View style={styles.clipInfo}>
          <Text style={styles.clipArtist} numberOfLines={1}>
            {item.artist}
          </Text>
          <Text style={styles.clipFestival} numberOfLines={1}>
            {item.festival_name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedCount = selectedClips.size;
  const selectedClipData = clips.filter((c) => selectedClips.has(c.id));
  const totalDuration = selectedClipData.reduce(
    (sum, c) => sum + (c.duration_seconds ?? 0),
    0
  );
  const canStitch = selectedCount >= 2 && selectedCount <= 6;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stitch Clips</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>✂️ Combine clips into one video</Text>
        <Text style={styles.instructionsText}>
          Select 2-6 clips from your uploads to stitch together
        </Text>
      </View>

      {/* Selection summary */}
      {selectedCount > 0 && (
        <View style={styles.selectionSummary}>
          <Text style={styles.selectionText}>
            {selectedCount} clip{selectedCount !== 1 ? 's' : ''} selected
            {totalDuration > 0 && ` · ${Math.round(totalDuration)}s total`}
          </Text>
          <TouchableOpacity onPress={() => setSelectedClips(new Set())}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Clips grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#8B5CF6" size="large" />
          <Text style={styles.loadingText}>Loading your clips...</Text>
        </View>
      ) : clips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyTitle}>No clips yet</Text>
          <Text style={styles.emptyText}>
            Upload some clips first, then come back to stitch them together
          </Text>
        </View>
      ) : (
        <FlatList
          data={clips}
          renderItem={renderClip}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.clipsList}
          columnWrapperStyle={styles.row}
        />
      )}

      {/* Stitch button */}
      {!loading && clips.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.stitchBtn, (!canStitch || stitching) && styles.stitchBtnDisabled]}
            onPress={handleStitch}
            disabled={!canStitch || stitching}
            activeOpacity={0.85}
          >
            {stitching ? (
              <View style={styles.stitchingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.stitchBtnText}>  Stitching...</Text>
              </View>
            ) : (
              <Text style={styles.stitchBtnText}>
                {canStitch
                  ? `Stitch ${selectedCount} clips →`
                  : `Select ${2 - selectedCount} more clip${2 - selectedCount !== 1 ? 's' : ''}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  instructions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0a0a0a',
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
  },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1a1228',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#8B5CF633',
  },
  selectionText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  clearText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  clipsList: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  clipItem: {
    width: '48%',
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  clipItemSelected: {
    borderColor: '#8B5CF6',
  },
  clipThumbnailWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
  },
  clipThumbnail: {
    width: '100%',
    height: '100%',
  },
  clipThumbnailPlaceholder: {
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  checkboxEmpty: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  checkboxText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  clipInfo: {
    padding: 12,
  },
  clipArtist: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  clipFestival: {
    color: '#8B5CF6',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  stitchBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  stitchBtnDisabled: {
    backgroundColor: '#2a2a2a',
  },
  stitchBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  stitchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

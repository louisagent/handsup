// ============================================================
// Handsup — Hashtag Screen
// All clips containing a specific hashtag
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Clip } from '../types';
import { searchClips } from '../services/clips';

function ClipCard({ clip, onPress }: { clip: Clip; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {clip.thumbnail_url ? (
        <Image source={{ uri: clip.thumbnail_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="musical-notes-outline" size={20} color="#333" />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.artist} numberOfLines={1}>{clip.artist}</Text>
        <Text style={styles.festival} numberOfLines={1}>{clip.festival_name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={11} color="#555" />
          <Text style={styles.metaText}>{clip.location}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>▶ {(clip.view_count ?? 0).toLocaleString()}</Text>
          <Text style={styles.stat}>⬇ {(clip.download_count ?? 0).toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HashtagScreen({ route, navigation }: any) {
  const { tag } = route.params as { tag: string };
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClips = useCallback(async () => {
    try {
      // Search description field for #tag
      const data = await searchClips({ description: `#${tag}`, limit: 50 });
      setClips(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tag]);

  useEffect(() => { loadClips(); }, [loadClips]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadClips();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.tagTitle}>#{tag}</Text>
        {!loading && (
          <Text style={styles.clipCount}>{clips.length} clip{clips.length !== 1 ? 's' : ''}</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <FlatList
          data={clips}
          keyExtractor={(c) => c.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#8B5CF6"
              colors={['#8B5CF6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏷️</Text>
              <Text style={styles.emptyTitle}>No clips for #{tag}</Text>
              <Text style={styles.emptySub}>Be the first to use this tag when uploading!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ClipCard
              clip={item}
              onPress={() => navigation.navigate('VideoDetail', { video: item })}
            />
          )}
          contentContainerStyle={clips.length === 0 ? styles.emptyContainer : styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: -0.5,
  },
  clipCount: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },

  card: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#111',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  thumb: {
    width: 100,
    height: 76,
    backgroundColor: '#1a1a1a',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
    gap: 3,
  },
  artist: { fontSize: 14, fontWeight: '700', color: '#fff' },
  festival: { fontSize: 12, color: '#8B5CF6', fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: '#555' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  stat: { fontSize: 11, color: '#444' },

  listContent: { paddingBottom: 40 },
  emptyContainer: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#555' },
  emptySub: { fontSize: 14, color: '#333', textAlign: 'center', paddingHorizontal: 32 },
});

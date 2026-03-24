// ============================================================
// Handsup — Event Feed Screen
// Full clip feed for a specific festival/event
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
import { LinearGradient } from 'expo-linear-gradient';
import { Clip } from '../types';
import { getClipsByEvent, searchClips } from '../services/clips';

type SortOption = 'latest' | 'downloads' | 'views';

function ClipCard({ clip, onPress }: { clip: Clip; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Thumbnail */}
      <View style={styles.thumbWrapper}>
        {clip.thumbnail_url ? (
          <Image source={{ uri: clip.thumbnail_url }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="musical-notes-outline" size={28} color="#333" />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.thumbGradient}
        />
        {clip.resolution && (
          <View style={styles.hdBadge}>
            <Text style={styles.hdBadgeText}>HD</Text>
          </View>
        )}
        <View style={styles.statsBadge}>
          <Ionicons name="download-outline" size={11} color="#aaa" />
          <Text style={styles.statsBadgeText}>{clip.download_count.toLocaleString()}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.artist} numberOfLines={1}>{clip.artist}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color="#666" />
          <Text style={styles.metaText} numberOfLines={1}>{clip.location}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="eye-outline" size={12} color="#666" />
          <Text style={styles.metaText}>{(clip.view_count ?? 0).toLocaleString()} views</Text>
          {clip.uploader?.username && (
            <Text style={styles.uploader} numberOfLines={1}> · @{clip.uploader.username}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function EventFeedScreen({ route, navigation }: any) {
  const { eventId, festivalName, eventName } = route.params as {
    eventId?: string;
    festivalName: string;
    eventName: string;
  };

  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortOption>('latest');

  const loadClips = useCallback(async () => {
    try {
      let data: Clip[] = [];
      if (eventId) {
        data = await getClipsByEvent(eventId);
      } else {
        data = await searchClips({ festival: festivalName, limit: 50 });
      }

      // Client-side sort
      if (sort === 'downloads') {
        data = [...data].sort((a, b) => (b.download_count ?? 0) - (a.download_count ?? 0));
      } else if (sort === 'views') {
        data = [...data].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
      } else {
        data = [...data].sort((a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
        );
      }

      setClips(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, festivalName, sort]);

  useEffect(() => { loadClips(); }, [loadClips]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadClips();
  };

  const sortOptions: { key: SortOption; label: string; icon: string }[] = [
    { key: 'latest', label: 'Latest', icon: 'time-outline' },
    { key: 'downloads', label: 'Most Downloaded', icon: 'download-outline' },
    { key: 'views', label: 'Most Viewed', icon: 'eye-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Filter pills */}
      <View style={styles.filterRow}>
        {sortOptions.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.pill, sort === opt.key && styles.pillActive]}
            onPress={() => setSort(opt.key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={opt.icon as any}
              size={13}
              color={sort === opt.key ? '#fff' : '#666'}
            />
            <Text style={[styles.pillText, sort === opt.key && styles.pillTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
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
          ListHeaderComponent={
            clips.length > 0 ? (
              <Text style={styles.clipCount}>{clips.length} clips</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="videocam-outline" size={48} color="#333" />
              <Text style={styles.emptyTitle}>No clips yet</Text>
              <Text style={styles.emptySub}>Be the first to upload from {festivalName}!</Text>
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

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#111',
  },
  pillActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  pillText: { fontSize: 12, fontWeight: '600', color: '#666' },
  pillTextActive: { color: '#fff' },

  clipCount: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },

  // Clip card
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
  thumbWrapper: {
    width: 110,
    height: 82,
    position: 'relative',
  },
  thumb: { width: '100%', height: '100%', backgroundColor: '#1a1a1a' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 40,
  },
  hdBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  hdBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  statsBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  statsBadgeText: { color: '#aaa', fontSize: 10, fontWeight: '600' },

  info: { flex: 1, padding: 12, justifyContent: 'center', gap: 4 },
  artist: { fontSize: 15, fontWeight: '700', color: '#fff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#555', flex: 1 },
  uploader: { fontSize: 11, color: '#444' },

  listContent: { paddingBottom: 40 },
  emptyContainer: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#555' },
  emptySub: { fontSize: 14, color: '#333', textAlign: 'center', paddingHorizontal: 32 },
});

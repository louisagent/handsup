// ============================================================
// Handsup — Download History Screen
// Shows clips the user has previously downloaded, grouped by date
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
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyDownloads } from '../services/auth';
import { recordDownload } from '../services/clips';
import { Download } from '../types';

// ── Date grouping ──────────────────────────────────────────

type DateGroup = 'Today' | 'This Week' | 'Earlier';

function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 1) return 'Today';
  if (diffDays < 7) return 'This Week';
  return 'Earlier';
}

interface Section {
  title: DateGroup;
  data: Download[];
}

function groupDownloads(downloads: Download[]): Section[] {
  const groups: Record<DateGroup, Download[]> = {
    Today: [],
    'This Week': [],
    Earlier: [],
  };

  downloads.forEach((d) => {
    const group = getDateGroup(d.downloaded_at);
    groups[group].push(d);
  });

  const order: DateGroup[] = ['Today', 'This Week', 'Earlier'];
  return order
    .filter((title) => groups[title].length > 0)
    .map((title) => ({ title, data: groups[title] }));
}

// ── Download Row ───────────────────────────────────────────

function DownloadRow({
  download,
  onPress,
  onRedownload,
}: {
  download: Download;
  onPress: () => void;
  onRedownload: () => void;
}) {
  const clip = download.clip;
  if (!clip) return null;

  const formattedDate = new Date(download.downloaded_at).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      {/* Thumbnail */}
      <View style={styles.thumb}>
        <Ionicons name="play-circle-outline" size={28} color="#8B5CF6" />
      </View>

      {/* Info */}
      <View style={styles.rowInfo}>
        <Text style={styles.rowArtist} numberOfLines={1}>
          {clip.artist}
        </Text>
        <Text style={styles.rowFestival} numberOfLines={1}>
          {clip.festival_name}
        </Text>
        <Text style={styles.rowDate}>Downloaded {formattedDate}</Text>
      </View>

      {/* Re-download button */}
      <TouchableOpacity style={styles.redownloadBtn} onPress={onRedownload} activeOpacity={0.75}>
        <Ionicons name="download-outline" size={20} color="#8B5CF6" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Section Header ─────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────

export default function DownloadHistoryScreen({ navigation }: any) {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDownloads = useCallback(async () => {
    try {
      const data = await getMyDownloads() as Download[];
      setDownloads(data);
      setSections(groupDownloads(data));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDownloads();
  };

  const handleRedownload = async (download: Download) => {
    if (!download.clip) return;
    try {
      await recordDownload(download.clip.id);
      await Share.share({
        message: `Check out ${download.clip.artist} at ${download.clip.festival_name} 🎵`,
        url: download.clip.video_url,
      });
    } catch {
      Alert.alert('Error', 'Could not share this clip.');
    }
  };

  // Flatten sections for FlatList with section headers
  type ListItem =
    | { type: 'header'; title: string; key: string }
    | { type: 'row'; download: Download; key: string };

  const flatData: ListItem[] = [];
  sections.forEach((section) => {
    flatData.push({ type: 'header', title: section.title, key: `header-${section.title}` });
    section.data.forEach((d) => {
      flatData.push({ type: 'row', download: d, key: d.id });
    });
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={flatData}
        keyExtractor={(item) => item.key}
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
            <Ionicons name="download-outline" size={56} color="#333" />
            <Text style={styles.emptyTitle}>No downloads yet</Text>
            <Text style={styles.emptySubtitle}>Save clips to watch offline.</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <SectionHeader title={item.title} />;
          }
          return (
            <DownloadRow
              download={item.download}
              onPress={() =>
                item.download.clip &&
                navigation.navigate('VerticalFeed', { initialClip: item.download.clip })
              }
              onRedownload={() => handleRedownload(item.download)}
            />
          );
        }}
        contentContainerStyle={
          flatData.length === 0 ? styles.emptyContainer : styles.listContent
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { alignItems: 'center', justifyContent: 'center' },

  listContent: { paddingBottom: 40 },
  emptyContainer: { flex: 1 },

  // Section header
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  thumb: {
    width: 80,
    height: 64,
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1e1e1e',
  },
  rowInfo: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  rowArtist: { fontSize: 14, fontWeight: '700', color: '#fff' },
  rowFestival: { fontSize: 12, color: '#8B5CF6', fontWeight: '600', marginTop: 2 },
  rowDate: { fontSize: 11, color: '#444', marginTop: 4 },

  redownloadBtn: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#555',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    maxWidth: 240,
  },
});

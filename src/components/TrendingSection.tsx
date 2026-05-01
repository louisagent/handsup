// ============================================================
// Trending Festivals Section
// Shows top trending festivals by recent activity
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native';
import { getTrendingFestivals, type TrendingFestival } from '../services/trending';
import { Ionicons } from '@expo/vector-icons';

interface TrendingSectionProps {
  limit?: number;
  onPressFestival?: (festival: TrendingFestival) => void;
  compact?: boolean;
}

export default function TrendingSection({
  limit = 5,
  onPressFestival,
  compact = false,
}: TrendingSectionProps) {
  const [trending, setTrending] = useState<TrendingFestival[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await getTrendingFestivals(7, limit);
      setTrending(data);
    } catch (err) {
      console.error('[TrendingSection] Failed to load:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔥 Trending Festivals</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#8B5CF6" size="small" />
        </View>
      </View>
    );
  }

  if (error || trending.length === 0) {
    return null;
  }

  const renderItem = ({ item, index }: { item: TrendingFestival; index: number }) => (
    <TouchableOpacity
      style={styles.trendingItem}
      onPress={() => onPressFestival?.(item)}
      activeOpacity={0.8}
    >
      <View style={styles.trendingRank}>
        <Text style={styles.trendingRankText}>{index + 1}</Text>
      </View>

      <View style={styles.trendingContent}>
        <Text style={styles.trendingName} numberOfLines={1}>
          {item.name}
        </Text>
        
        {!compact && (
          <View style={styles.trendingStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{item.clipCount}</Text>
              <Text style={styles.statLabel}>clips</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{item.uniqueUploaders}</Text>
              <Text style={styles.statLabel}>uploaders</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{item.viewCount}</Text>
              <Text style={styles.statLabel}>views</Text>
            </View>
          </View>
        )}
        
        {compact && (
          <Text style={styles.trendingCompactInfo}>
            {item.clipCount} clips · {item.uniqueUploaders} uploaders
          </Text>
        )}
      </View>

      {/* Recent clip thumbnails preview */}
      {!compact && item.recentClips && item.recentClips.length > 0 && (
        <View style={styles.thumbnailsRow}>
          {item.recentClips.slice(0, 3).map((clip, idx) => (
            <View key={clip.id} style={styles.thumbnailWrapper}>
              {clip.thumbnail_url ? (
                <Image
                  source={{ uri: clip.thumbnail_url }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                  <Ionicons name="musical-notes" size={12} color="#444" />
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <Ionicons name="chevron-forward" size={18} color="#555" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔥 Trending Festivals</Text>
        <Text style={styles.subtitle}>Most active in the last 7 days</Text>
      </View>

      <FlatList
        data={trending}
        renderItem={renderItem}
        keyExtractor={(item) => item.name}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  trendingRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a1228',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingRankText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '700',
  },
  trendingContent: {
    flex: 1,
  },
  trendingName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  trendingStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '700',
  },
  statLabel: {
    color: '#555',
    fontSize: 11,
  },
  trendingCompactInfo: {
    color: '#666',
    fontSize: 12,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 8,
  },
  thumbnailWrapper: {
    width: 32,
    height: 32,
    borderRadius: 6,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginVertical: 4,
  },
});

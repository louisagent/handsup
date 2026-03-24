// ============================================================
// Handsup — Full Trending Screen
// 🔥 Clips · 🎤 Artists · 🎪 Festivals · 🌍 Locations
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTrendingClips, getTrendingArtists } from '../services/clips';
import { Clip } from '../types';
import { extractHashtags } from '../utils/tags';

// ── Skeleton ───────────────────────────────────────────────

function SkeletonBox({ width, height, style }: { width: number | string; height: number; style?: object }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: 10, backgroundColor: '#1a1a1a', opacity }, style]}
    />
  );
}

function SkeletonSection() {
  return (
    <View style={styles.section}>
      <SkeletonBox width={180} height={18} style={{ marginBottom: 14 }} />
      <SkeletonBox width="100%" height={80} style={{ marginBottom: 10 }} />
      <SkeletonBox width="100%" height={80} style={{ marginBottom: 10 }} />
      <SkeletonBox width="100%" height={80} />
    </View>
  );
}

// ── Clip Row ───────────────────────────────────────────────

function ClipRow({
  clip,
  rank,
  onPress,
}: {
  clip: Clip;
  rank: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.clipRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.rankBadge}>
        <Text style={[styles.rankText, rank <= 3 && styles.rankTextTop]}>{rank}</Text>
      </View>
      <View style={styles.clipThumb}>
        <Ionicons name="play-circle-outline" size={22} color="#8B5CF6" />
      </View>
      <View style={styles.clipInfo}>
        <Text style={styles.clipArtist} numberOfLines={1}>{clip.artist}</Text>
        <Text style={styles.clipFestival} numberOfLines={1}>{clip.festival_name}</Text>
        <Text style={styles.clipMeta}>{clip.location}</Text>
      </View>
      <View style={styles.downloadBadge}>
        <Ionicons name="download-outline" size={12} color="#8B5CF6" />
        <Text style={styles.downloadCount}>{clip.download_count.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Artist Chip ────────────────────────────────────────────

function ArtistChip({
  artist,
  count,
  onPress,
}: {
  artist: string;
  count: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.artistChip} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.chipAvatar}>
        <Text style={styles.chipAvatarText}>
          {artist.slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.chipArtist} numberOfLines={1}>{artist}</Text>
      <Text style={styles.chipCount}>{count} clips</Text>
    </TouchableOpacity>
  );
}

// ── Festival Row ───────────────────────────────────────────

function FestivalRow({
  festival,
  count,
  rank,
}: {
  festival: string;
  count: number;
  rank: number;
}) {
  const barWidth = Math.max(20, Math.min(100, (count / 50) * 100));

  return (
    <View style={styles.festivalRow}>
      <Text style={styles.festivalRank}>#{rank}</Text>
      <View style={styles.festivalInfo}>
        <Text style={styles.festivalName} numberOfLines={1}>{festival}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${barWidth}%` as any }]} />
        </View>
      </View>
      <Text style={styles.festivalCount}>{count}</Text>
    </View>
  );
}

// ── Location Row ───────────────────────────────────────────

function LocationRow({ location, count }: { location: string; count: number }) {
  return (
    <View style={styles.locationRow}>
      <Ionicons name="location-outline" size={16} color="#8B5CF6" />
      <Text style={styles.locationName} numberOfLines={1}>{location}</Text>
      <Text style={styles.locationCount}>{count} clips</Text>
    </View>
  );
}

// ── Section Header ─────────────────────────────────────────

function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────

export default function TrendingScreen({ navigation }: any) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [artists, setArtists] = useState<{ artist: string; count: number }[]>([]);
  const [festivals, setFestivals] = useState<{ festival: string; count: number }[]>([]);
  const [locations, setLocations] = useState<{ location: string; count: number }[]>([]);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [trendClips, trendArtists] = await Promise.all([
        getTrendingClips(20),
        getTrendingArtists(15),
      ]);

      setClips(trendClips);
      setArtists(trendArtists);

      // Aggregate festivals from clips (client-side)
      const festMap: Record<string, number> = {};
      trendClips.forEach((c) => {
        if (c.festival_name) {
          festMap[c.festival_name] = (festMap[c.festival_name] || 0) + 1;
        }
      });
      const sortedFests = Object.entries(festMap)
        .map(([festival, count]) => ({ festival, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setFestivals(sortedFests);

      // Aggregate locations from clips (client-side)
      const locMap: Record<string, number> = {};
      trendClips.forEach((c) => {
        if (c.location) {
          locMap[c.location] = (locMap[c.location] || 0) + 1;
        }
      });
      const sortedLocs = Object.entries(locMap)
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setLocations(sortedLocs);

      // Aggregate hashtags from clip descriptions (client-side)
      const tagMap: Record<string, number> = {};
      trendClips.forEach((c) => {
        if (c.description) {
          extractHashtags(c.description).forEach((tag) => {
            tagMap[tag] = (tagMap[tag] || 0) + 1;
          });
        }
      });
      const sortedTags = Object.entries(tagMap)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setTags(sortedTags);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <SkeletonSection />
        <SkeletonSection />
      </ScrollView>
    );
  }

  return (
    <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8B5CF6" colors={["#8B5CF6"]} />
      }
    >
      {/* 🔥 Trending Clips */}
      <View style={styles.section}>
        <SectionHeader title="🔥 Trending Clips" />
        {clips.length === 0 ? (
          <Text style={styles.emptyText}>No trending clips yet.</Text>
        ) : (
          clips.slice(0, 20).map((clip, idx) => (
            <ClipRow
              key={clip.id}
              clip={clip}
              rank={idx + 1}
              onPress={() => navigation.navigate('VideoDetail', { video: clip })}
            />
          ))
        )}
      </View>

      {/* 🎤 Trending Artists */}
      {artists.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="🎤 Trending Artists"
            onSeeAll={() => navigation.navigate('Search', { focusArtist: true })}
          />
          <View style={styles.artistGrid}>
            {artists.map((a) => (
              <ArtistChip
                key={a.artist}
                artist={a.artist}
                count={a.count}
                onPress={() => navigation.navigate('Artist', { artist: a.artist })}
              />
            ))}
          </View>
        </View>
      )}

      {/* 🎪 Trending Festivals */}
      {festivals.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="🎪 Trending Festivals" />
          {festivals.map((f, idx) => (
            <FestivalRow key={f.festival} festival={f.festival} count={f.count} rank={idx + 1} />
          ))}
        </View>
      )}

      {/* 🌍 Trending Locations */}
      {locations.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="🌍 Trending Locations" />
          {locations.map((l) => (
            <LocationRow key={l.location} location={l.location} count={l.count} />
          ))}
        </View>
      )}

      {/* 🏷 Trending Tags */}
      <View style={[styles.section, { marginBottom: 48 }]}>
        <SectionHeader title="🏷 Trending Tags" />
        {loading ? (
          <View style={styles.tagRow}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonBox key={i} width={72} height={30} style={{ borderRadius: 15 }} />
            ))}
          </View>
        ) : tags.length === 0 ? (
          <Text style={styles.emptyText}>No tags yet.</Text>
        ) : (
          <View style={styles.tagRow}>
            {tags.map(({ tag }) => (
              <TouchableOpacity
                key={tag}
                style={styles.tagChip}
                onPress={() => navigation.navigate('Hashtag', { tag: tag.startsWith('#') ? tag.slice(1) : tag })}
                activeOpacity={0.8}
              >
                <Text style={styles.tagChipText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  section: { paddingHorizontal: 16, paddingTop: 24 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  seeAll: { fontSize: 13, color: '#8B5CF6', fontWeight: '600' },

  emptyText: { color: '#444', fontSize: 14, textAlign: 'center', paddingVertical: 20 },

  // Clip row
  clipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 8,
    overflow: 'hidden',
  },
  rankBadge: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  rankText: { fontSize: 14, fontWeight: '700', color: '#444' },
  rankTextTop: { color: '#8B5CF6' },
  clipThumb: {
    width: 56,
    height: 56,
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1e1e1e',
  },
  clipInfo: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  clipArtist: { fontSize: 14, fontWeight: '700', color: '#fff' },
  clipFestival: { fontSize: 12, color: '#8B5CF6', fontWeight: '600', marginTop: 2 },
  clipMeta: { fontSize: 11, color: '#444', marginTop: 3 },
  downloadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingRight: 12,
  },
  downloadCount: { fontSize: 12, color: '#8B5CF6', fontWeight: '600' },

  // Artist chips grid
  artistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  artistChip: {
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 12,
    alignItems: 'center',
    minWidth: 90,
    flex: 1,
    maxWidth: '48%',
  },
  chipAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1228',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  chipAvatarText: { fontSize: 15, fontWeight: '800', color: '#8B5CF6' },
  chipArtist: { fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'center' },
  chipCount: { fontSize: 11, color: '#555', marginTop: 3, fontWeight: '500' },

  // Festival rows
  festivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  festivalRank: { fontSize: 13, color: '#555', fontWeight: '700', width: 28 },
  festivalInfo: { flex: 1 },
  festivalName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 5 },
  barTrack: { height: 4, backgroundColor: '#1a1a1a', borderRadius: 2 },
  barFill: { height: 4, backgroundColor: '#8B5CF6', borderRadius: 2 },
  festivalCount: { fontSize: 12, color: '#555', width: 28, textAlign: 'right' },

  // Tag chips
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  tagChip: {
    backgroundColor: '#2a1650',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#8B5CF644',
  },
  tagChipText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '600',
  },

  // Location rows
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  locationName: { flex: 1, fontSize: 14, color: '#fff', fontWeight: '600' },
  locationCount: { fontSize: 12, color: '#555' },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { mockVideos, VideoClip } from '../data/mockData';

// Aggregate artist stats from all clips
function getArtistStats(artist: string) {
  const clips = mockVideos.filter(
    (v) => v.artist.toLowerCase() === artist.toLowerCase()
  );
  const totalViews = clips.reduce((sum, c) => sum + c.views, 0);
  const totalDownloads = clips.reduce((sum, c) => sum + c.downloads, 0);
  const totalLikes = clips.reduce((sum, c) => sum + c.likes, 0);
  const totalComments = clips.reduce((sum, c) => sum + c.comments.length, 0);
  const festivals = [...new Set(clips.map((c) => c.festival))];
  const locations = [...new Set(clips.map((c) => c.location))];
  return { clips, totalViews, totalDownloads, totalLikes, totalComments, festivals, locations };
}

export default function ArtistScreen({ route, navigation }: any) {
  const { artist } = route.params as { artist: string };
  const { clips, totalViews, totalDownloads, totalLikes, totalComments, festivals, locations } =
    getArtistStats(artist);

  const renderClip = ({ item }: { item: VideoClip }) => (
    <TouchableOpacity
      style={styles.clipCard}
      onPress={() => navigation.navigate('VideoDetail', { video: item })}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
      <View style={styles.clipInfo}>
        <Text style={styles.clipFestival}>{item.festival}</Text>
        <Text style={styles.clipMeta}>
          {item.location} · {item.date}
        </Text>
        <Text style={styles.clipDesc} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.clipStats}>
          <Text style={styles.clipStat}>▶ {item.views.toLocaleString()}</Text>
          <Text style={styles.clipStat}>⬇ {item.downloads.toLocaleString()}</Text>
          <Text style={styles.clipStat}>⏱ {item.duration}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.artistAvatar}>
            <Text style={styles.avatarEmoji}>🎤</Text>
          </View>
          <Text style={styles.artistName}>{artist}</Text>
          <Text style={styles.clipCount}>{clips.length} clip{clips.length !== 1 ? 's' : ''} on Handsup</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{totalDownloads.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Downloads</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{totalLikes.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{totalComments.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Comments</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{festivals.length}</Text>
              <Text style={styles.statLabel}>Festival{festivals.length !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>

        {/* Festivals strip */}
        {festivals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seen at</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.festivalChips}>
              {festivals.map((f) => (
                <View key={f} style={styles.chip}>
                  <Text style={styles.chipText}>{f}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Clips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All clips</Text>
          {clips.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No clips yet. Be the first to upload one! 🙌</Text>
            </View>
          ) : (
            clips.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.clipCard}
                onPress={() => navigation.navigate('VideoDetail', { video: item })}
              >
                <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
                <View style={styles.clipInfo}>
                  <Text style={styles.clipFestival}>{item.festival}</Text>
                  <Text style={styles.clipMeta}>{item.location} · {item.date}</Text>
                  <Text style={styles.clipDesc} numberOfLines={2}>{item.description}</Text>
                  <View style={styles.clipStats}>
                    <Text style={styles.clipStat}>⬇ {item.downloads.toLocaleString()}</Text>
                    <Text style={styles.clipStat}>❤️ {item.likes.toLocaleString()}</Text>
                    <Text style={styles.clipStat}>💬 {item.comments.length}</Text>
                    <Text style={styles.clipStat}>⏱ {item.duration}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  hero: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(139,92,246,0.12)',
    top: 0,
  },
  artistAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarEmoji: { fontSize: 40 },
  artistName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  clipCount: { fontSize: 13, color: '#8B5CF6', marginTop: 4, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: '#555', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#2a2a2a' },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  festivalChips: { gap: 8, paddingBottom: 4 },
  chip: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipText: { color: '#A78BFA', fontSize: 13, fontWeight: '600' },
  clipCard: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 10,
  },
  thumb: { width: 110, height: 82, backgroundColor: '#1a1a1a' },
  clipInfo: { flex: 1, padding: 12 },
  clipFestival: { fontSize: 13, fontWeight: '700', color: '#8B5CF6' },
  clipMeta: { fontSize: 11, color: '#555', marginTop: 2 },
  clipDesc: { fontSize: 12, color: '#888', marginTop: 4, lineHeight: 17 },
  clipStats: { flexDirection: 'row', gap: 10, marginTop: 6 },
  clipStat: { fontSize: 11, color: '#444' },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#555', fontSize: 14, textAlign: 'center' },
});

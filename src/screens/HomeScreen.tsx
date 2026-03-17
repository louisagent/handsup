import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
} from 'react-native';
import { mockVideos, VideoClip } from '../data/mockData';

const trending = [...mockVideos].sort((a, b) => b.downloads - a.downloads).slice(0, 3);
const recent = [...mockVideos].reverse();

export default function HomeScreen({ navigation }: any) {
  const goToVideo = (video: VideoClip) =>
    navigation.navigate('VideoDetail', { video });
  const goToArtist = (artist: string) =>
    navigation.navigate('Artist', { artist });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🙌 handsup</Text>
          <Text style={styles.tagline}>be there. we'll film it.</Text>
        </View>

        {/* Trending strip */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Trending this week</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingList}
          >
            {trending.map((video) => (
              <TouchableOpacity
                key={video.id}
                style={styles.trendCard}
                onPress={() => goToVideo(video)}
              >
                <Image source={{ uri: video.thumbnail }} style={styles.trendThumb} />
                <View style={styles.trendOverlay}>
                  <Text style={styles.trendArtist} numberOfLines={1}>{video.artist}</Text>
                  <Text style={styles.trendMeta}>{video.location}</Text>
                  <Text style={styles.trendDownloads}>⬇ {video.downloads.toLocaleString()}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent feed */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🕐 Recently uploaded</Text>
          </View>
          {recent.map((video) => (
            <TouchableOpacity
              key={video.id}
              style={styles.card}
              onPress={() => goToVideo(video)}
            >
              <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
              <View style={styles.cardBody}>
                <TouchableOpacity onPress={() => goToArtist(video.artist)}>
                  <Text style={styles.artist}>{video.artist}</Text>
                </TouchableOpacity>
                <Text style={styles.festival}>{video.festival}</Text>
                <Text style={styles.meta}>
                  {video.location} · {video.date}
                </Text>
                <Text style={styles.description} numberOfLines={2}>
                  {video.description}
                </Text>
                <View style={styles.stats}>
                  <Text style={styles.statText}>▶ {video.views.toLocaleString()}</Text>
                  <Text style={styles.statText}>⬇ {video.downloads.toLocaleString()}</Text>
                  <Text style={styles.statText}>⏱ {video.duration}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  logo: { fontSize: 26, fontWeight: '800', color: '#fff' },
  tagline: { fontSize: 13, color: '#8B5CF6', marginTop: 2, letterSpacing: 0.5 },
  section: { marginTop: 24 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  trendingList: { paddingHorizontal: 16, gap: 12 },
  trendCard: {
    width: 200,
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  trendThumb: { width: '100%', height: '100%' },
  trendOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  trendArtist: { color: '#fff', fontWeight: '700', fontSize: 14 },
  trendMeta: { color: '#aaa', fontSize: 11, marginTop: 1 },
  trendDownloads: { color: '#8B5CF6', fontSize: 11, marginTop: 3, fontWeight: '600' },
  card: {
    backgroundColor: '#161616',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  thumbnail: { width: '100%', height: 200, backgroundColor: '#1a1a1a' },
  cardBody: { padding: 14 },
  artist: { fontSize: 18, fontWeight: '700', color: '#fff' },
  festival: { fontSize: 14, color: '#8B5CF6', marginTop: 2, fontWeight: '600' },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  description: { fontSize: 13, color: '#aaa', marginTop: 8, lineHeight: 18 },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  statText: { fontSize: 12, color: '#555' },
});

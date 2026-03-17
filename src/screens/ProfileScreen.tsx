import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { mockVideos } from '../data/mockData';
import { getUploaderPoints } from '../utils/heatScore';

const myUploads = mockVideos.slice(0, 2);
const myDownloads = mockVideos.slice(2, 5);

// Total points earned from my uploads
const myPoints = myUploads.reduce((sum, v) => sum + getUploaderPoints(v), 0);
const myTotalLikes = myUploads.reduce((sum, v) => sum + v.likes, 0);
const myTotalDownloads = myUploads.reduce((sum, v) => sum + v.downloads, 0);

export default function ProfileScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🙌</Text>
          </View>
          <Text style={styles.username}>@you</Text>
          <Text style={styles.tagline}>Hands up. Phone down.</Text>

          {/* Points badge */}
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsValue}>{myPoints.toLocaleString()} pts</Text>
            <Text style={styles.pointsLabel}>Leaderboard points</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{myUploads.length}</Text>
              <Text style={styles.statLabel}>Uploads</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{myTotalDownloads.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Downloads</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{myTotalLikes.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Festivals</Text>
            </View>
          </View>
        </View>

        {/* My Uploads */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Uploads</Text>
          {myUploads.map((video) => (
            <TouchableOpacity
              key={video.id}
              style={styles.row}
              onPress={() => navigation.navigate('VideoDetail', { video })}
            >
              <Image source={{ uri: video.thumbnail }} style={styles.thumb} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowArtist}>{video.artist}</Text>
                <Text style={styles.rowFestival}>{video.festival}</Text>
                <Text style={styles.rowMeta}>{video.location} · {video.date}</Text>
                <View style={styles.rowStats}>
                  <Text style={styles.rowStat}>⬇ {video.downloads.toLocaleString()}</Text>
                  <Text style={styles.rowStat}>❤️ {video.likes.toLocaleString()}</Text>
                  <Text style={styles.rowStat}>💬 {video.comments.length}</Text>
                </View>
              </View>
              <View style={styles.rowPoints}>
                <Text style={styles.rowPointsValue}>{getUploaderPoints(video).toLocaleString()}</Text>
                <Text style={styles.rowPointsLabel}>pts</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* My Downloads */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Downloads</Text>
          {myDownloads.map((video) => (
            <TouchableOpacity
              key={video.id}
              style={styles.row}
              onPress={() => navigation.navigate('VideoDetail', { video })}
            >
              <Image source={{ uri: video.thumbnail }} style={styles.thumb} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowArtist}>{video.artist}</Text>
                <Text style={styles.rowFestival}>{video.festival}</Text>
                <Text style={styles.rowMeta}>{video.location} · {video.date}</Text>
                <View style={styles.rowStats}>
                  <Text style={styles.rowStat}>⬇ {video.downloads.toLocaleString()}</Text>
                  <Text style={styles.rowStat}>❤️ {video.likes.toLocaleString()}</Text>
                  <Text style={styles.rowStat}>💬 {video.comments.length}</Text>
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
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#8B5CF6', marginBottom: 10,
  },
  avatarText: { fontSize: 32 },
  username: { fontSize: 18, fontWeight: '700', color: '#fff' },
  tagline: { fontSize: 13, color: '#8B5CF6', marginTop: 3 },
  pointsBadge: {
    marginTop: 14, backgroundColor: '#1a1228', borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#8B5CF633',
  },
  pointsValue: { fontSize: 22, fontWeight: '900', color: '#8B5CF6' },
  pointsLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 24, marginTop: 20 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: '#555', marginTop: 2 },
  section: { padding: 16, paddingBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12, marginTop: 4 },
  row: {
    flexDirection: 'row', backgroundColor: '#161616', borderRadius: 12,
    overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: '#222',
    alignItems: 'center',
  },
  thumb: { width: 90, height: 72, backgroundColor: '#1a1a1a' },
  rowInfo: { flex: 1, padding: 10 },
  rowArtist: { fontSize: 14, fontWeight: '700', color: '#fff' },
  rowFestival: { fontSize: 12, color: '#8B5CF6', marginTop: 1 },
  rowMeta: { fontSize: 11, color: '#555', marginTop: 3 },
  rowStats: { flexDirection: 'row', gap: 10, marginTop: 5 },
  rowStat: { fontSize: 11, color: '#444' },
  rowPoints: { paddingRight: 14, alignItems: 'center' },
  rowPointsValue: { fontSize: 15, fontWeight: '800', color: '#8B5CF6' },
  rowPointsLabel: { fontSize: 10, color: '#555' },
});

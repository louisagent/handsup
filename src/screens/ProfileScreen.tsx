import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { mockVideos } from '../data/mockData';

const myUploads = mockVideos.slice(0, 2);
const myDownloads = mockVideos.slice(2, 5);

export default function ProfileScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🙌</Text>
        </View>
        <Text style={styles.username}>@you</Text>
        <Text style={styles.tagline}>Hands up. Phone down.</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{myUploads.length}</Text>
            <Text style={styles.statLabel}>Uploads</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{myDownloads.length}</Text>
            <Text style={styles.statLabel}>Downloads</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Festivals</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={[
          { title: 'My Uploads', data: myUploads },
          { title: 'My Downloads', data: myDownloads },
        ]}
        keyExtractor={(item) => item.title}
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.data.map((video) => (
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
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    marginBottom: 10,
  },
  avatarText: { fontSize: 32 },
  username: { fontSize: 18, fontWeight: '700', color: '#fff' },
  tagline: { fontSize: 13, color: '#8B5CF6', marginTop: 3 },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 20,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: '#555', marginTop: 2 },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  thumb: { width: 90, height: 68, backgroundColor: '#1a1a1a' },
  rowInfo: { flex: 1, padding: 10 },
  rowArtist: { fontSize: 14, fontWeight: '700', color: '#fff' },
  rowFestival: { fontSize: 12, color: '#8B5CF6', marginTop: 1 },
  rowMeta: { fontSize: 11, color: '#555', marginTop: 3 },
});

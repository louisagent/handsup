import React, { useState, useEffect } from 'react';
import { useSavedClips } from '../hooks/useSavedClips';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { VideoClip } from '../data/mockData';
import { getHeatBadge } from '../utils/heatScore';

export default function VideoDetailScreen({ route }: any) {
  const { video }: { video: VideoClip } = route.params;
  const [downloaded, setDownloaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const { isSaved, toggleSave } = useSavedClips();
  const saved = isSaved(video.id);

  const handleDownload = () => {
    setDownloaded(true);
    Alert.alert('Saved! 🙌', 'Video saved to your camera roll.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.thumbnailWrapper}>
        <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => setPlaying(!playing)}
        >
          <Text style={styles.playIcon}>{playing ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        {playing && (
          <View style={styles.playingBadge}>
            <Text style={styles.playingText}>▐▐ Playing... (mock)</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.artist}>{video.artist}</Text>
          {(() => {
            const badge = getHeatBadge(video);
            return badge ? (
              <View style={[styles.heatBadge, { backgroundColor: badge.color + '22', borderColor: badge.color + '55' }]}>
                <Text style={[styles.heatText, { color: badge.color }]}>{badge.emoji} {badge.label}</Text>
              </View>
            ) : null;
          })()}
        </View>
        <Text style={styles.festival}>{video.festival}</Text>
        <Text style={styles.meta}>
          📍 {video.location}   📅 {video.date}   ⏱ {video.duration}
        </Text>

        <Text style={styles.description}>{video.description}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{video.views.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{video.downloads.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Downloads</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>@{video.uploader}</Text>
            <Text style={styles.statLabel}>Uploaded by</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.downloadBtn, downloaded && styles.downloadedBtn]}
          onPress={handleDownload}
          disabled={downloaded}
        >
          <Text style={styles.downloadText}>
            {downloaded ? '✅ Saved to camera roll' : '⬇  Download to phone'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnActive]}
          onPress={() => toggleSave(video.id)}
        >
          <Text style={styles.saveBtnText}>
            {saved ? '🔖 Saved' : '🔖 Save clip'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { paddingBottom: 40 },
  thumbnailWrapper: { position: 'relative' },
  thumbnail: { width: '100%', height: 240, backgroundColor: '#1a1a1a' },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -28 }, { translateY: -28 }],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139,92,246,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 22, color: '#fff' },
  playingBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  playingText: { color: '#8B5CF6', fontSize: 12, fontWeight: '600' },
  body: { padding: 20 },
  artist: { fontSize: 24, fontWeight: '800', color: '#fff' },
  festival: { fontSize: 15, color: '#8B5CF6', marginTop: 4, fontWeight: '600' },
  meta: { fontSize: 13, color: '#666', marginTop: 8, lineHeight: 20 },
  description: {
    fontSize: 15,
    color: '#ccc',
    marginTop: 16,
    lineHeight: 22,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 28,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 11, color: '#555', marginTop: 2 },
  downloadBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  downloadedBtn: { backgroundColor: '#1a3a1a', borderWidth: 1, borderColor: '#2d5a2d' },
  downloadText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  heatBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  heatText: { fontSize: 12, fontWeight: '700' },
  saveBtn: {
    marginTop: 12, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#333', backgroundColor: 'transparent',
  },
  saveBtnActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.1)' },
  saveBtnText: { color: '#aaa', fontSize: 15, fontWeight: '600' },
});

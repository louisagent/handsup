import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { FestivalEvent } from '../data/eventsData';
import { mockVideos, VideoClip } from '../data/mockData';
import { sortByHeat, getHeatBadge } from '../utils/heatScore';

export default function EventDetailScreen({ route, navigation }: any) {
  const { event }: { event: FestivalEvent } = route.params;
  const [activeTab, setActiveTab] = useState<'clips' | 'info'>('clips');

  // Find clips matching this festival
  const clips = sortByHeat(
    mockVideos.filter(
      (v) =>
        v.festival.toLowerCase().includes(event.name.toLowerCase()) ||
        event.name.toLowerCase().includes(v.festival.toLowerCase())
    )
  );

  const goToClip = (video: VideoClip) =>
    navigation.navigate('VideoDetail', { video });

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: event.image }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          {event.upcoming && (
            <View style={styles.upcomingBadge}>
              <Text style={styles.upcomingText}>UPCOMING</Text>
            </View>
          )}
          {(event as any).isPartner && (
            <View style={styles.partnerBadge}>
              <Text style={styles.partnerText}>✓ Partner</Text>
            </View>
          )}
          <View style={styles.heroContent}>
            <Text style={styles.heroName}>{event.name}</Text>
            <Text style={styles.heroMeta}>📍 {event.location}, {event.country}  ·  📅 {event.dates}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{clips.length || event.clipCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Clips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{event.attendees}</Text>
            <Text style={styles.statLabel}>Attendees</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{event.genre.length}</Text>
            <Text style={styles.statLabel}>Genres</Text>
          </View>
        </View>

        {/* Genre tags */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreRow}
        >
          {event.genre.map((g) => (
            <View key={g} style={styles.genreChip}>
              <Text style={styles.genreText}>{g}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Tab toggle */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'clips' && styles.tabActive]}
            onPress={() => setActiveTab('clips')}
          >
            <Text style={[styles.tabText, activeTab === 'clips' && styles.tabTextActive]}>
              🎥 Clips
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.tabActive]}
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
              ℹ️ About
            </Text>
          </TouchableOpacity>
        </View>

        {/* Clips tab */}
        {activeTab === 'clips' && (
          <View style={styles.clipsSection}>
            {clips.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🎪</Text>
                <Text style={styles.emptyTitle}>No clips yet</Text>
                <Text style={styles.emptyBody}>
                  Be the first to upload footage from {event.name}!
                </Text>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => navigation.navigate('Upload')}
                >
                  <Text style={styles.uploadBtnText}>🙌 Upload a clip</Text>
                </TouchableOpacity>
              </View>
            ) : (
              clips.map((video) => {
                const badge = getHeatBadge(video);
                return (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.clipCard}
                    onPress={() => goToClip(video)}
                  >
                    <Image source={{ uri: video.thumbnail }} style={styles.clipThumb} />
                    <View style={styles.clipInfo}>
                      <View style={styles.clipTitleRow}>
                        <Text style={styles.clipArtist}>{video.artist}</Text>
                        {badge && (
                          <View style={[styles.heatBadge, { backgroundColor: badge.color + '22', borderColor: badge.color + '55' }]}>
                            <Text style={[styles.heatText, { color: badge.color }]}>{badge.emoji}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.clipMeta}>{video.location} · {video.date}</Text>
                      <Text style={styles.clipDesc} numberOfLines={2}>{video.description}</Text>
                      <View style={styles.clipStats}>
                        <Text style={styles.clipStat}>▶ {video.views.toLocaleString()}</Text>
                        <Text style={styles.clipStat}>⬇ {video.downloads.toLocaleString()}</Text>
                        <Text style={styles.clipStat}>⏱ {video.duration}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* Info tab */}
        {activeTab === 'info' && (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>About</Text>
            <Text style={styles.infoBody}>{event.description}</Text>

            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoBody}>📍 {event.location}, {event.country}</Text>

            <Text style={styles.infoLabel}>Dates</Text>
            <Text style={styles.infoBody}>📅 {event.dates}</Text>

            <Text style={styles.infoLabel}>Expected attendance</Text>
            <Text style={styles.infoBody}>👥 {event.attendees}</Text>

            {event.upcoming && (
              <TouchableOpacity style={styles.ticketBtn}>
                <Text style={styles.ticketBtnText}>🎟 Get tickets</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  heroWrap: { position: 'relative', height: 220 },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  upcomingBadge: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: '#8B5CF6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  upcomingText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  partnerBadge: {
    position: 'absolute', top: 14, left: 14,
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: '#8B5CF6',
  },
  partnerText: { color: '#8B5CF6', fontSize: 11, fontWeight: '700' },
  heroContent: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
  },
  heroName: { fontSize: 24, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  heroMeta: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161616', borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: '#555', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#2a2a2a' },
  genreRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  genreChip: {
    backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  genreText: { color: '#A78BFA', fontSize: 13, fontWeight: '600' },
  tabs: {
    flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: '#1a1a1a', backgroundColor: '#111',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#8B5CF6' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#555' },
  tabTextActive: { color: '#fff' },
  clipsSection: { padding: 16, gap: 10 },
  empty: { alignItems: 'center', padding: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  uploadBtn: {
    marginTop: 20, backgroundColor: '#8B5CF6', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  clipCard: {
    flexDirection: 'row', backgroundColor: '#161616', borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: '#222',
  },
  clipThumb: { width: 110, height: 82, backgroundColor: '#1a1a1a' },
  clipInfo: { flex: 1, padding: 12 },
  clipTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clipArtist: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
  heatBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  heatText: { fontSize: 12, fontWeight: '700' },
  clipMeta: { fontSize: 11, color: '#555', marginTop: 2 },
  clipDesc: { fontSize: 12, color: '#888', marginTop: 4, lineHeight: 17 },
  clipStats: { flexDirection: 'row', gap: 10, marginTop: 6 },
  clipStat: { fontSize: 11, color: '#444' },
  infoSection: { padding: 20, gap: 4 },
  infoLabel: { fontSize: 12, fontWeight: '700', color: '#8B5CF6', letterSpacing: 1, textTransform: 'uppercase', marginTop: 16, marginBottom: 4 },
  infoBody: { fontSize: 15, color: '#aaa', lineHeight: 22 },
  ticketBtn: {
    marginTop: 24, backgroundColor: '#8B5CF6', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  ticketBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

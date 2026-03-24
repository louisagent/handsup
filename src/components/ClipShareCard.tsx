// ============================================================
// Handsup — Clip Share Card
// Visual share card shown in the share bottom sheet
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Clip } from '../types';

export default function ClipShareCard({ clip }: { clip: Clip }) {
  return (
    <View style={styles.card}>
      {/* Thumbnail */}
      <View style={styles.thumbContainer}>
        {clip.thumbnail_url ? (
          <Image source={{ uri: clip.thumbnail_url }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="musical-notes" size={32} color="#333" />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />
        {/* Play button overlay */}
        <View style={styles.playBtn}>
          <Ionicons name="play" size={20} color="#fff" />
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>HANDS UP</Text>
          <Text style={styles.brandDot}>·</Text>
          <Text style={styles.brandSub}>Live Music Clips</Text>
        </View>
        <Text style={styles.artist} numberOfLines={1}>{clip.artist}</Text>
        <Text style={styles.festival} numberOfLines={1}>{clip.festival_name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={11} color="#666" />
          <Text style={styles.meta}>{clip.location}</Text>
        </View>
        <Text style={styles.url}>handsuplive.com/clip/{clip.id.slice(0, 8)}...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  thumbContainer: {
    height: 180,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  playBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -22,
    marginLeft: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139,92,246,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  info: {
    padding: 14,
    gap: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  brand: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 1.5,
  },
  brandDot: { color: '#333', fontSize: 10 },
  brandSub: { fontSize: 10, color: '#444', fontWeight: '600' },
  artist: { fontSize: 18, fontWeight: '800', color: '#fff' },
  festival: { fontSize: 13, color: '#8B5CF6', fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12, color: '#555' },
  url: { fontSize: 11, color: '#333', marginTop: 4 },
});

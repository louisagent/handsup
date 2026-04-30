// ============================================================
// SwipeableClipCard
// Swipe left to reveal Save and Share quick actions.
// Uses React Native Animated + PanResponder (no extra deps).
// ============================================================

import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  Animated,
  PanResponder,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Clip } from '../types';

const ACTION_WIDTH = 150; // total width of the revealed action tray
const SNAP_THRESHOLD = 60; // min drag to trigger snap-open

interface Props {
  video: Clip;
  isSaved: boolean;
  onToggleSave: (clipId: string) => void;
  onPress: () => void;
  onArtistPress: () => void;
  onLongPress: () => void;
  isActive?: boolean; // Auto-play muted video preview when active
}

export const SwipeableClipCard: React.FC<Props> = ({
  video,
  isSaved,
  onToggleSave,
  onPress,
  onArtistPress,
  onLongPress,
  isActive = false,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  const isSwiping = useRef(false);
  const dragStart = useRef(0);
  const videoRef = useRef<Video>(null);
  const [showVideo, setShowVideo] = useState(false);

  // Auto-play muted video when isActive is true
  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.playAsync().catch(() => {});
      setShowVideo(true);
    } else if (!isActive && videoRef.current) {
      videoRef.current.pauseAsync().catch(() => {});
      setShowVideo(false);
    }
  }, [isActive]);

  const snapToOpen = useCallback(() => {
    isOpen.current = true;
    Animated.spring(translateX, {
      toValue: -ACTION_WIDTH,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [translateX]);

  const snapToClose = useCallback(() => {
    isOpen.current = false;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      // Only intercept once the horizontal movement clearly beats vertical
      onMoveShouldSetPanResponder: (_, gs) => {
        const dx = Math.abs(gs.dx);
        const dy = Math.abs(gs.dy);
        return dx > 8 && dx > dy * 1.5;
      },
      onPanResponderGrant: (_, gs) => {
        isSwiping.current = false;
        dragStart.current = (translateX as any)._value ?? 0;
        translateX.extractOffset();
      },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dx) > 4) isSwiping.current = true;
        // Allow movement only leftward from closed, or rightward from open
        const next = dragStart.current + gs.dx;
        // Clamp: never go right past 0, never go left past -ACTION_WIDTH * 1.1
        const clamped = Math.max(-ACTION_WIDTH * 1.1, Math.min(0, next));
        translateX.setValue(clamped - (dragStart.current));
      },
      onPanResponderRelease: (_, gs) => {
        translateX.flattenOffset();
        const currentVal = (translateX as any)._value ?? 0;

        if (!isOpen.current) {
          // Opening direction: snap open if dragged far enough left
          if (gs.dx < -SNAP_THRESHOLD || currentVal < -SNAP_THRESHOLD) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            isOpen.current = true;
            Animated.spring(translateX, {
              toValue: -ACTION_WIDTH,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          } else {
            isOpen.current = false;
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 6,
            }).start();
          }
        } else {
          // Already open — snap back if dragged right enough
          if (gs.dx > SNAP_THRESHOLD || currentVal > -SNAP_THRESHOLD) {
            isOpen.current = false;
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 6,
            }).start();
          } else {
            isOpen.current = true;
            Animated.spring(translateX, {
              toValue: -ACTION_WIDTH,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          }
        }
        // Reset swiping flag after a tick so the tap handler sees it
        setTimeout(() => { isSwiping.current = false; }, 50);
      },
      onPanResponderTerminate: () => {
        translateX.flattenOffset();
        snapToClose();
        setTimeout(() => { isSwiping.current = false; }, 50);
      },
    })
  ).current;

  const handlePress = () => {
    if (isSwiping.current) return;
    if (isOpen.current) {
      snapToClose();
      return;
    }
    onPress();
  };

  const handleLongPress = () => {
    if (isSwiping.current) return;
    onLongPress();
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleSave(video.id);
    snapToClose();
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Share.share({
      message: `${video.artist} at ${video.festival_name}`,
      url: video.video_url,
    }).catch(() => {});
    snapToClose();
  };

  return (
    <View style={styles.wrapper}>
      {/* Action tray — sits behind the card */}
      <View style={styles.actionTray}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.saveBtn]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={styles.actionIcon}>{isSaved ? '★' : '💾'}</Text>
          <Text style={styles.actionLabel}>{isSaved ? 'Saved' : 'Save'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.shareBtn]}
          onPress={handleShare}
          activeOpacity={0.85}
        >
          <Text style={styles.actionIcon}>↗</Text>
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* The card itself */}
      <Animated.View
        style={[styles.cardOuter, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={400}
          activeOpacity={0.92}
        >
          {/* Thumbnail — full width, no margin */}
          <View style={styles.thumbnailContainer}>
            {showVideo && isActive && video.video_url ? (
              <Video
                ref={videoRef}
                source={{ uri: video.video_url }}
                style={styles.thumbnail}
                resizeMode={ResizeMode.COVER}
                isLooping
                isMuted
                shouldPlay={isActive}
              />
            ) : video.thumbnail_url ? (
              <Image source={{ uri: video.thumbnail_url }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.placeholderThumb]} />
            )}
            {video.duration_seconds != null && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{video.duration_seconds}s</Text>
              </View>
            )}
          </View>

          {/* Stats bar — directly below thumbnail; hidden when all counts are 0 */}
          {((video.view_count ?? 0) > 0 || video.download_count > 0 || (video.repost_count ?? 0) > 0 || video.duration_seconds != null) && (
            <View style={styles.statsBar}>
              {/* Views as PRIMARY stat */}
              {(video.view_count ?? 0) > 0 && (
                <>
                  <View style={styles.statCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ionicons name="eye-outline" size={12} color="#8B5CF6" />
                      <Text style={styles.statValue}>{(video.view_count ?? 0).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.statLabel}>Views</Text>
                  </View>
                  <View style={styles.statDivider} />
                </>
              )}
              {/* Downloads as secondary stat */}
              {video.download_count > 0 && (
                <>
                  <View style={styles.statCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ionicons name="arrow-down-circle-outline" size={12} color="#aaa" />
                      <Text style={styles.statValue}>{video.download_count.toLocaleString()}</Text>
                    </View>
                    <Text style={styles.statLabel}>Downloads</Text>
                  </View>
                  <View style={styles.statDivider} />
                </>
              )}
              {(video.repost_count ?? 0) > 0 && (
                <>
                  <View style={styles.statCol}>
                    <Text style={[styles.statValue, styles.repostValue]}>
                      🔁 {(video.repost_count ?? 0).toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Reposts</Text>
                  </View>
                  <View style={styles.statDivider} />
                </>
              )}
              <View style={styles.statCol}>
                <Text style={styles.statValue}>
                  {video.duration_seconds != null ? `${video.duration_seconds}s` : '—'}
                </Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
            </View>
          )}

          {/* Metadata — padded section below stats */}
          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <TouchableOpacity onPress={onArtistPress} style={{ flex: 1 }}>
                <Text style={styles.artist}>{video.artist}</Text>
              </TouchableOpacity>
              {/* Track ID pill */}
              <View style={styles.trackIdPill}>
                <Text style={styles.trackIdLabel}>ID: </Text>
                <Text style={styles.trackIdValue} numberOfLines={1}>
                  {video.track_name && video.track_artist
                    ? `${video.track_artist} – ${video.track_name}`
                    : 'Unknown'}
                </Text>
              </View>
            </View>
            <Text style={styles.festival}>{video.festival_name}</Text>
            {video.uploader?.username ? (
              <View style={styles.uploaderRow}>
                <Text style={styles.uploader}>@{video.uploader.username}</Text>
                {video.uploader.is_verified && (
                  <Text style={styles.verifiedBadge}>⚡</Text>
                )}
              </View>
            ) : null}
            <Text style={styles.meta}>
              {video.location} · {video.clip_date}
            </Text>
            {video.description ? (
              <Text style={styles.description} numberOfLines={2}>
                {video.description}
              </Text>
            ) : null}
            {isSaved && <Text style={styles.savedIndicator}>★ Saved</Text>}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    // No horizontal margin — thumbnail goes edge-to-edge
    marginBottom: 20,
    overflow: 'hidden',
  },
  actionTray: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    flexDirection: 'row',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  saveBtn: {
    backgroundColor: '#2563EB', // blue
  },
  shareBtn: {
    backgroundColor: '#16A34A', // green
  },
  actionIcon: {
    fontSize: 22,
    color: '#fff',
  },
  actionLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  // Card styles
  cardOuter: {
    // This layer moves; it sits on top of the action tray
  },
  card: {
    backgroundColor: '#161616',
    overflow: 'hidden',
    // No border — card-less card look
  },
  thumbnailContainer: { position: 'relative' },
  thumbnail: { width: '100%', aspectRatio: 9/16, backgroundColor: '#161616' },
  placeholderThumb: { backgroundColor: '#2a2a2a' },
  durationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Stats bar — compact 3-column directly below thumbnail
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#0d0d0d',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#2a2a2a',
  },
  statValue: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  repostValue: {
    color: '#10B981',
  },
  statLabel: {
    color: '#555',
    fontSize: 10,
    marginTop: 1,
  },

  // Metadata section
  cardBody: { paddingHorizontal: 14, paddingVertical: 12 },
  artist: { fontSize: 18, fontWeight: '700', color: '#fff' },
  festival: { fontSize: 14, color: '#8B5CF6', marginTop: 2, fontWeight: '600' },
  uploaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  uploader: { fontSize: 12, color: '#666' },
  verifiedBadge: { fontSize: 11, color: '#8B5CF6' },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  description: { fontSize: 13, color: '#aaa', marginTop: 8, lineHeight: 18 },
  savedIndicator: { fontSize: 12, color: '#8B5CF6', fontWeight: '700', marginTop: 6 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  trackIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    maxWidth: 140,
    flexShrink: 1,
  },
  trackIdLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 0.5,
  },
  trackIdValue: {
    fontSize: 10,
    color: '#888',
    fontWeight: '500',
    flex: 1,
  },
});

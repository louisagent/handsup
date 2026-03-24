import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ViewToken,
  StatusBar,
  ActivityIndicator,
  Animated,
  PanResponder,
  GestureResponderEvent,
  Share,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Clip } from '../types';
import { getRecentClips, recordDownload } from '../services/clips';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ── Double-tap hook ────────────────────────────────────────
function useDoubleTap(
  onDoubleTap: (x: number, y: number) => void,
  onSingleTap?: () => void,
  delay = 300
) {
  const lastTapRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = useCallback(
    (e: GestureResponderEvent) => {
      const now = Date.now();
      const { pageX, pageY } = e.nativeEvent;
      if (now - lastTapRef.current < delay) {
        // Double tap
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        onDoubleTap(pageX, pageY);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
        // Wait to see if second tap comes
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          onSingleTap?.();
          timerRef.current = null;
        }, delay);
      }
    },
    [onDoubleTap, onSingleTap, delay]
  );

  return handleTap;
}

// ── Floating Heart ─────────────────────────────────────────
function FloatingHeart({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.4,
        useNativeDriver: true,
        friction: 4,
        tension: 80,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: -60,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.floatingHeart,
        {
          left: x - 40,
          top: y - 40,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
        },
      ]}
    >
      <Text style={{ fontSize: 72 }}>❤️</Text>
    </Animated.View>
  );
}

// ── Swipe action overlay (Save / Share) ───────────────────
const SWIPE_THRESHOLD = 80;

function SwipeHints({ swipeDeltaX }: { swipeDeltaX: Animated.Value }) {
  // Save hint — appears on left edge when swiping LEFT (negative dx)
  const saveOpacity = swipeDeltaX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -20, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });
  const saveScale = swipeDeltaX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -20, 0],
    outputRange: [1.2, 0.9, 0.7],
    extrapolate: 'clamp',
  });

  // Share hint — appears on right edge when swiping RIGHT (positive dx)
  const shareOpacity = swipeDeltaX.interpolate({
    inputRange: [0, 20, SWIPE_THRESHOLD],
    outputRange: [0, 0.4, 1],
    extrapolate: 'clamp',
  });
  const shareScale = swipeDeltaX.interpolate({
    inputRange: [0, 20, SWIPE_THRESHOLD],
    outputRange: [0.7, 0.9, 1.2],
    extrapolate: 'clamp',
  });

  return (
    <>
      {/* Left edge: Save hint (swipe left → save) */}
      <Animated.View style={[styles.swipeHintLeft, { opacity: saveOpacity, transform: [{ scale: saveScale }] }]}>
        <Ionicons name="bookmark" size={22} color="#fff" />
        <Text style={styles.swipeHintText}>Save</Text>
      </Animated.View>

      {/* Right edge: Share hint (swipe right → share) */}
      <Animated.View style={[styles.swipeHintRight, { opacity: shareOpacity, transform: [{ scale: shareScale }] }]}>
        <Ionicons name="arrow-redo" size={22} color="#fff" />
        <Text style={styles.swipeHintText}>Share</Text>
      </Animated.View>
    </>
  );
}

// ── Action flash overlay (Saved / Shared) ─────────────────
function ActionFlash({ label, visible }: { label: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.delay(700),
        Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View pointerEvents="none" style={[styles.actionFlash, { opacity }]}>
      <Text style={styles.actionFlashText}>{label}</Text>
    </Animated.View>
  );
}

// ── Per-item component ─────────────────────────────────────

interface FeedItemProps {
  item: Clip;
  isVisible: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  navigation: any;
}

function FeedItem({ item, isVisible, isMuted, onToggleMute, navigation }: FeedItemProps) {
  const videoRef = useRef<Video>(null);
  const [liked, setLiked] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const heartIdRef = useRef(0);
  const swipeDeltaX = useRef(new Animated.Value(0)).current;
  const [overlayVisible, setOverlayVisible] = useState(true);
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  const toggleOverlay = useCallback(() => {
    const toValue = overlayVisible ? 0 : 1;
    setOverlayVisible(!overlayVisible);
    Animated.timing(overlayOpacity, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [overlayVisible, overlayOpacity]);

  // Swipe action flash state
  const [savedFlash, setSavedFlash] = useState(false);
  const [sharedFlash, setSharedFlash] = useState(false);
  const savedFlashKey = useRef(0);
  const sharedFlashKey = useRef(0);

  // Play / pause based on visibility
  React.useEffect(() => {
    if (!videoRef.current) return;
    if (isVisible) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [isVisible]);

  const handleLike = useCallback(() => {
    if (!liked) {
      setLiked(true);
    }
  }, [liked]);

  // Double-tap handler
  const handleDoubleTap = useCallback(
    (x: number, y: number) => {
      handleLike();
      const id = ++heartIdRef.current;
      setHearts((prev) => [...prev, { id, x, y }]);
    },
    [handleLike]
  );

  const doubleTapHandler = useDoubleTap(handleDoubleTap, toggleOverlay);

  // ── Save action ────────────────────────────────────────
  const handleSave = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Record download / save
    recordDownload(item.id).catch(() => {});
    // Show flash
    savedFlashKey.current += 1;
    setSavedFlash((v) => !v); // toggle to re-trigger useEffect in ActionFlash
    // Force re-render by using a counter approach — simpler: just call setSavedFlash(true)
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 10); // reset so next swipe can trigger again
  }, [item.id]);

  // ── Share action ────────────────────────────────────────
  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const shareUrl = `https://handsuplive.com/clip/${item.id}`;
    try {
      await Share.share({
        message: `Check out this clip of ${item.artist} at ${item.festival_name} on handsup.live!\n${shareUrl}`,
        url: shareUrl,
        title: `${item.artist} – ${item.festival_name}`,
      });
    } catch {
      // Share dismissed or failed — no-op
    }
    setSharedFlash(true);
    setTimeout(() => setSharedFlash(false), 10);
  }, [item]);

  // ── Swipe left/right pan responder ─────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Only capture if predominantly horizontal
        return Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
      },
      onPanResponderMove: (_evt, gestureState) => {
        swipeDeltaX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        Animated.spring(swipeDeltaX, { toValue: 0, useNativeDriver: true }).start();
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right → Share
          handleShare();
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left → Save
          handleSave();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeDeltaX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const artistInitials = item.artist
    ? item.artist.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const uploaderName = item.uploader?.username ?? 'unknown';

  const handleDownload = async () => {
    await recordDownload(item.id).catch(() => {});
  };

  return (
    <View style={styles.itemContainer}>
      {/* Video layer */}
      {item.video_url ? (
        <Video
          ref={videoRef}
          source={{ uri: item.video_url }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted={isMuted}
          shouldPlay={isVisible}
          onPlaybackStatusUpdate={(_status: AVPlaybackStatus) => {}}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholderVideo]} />
      )}

      {/* Dark gradient overlay at bottom */}
      <View style={styles.bottomGradient} pointerEvents="none" />

      {/* Swipe hints */}
      <SwipeHints swipeDeltaX={swipeDeltaX} />

      {/* Gesture layer — double-tap to like, swipe to navigate */}
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => doubleTapHandler(e)}
        {...panResponder.panHandlers}
      />

      {/* Floating hearts */}
      {hearts.map((h) => (
        <FloatingHeart
          key={h.id}
          x={h.x}
          y={h.y}
          onDone={() => setHearts((prev) => prev.filter((hh) => hh.id !== h.id))}
        />
      ))}

      {/* Swipe action flash overlays */}
      <ActionFlash label="Saved 🔖" visible={savedFlash} />
      <ActionFlash label="Shared 🔗" visible={sharedFlash} />

      {/* Overlay — fades in/out on single tap */}
      <Animated.View style={[styles.overlayWrapper, { opacity: overlayOpacity }]} pointerEvents={overlayVisible ? 'box-none' : 'none'}>

      {/* Artist avatar — top right */}
      <View style={styles.avatarTopRight}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{artistInitials}</Text>
        </View>
      </View>

      {/* Bottom overlay — tappable top half → VideoDetail, bottom row has action buttons */}
      <View style={styles.bottomOverlay}>
        {/* Tappable info area */}
        <TouchableOpacity
          onPress={() => navigation.navigate('VideoDetail', { video: item })}
          activeOpacity={0.9}
          style={styles.bottomInfoArea}
        >
          <Text style={styles.artistName}>{item.artist}</Text>
          <View style={styles.trackIdPill}>
            <Text style={styles.trackIdLabel}>ID: </Text>
            <Text style={styles.trackIdValue} numberOfLines={1}>
              {item.track_name && item.track_artist
                ? `${item.track_artist} – ${item.track_name}`
                : 'Unknown'}
            </Text>
          </View>
          <Text style={styles.festivalName}>{item.festival_name}</Text>
          <Text style={styles.uploaderName}>@{uploaderName}</Text>
        </TouchableOpacity>

        {/* Bottom action row — location/date + like/comment/share/save */}
        <View style={styles.bottomActionRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            {item.location}{item.clip_date ? ` · ${item.clip_date}` : ''}
          </Text>
          <View style={styles.inlineActions}>
            <TouchableOpacity style={styles.inlineActionBtn} onPress={handleLike} activeOpacity={0.85}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#EF4444' : '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inlineActionBtn} onPress={() => navigation.navigate('VideoDetail', { video: item })} activeOpacity={0.85}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inlineActionBtn} onPress={handleDownload} activeOpacity={0.85}>
              <Ionicons name="download-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inlineActionBtn} activeOpacity={0.85}>
              <Ionicons name="arrow-redo-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      </Animated.View>{/* end overlay wrapper */}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────

export default function VerticalFeedScreen({ navigation, route }: any) {
  // Route params: clips, startIndex, initialClip
  const routeClips: Clip[] | undefined = route?.params?.clips;
  const routeInitialClip: Clip | undefined = route?.params?.initialClip;
  const routeStartIndex: number | undefined = route?.params?.startIndex;

  const [clips, setClips] = useState<Clip[]>(
    routeClips ? routeClips.filter((c, idx, arr) => arr.findIndex(x => x.id === c.id) === idx) : []
  );
  const [loading, setLoading] = useState(!routeClips);
  const [error, setError] = useState<string | null>(null);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const flatListRef = useRef<FlatList<Clip>>(null);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setVisibleIndex(viewableItems[0].index);
      }
    }
  ).current;

  const loadClips = useCallback(async () => {
    // If clips were passed via route, skip fetching
    if (routeClips) return;

    try {
      setError(null);
      setLoading(true);
      const data = await getRecentClips(20);

      if (routeInitialClip) {
        // Prepend the initial clip and remove any duplicate
        const filtered = data.filter((c) => c.id !== routeInitialClip.id);
        setClips([routeInitialClip, ...filtered]);
      } else {
        setClips(data);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load clips');
    } finally {
      setLoading(false);
    }
  }, [routeClips, routeInitialClip]);

  useFocusEffect(
    useCallback(() => {
      if (routeClips) return; // Don't reload if clips provided via route
      loadClips();
      return () => {};
    }, [loadClips, routeClips])
  );

  // Scroll to startIndex once clips are available
  useEffect(() => {
    if (clips.length === 0) return;
    const idx = routeStartIndex ?? 0;
    if (idx > 0 && flatListRef.current) {
      // Small delay to let FlatList lay out
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: Math.min(idx, clips.length - 1), animated: false });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [clips, routeStartIndex]);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading feed…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <Ionicons name="warning-outline" size={48} color="#555" />
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadClips} activeOpacity={0.85}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (clips.length === 0) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <Ionicons name="videocam-outline" size={64} color="#333" />
        <Text style={styles.emptyText}>No clips yet</Text>
        <Text style={styles.emptySubText}>Be the first to upload! 🙌</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" hidden />
      <FlatList
        ref={flatListRef}
        data={clips}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={screenHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={3}
        onScrollToIndexFailed={(info) => {
          // Gracefully handle scroll-to-index failures
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 500);
        }}
        renderItem={({ item, index }) => (
          <FeedItem
            item={item}
            isVisible={index === visibleIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((m) => !m)}
            navigation={navigation}
          />
        )}
        getItemLayout={(_data, index) => ({
          length: screenHeight,
          offset: screenHeight * index,
          index,
        })}
      />


    </View>
  );
}

const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.9)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: '#888', fontSize: 14, marginTop: 8 },
  errorText: { color: '#EF4444', fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  retryText: { color: '#8B5CF6', fontWeight: '700' },
  emptyText: { color: '#888', fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptySubText: { color: '#555', fontSize: 14 },

  // Feed item
  itemContainer: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  placeholderVideo: {
    backgroundColor: '#1a1a1a',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: 'transparent',
  },

  // Floating heart
  floatingHeart: {
    position: 'absolute',
    zIndex: 99,
    pointerEvents: 'none',
  },

  // Swipe hints
  swipeHintLeft: {
    position: 'absolute',
    left: 20,
    top: '50%',
    zIndex: 10,
    backgroundColor: 'rgba(139,92,246,0.75)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  swipeHintRight: {
    position: 'absolute',
    right: 20,
    top: '50%',
    zIndex: 10,
    backgroundColor: 'rgba(139,92,246,0.75)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  swipeHintText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    ...SHADOW,
  },

  // Action flash overlay (Saved / Shared)
  actionFlash: {
    position: 'absolute',
    alignSelf: 'center',
    top: '42%',
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    pointerEvents: 'none',
  },
  actionFlashText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    ...SHADOW,
  },

  // Right action column
  overlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },

  // Avatar top-right
  avatarTopRight: {
    position: 'absolute',
    top: 60,
    right: 16,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },

  // Bottom overlay
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingBottom: 36,
  },
  bottomInfoArea: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  bottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineActionBtn: {
    padding: 8,
  },

  artistName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    ...SHADOW,
  },
  trackIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    maxWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
  },
  trackIdLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 0.5,
  },
  trackIdValue: {
    fontSize: 10,
    color: '#ddd',
    fontWeight: '500',
    flex: 1,
  },
  festivalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#A78BFA',
    marginTop: 2,
    ...SHADOW,
  },
  uploaderName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    ...SHADOW,
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 3,
    ...SHADOW,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
    lineHeight: 18,
    ...SHADOW,
  },

  // Mute button — top-right
  muteBtn: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    padding: 8,
  },

  // Details button — below mute button, top-right
  detailsBtn: {
    position: 'absolute',
    top: 112,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    padding: 8,
  },

  // Back button
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});

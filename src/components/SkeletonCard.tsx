import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

// ---------------------------------------------------------------------------
// Shared hook — creates a looping opacity pulse animation
// ---------------------------------------------------------------------------
function useShimmer(): Animated.Value {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return opacity;
}

// ---------------------------------------------------------------------------
// SkeletonCard — mimics a full video clip card in the recent feed
// ---------------------------------------------------------------------------
export function SkeletonCard() {
  const opacity = useShimmer();

  return (
    <View style={styles.card}>
      {/* Thumbnail */}
      <Animated.View style={[styles.thumbnail, { opacity }]} />

      {/* Text lines */}
      <View style={styles.cardBody}>
        {/* Artist name — wide */}
        <Animated.View style={[styles.lineWide, { opacity }]} />
        {/* Festival — medium */}
        <Animated.View style={[styles.lineMedium, { opacity }]} />
        {/* Meta — narrow */}
        <Animated.View style={[styles.lineNarrow, { opacity }]} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SkeletonTrendCard — mimics the horizontal trending strip card (200×140)
// ---------------------------------------------------------------------------
export function SkeletonTrendCard() {
  const opacity = useShimmer();

  return (
    <View style={styles.trendCard}>
      {/* Card image area */}
      <Animated.View style={[styles.trendThumb, { opacity }]} />
      {/* Single text line at bottom */}
      <Animated.View style={[styles.trendLine, { opacity }]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// SkeletonSearchRow — mimics a search result row (thumbnail left, text right)
// ---------------------------------------------------------------------------
export function SkeletonSearchRow() {
  const opacity = useShimmer();

  return (
    <View style={styles.searchCard}>
      {/* Thumbnail */}
      <Animated.View style={[styles.searchThumb, { opacity }]} />

      {/* Text lines */}
      <View style={styles.searchInfo}>
        <Animated.View style={[styles.searchLineWide, { opacity }]} />
        <Animated.View style={[styles.searchLineMedium, { opacity }]} />
        <Animated.View style={[styles.searchLineNarrow, { opacity }]} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const SKELETON_BG = '#1a1a1a';
const CARD_BG = '#161616';
const CARD_BORDER = '#222';

const styles = StyleSheet.create({
  // ---- SkeletonCard ----
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: SKELETON_BG,
  },
  cardBody: {
    padding: 14,
    gap: 10,
  },
  lineWide: {
    height: 16,
    borderRadius: 6,
    backgroundColor: SKELETON_BG,
    width: '70%',
  },
  lineMedium: {
    height: 13,
    borderRadius: 6,
    backgroundColor: SKELETON_BG,
    width: '50%',
  },
  lineNarrow: {
    height: 11,
    borderRadius: 6,
    backgroundColor: SKELETON_BG,
    width: '35%',
  },

  // ---- SkeletonTrendCard ----
  trendCard: {
    width: 200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: SKELETON_BG,
    gap: 8,
    paddingBottom: 10,
  },
  trendThumb: {
    width: 200,
    height: 140,
    backgroundColor: SKELETON_BG,
  },
  trendLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#252525',
    marginHorizontal: 10,
    width: '60%',
  },

  // ---- SkeletonSearchRow ----
  searchCard: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  searchThumb: {
    width: 100,
    height: 75,
    backgroundColor: SKELETON_BG,
  },
  searchInfo: {
    flex: 1,
    padding: 12,
    gap: 8,
    justifyContent: 'center',
  },
  searchLineWide: {
    height: 13,
    borderRadius: 6,
    backgroundColor: SKELETON_BG,
    width: '80%',
  },
  searchLineMedium: {
    height: 11,
    borderRadius: 6,
    backgroundColor: SKELETON_BG,
    width: '55%',
  },
  searchLineNarrow: {
    height: 10,
    borderRadius: 6,
    backgroundColor: SKELETON_BG,
    width: '40%',
  },
});

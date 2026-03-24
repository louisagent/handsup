/**
 * LazyImage — Drop-in thumbnail component with shimmer placeholder + fade-in.
 *
 * Usage:
 *   <LazyImage uri={url} style={styles.thumbnail} />
 *
 * The `style` prop is applied to the container View (must supply fixed or
 * percentage-based width/height so the shimmer and image fill it correctly).
 */

import React, { useRef, useState } from 'react';
import { Animated, Image, ImageResizeMode, StyleSheet, View } from 'react-native';

// ---------------------------------------------------------------------------
// Shimmer pulse
// ---------------------------------------------------------------------------
function useShimmer(): Animated.Value {
  const shimmer = useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.8, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  return shimmer;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface LazyImageProps {
  uri: string;
  /** Applied to the wrapper View — must include width & height (or fill). */
  style?: any;
  resizeMode?: ImageResizeMode;
}

export function LazyImage({ uri, style, resizeMode = 'cover' }: LazyImageProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [loaded, setLoaded] = useState(false);
  const shimmerOpacity = useShimmer();

  const handleLoad = () => {
    setLoaded(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      {/* Shimmer placeholder — shown until image resolves */}
      {!loaded && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1a1a', opacity: shimmerOpacity }]}
        />
      )}

      {/* Fading image layer */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={resizeMode}
          onLoadStart={() => {/* opacity already 0 */}}
          onLoad={handleLoad}
        />
      </Animated.View>
    </View>
  );
}

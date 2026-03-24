// ============================================================
// Handsup — Branded Splash Screen
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // Pulse animation for the hand icon
  const pulseScale = useRef(new Animated.Value(1)).current;

  // Wave animations (3 concentric rings)
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence: logo in → wordmark → tagline → pulse → waves → pause → fade out
    Animated.sequence([
      // 1. Logo scales + fades in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // 2. Wordmark fades in
      Animated.timing(wordmarkOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // 3. Tagline fades in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // 4. Brief pause
      Animated.delay(200),
      // 5. Pulse the logo once
      Animated.sequence([
        Animated.spring(pulseScale, {
          toValue: 1.08,
          tension: 200,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(pulseScale, {
          toValue: 1,
          tension: 200,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
      // 6. Hold
      Animated.delay(500),
      // 7. Fade out entire screen
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDone();
    });

    // Waves animate independently (looping)
    const animateWaves = () => {
      wave1.setValue(0);
      wave2.setValue(0);
      wave3.setValue(0);
      Animated.stagger(180, [
        Animated.timing(wave1, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(wave2, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(wave3, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]).start(() => animateWaves());
    };

    const waveTimeout = setTimeout(animateWaves, 600);
    return () => clearTimeout(waveTimeout);
  }, []);

  const waveStyle = (anim: Animated.Value, size: number) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    position: 'absolute' as const,
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] }),
    transform: [{
      scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }),
    }],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <LinearGradient
        colors={['#0d0020', '#000000', '#0a001a']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Waves + Logo — all centred together */}
      <View style={styles.waveContainer} pointerEvents="none">
        <Animated.View style={waveStyle(wave1, 200)} />
        <Animated.View style={waveStyle(wave2, 280)} />
        <Animated.View style={waveStyle(wave3, 360)} />

        {/* Logo sits in the exact centre of the waves */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: Animated.multiply(logoScale, pulseScale) }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.logoCircleClip}>
            <Image
              source={require('../../assets/logo-source.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
        </Animated.View>
      </View>


    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  waveContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  logoContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  logoCircleClip: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  logoImage: {
    width: 110,
    height: 110,
  },
  wordmark: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 8,
    marginTop: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#A78BFA',
    fontWeight: '500',
    letterSpacing: 1,
  },
});

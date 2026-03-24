import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const goNext = () => {
    if (currentIndex < 2) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
    }
  };

  const handleDone = async () => {
    try {
      await AsyncStorage.setItem('handsup_onboarded', 'true');
    } catch {}
    onDone();
  };

  return (
    <View style={styles.container}>
      {/* Skip button — only on slides 1 and 2 */}
      {currentIndex < 2 && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleDone}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {/* Slide 1 — Logo */}
        <View style={[styles.slide, { width }]}>
          <View style={styles.glowBehind} />
          <Image
            source={require('../../assets/logo-primary-source.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <Text style={styles.slideTagline}>be there. we'll film it.</Text>
        </View>

        {/* Slide 2 — Film the moment */}
        <View style={[styles.slide, { width }]}>
          <View style={styles.glowBehind} />
          <Ionicons name="videocam" size={80} color="#8B5CF6" style={styles.slideIcon} />
          <Text style={styles.slideTitle}>Film the moment</Text>
          <Text style={styles.slideSubtitle}>
            Upload clips from any festival, any artist, any night. 60 seconds of pure energy.
          </Text>
        </View>

        {/* Slide 3 — Find your crew */}
        <View style={[styles.slide, { width }]}>
          <View style={styles.glowBehind} />
          <Ionicons name="people" size={80} color="#8B5CF6" style={styles.slideIcon} />
          <Text style={styles.slideTitle}>Find your crew</Text>
          <Text style={styles.slideSubtitle}>
            Follow friends, create groups, build your festival archive together.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.bottomArea}>
        {/* Pagination dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.btnArea}>
          {currentIndex < 2 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.8}>
              <Text style={styles.nextBtnText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleDone} activeOpacity={0.88} style={styles.getStartedWrapper}>
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.getStartedBtn}
              >
                <Text style={styles.getStartedText}>Get Started 🙌</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: 80,
    paddingBottom: 40,
  },
  glowBehind: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(139,92,246,0.12)',
    top: '20%',
    alignSelf: 'center',
  },
  logoImage: {
    width: 180,
    height: 180,
    marginBottom: 28,
  },
  slideIcon: {
    marginBottom: 28,
  },
  slideTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 12,
  },
  slideTagline: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  slideSubtitle: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  bottomArea: {
    paddingBottom: 56,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#8B5CF6',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#333333',
  },
  btnArea: {
    width: '100%',
  },
  nextBtn: {
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#8B5CF6',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  getStartedWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  getStartedBtn: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 16,
  },
  getStartedText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  skipBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingTop: 60,
    paddingRight: 20,
    zIndex: 10,
  },
  skipText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },
});

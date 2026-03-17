import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const slides = [
  {
    emoji: '🎪',
    title: 'You paid for the experience.',
    subtitle: 'Not to spend it staring at a screen.',
    body: 'Handsup exists so you can put your phone down and actually be there.',
    bg: '#0D0D0D',
  },
  {
    emoji: '🔍',
    title: 'Find the moment\nyou were part of.',
    subtitle: 'Search by artist, festival, city, or date.',
    body: 'Every set from every stage — uploaded by people who were right there with you.',
    bg: '#0D0D0D',
  },
  {
    emoji: '⬇',
    title: 'Download it.\nIt\'s yours.',
    subtitle: 'Save straight to your camera roll.',
    body: 'No watermark. No paywall. Just the clip, on your phone, ready to share.',
    bg: '#0D0D0D',
  },
  {
    emoji: '🙌',
    title: 'Film once.\nShare forever.',
    subtitle: 'If you do film something great — upload it.',
    body: 'Every clip you upload is a memory for thousands of people who were there.',
    bg: '#0D0D0D',
  },
];

interface OnboardingScreenProps {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrent(index);
  };

  const handleNext = () => {
    if (current < slides.length - 1) {
      goTo(current + 1);
    } else {
      handleDone();
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
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrent(index);
        }}
      >
        {slides.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={styles.glow} />
            <Text style={styles.emoji}>{slide.emoji}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View style={[styles.dot, i === current && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleNext}>
          <Text style={styles.btnPrimaryText}>
            {current < slides.length - 1 ? 'Next' : "Let's go 🙌"}
          </Text>
        </TouchableOpacity>
        {current < slides.length - 1 && (
          <TouchableOpacity style={styles.btnSkip} onPress={handleDone}>
            <Text style={styles.btnSkipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 60,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: 80,
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(139,92,246,0.12)',
    top: '20%',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -1,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2a2a2a',
  },
  dotActive: {
    backgroundColor: '#8B5CF6',
    width: 24,
  },
  actions: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  btnSkip: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  btnSkipText: {
    color: '#444',
    fontSize: 14,
    fontWeight: '600',
  },
});

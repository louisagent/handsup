/**
 * NotificationsConceptScreen
 *
 * A mockup showing what handsup push notifications look like on a device —
 * lock screen banners and grouped alerts, styled to match the brand.
 * This is a UI concept screen (e.g. for App Store screenshots / investor demos),
 * not a live notification feed.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width } = Dimensions.get('window');
const PHONE_WIDTH = Math.min(width - 40, 360);

// Push notification examples shown in the mockup
const pushNotifications = [
  {
    id: '1',
    app: 'handsup 🙌',
    time: 'now',
    title: 'New Tame Impala clips are live',
    body: '14 uploads just dropped from Laneway Melbourne.',
    highlight: true,
  },
  {
    id: '2',
    app: 'handsup 🙌',
    time: '2m ago',
    title: 'Trending: Fred again.. at Field Day 🔥',
    body: '800 downloads in the last hour.',
    highlight: false,
  },
  {
    id: '3',
    app: 'handsup 🙌',
    time: '18m ago',
    title: 'Your Flume clip is taking off',
    body: '47 people downloaded your upload today.',
    highlight: false,
  },
  {
    id: '4',
    app: 'handsup 🙌',
    time: '1h ago',
    title: 'Splendour in the Grass — clips live 🎪',
    body: '389 uploads across 3 stages from the weekend.',
    highlight: false,
  },
];

// Feature callout cards below the phone mockup
const featureCards = [
  {
    icon: '🎥',
    headline: 'New clips, instantly',
    description:
      'Get notified the moment fresh footage drops from your favourite artists and festivals.',
  },
  {
    icon: '🔥',
    headline: 'Trending alerts',
    description:
      'Know when a set is blowing up before everyone else does.',
  },
  {
    icon: '⬆️',
    headline: 'Your uploads, tracked',
    description:
      'See how many people saved your clip — without checking the app.',
  },
  {
    icon: '⚙️',
    headline: 'You control it',
    description:
      'Pick exactly what to be notified about. No spam. Just the moments that matter.',
  },
];

function PushBanner({
  notification,
  delay,
}: {
  notification: (typeof pushNotifications)[0];
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.banner,
        notification.highlight && styles.bannerHighlight,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.bannerHeader}>
        <Text style={styles.bannerApp}>{notification.app}</Text>
        <Text style={styles.bannerTime}>{notification.time}</Text>
      </View>
      <Text style={styles.bannerTitle}>{notification.title}</Text>
      <Text style={styles.bannerBody}>{notification.body}</Text>
    </Animated.View>
  );
}

export default function NotificationsConceptScreen() {
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Page header */}
        <Animated.View
          style={[
            styles.pageHeader,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.pageTitle}>Stay in the loop</Text>
          <Text style={styles.pageSubtitle}>
            handsup keeps you connected to the moments that matter — without
            keeping you glued to your phone.
          </Text>
        </Animated.View>

        {/* Phone mockup */}
        <View style={styles.phoneMockupWrap}>
          <View style={[styles.phoneMockup, { width: PHONE_WIDTH }]}>
            {/* Phone chrome */}
            <View style={styles.phoneScreen}>
              {/* Lock screen time */}
              <View style={styles.lockScreenTop}>
                <Text style={styles.lockTime}>11:47</Text>
                <Text style={styles.lockDate}>Wednesday, 18 March</Text>
              </View>

              {/* Push notification banners */}
              <View style={styles.bannersWrap}>
                {pushNotifications.map((n, i) => (
                  <PushBanner key={n.id} notification={n} delay={300 + i * 150} />
                ))}
              </View>

              {/* Bottom hint */}
              <Text style={styles.lockHint}>swipe to open · slide to dismiss</Text>
            </View>

            {/* Phone notch */}
            <View style={styles.notch} />
            {/* Home indicator */}
            <View style={styles.homeIndicator} />
          </View>

          {/* Glow behind phone */}
          <View style={styles.phoneGlow} />
        </View>

        {/* Feature cards */}
        <View style={styles.cardsWrap}>
          {featureCards.map((card) => (
            <View key={card.icon} style={styles.card}>
              <Text style={styles.cardIcon}>{card.icon}</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardHeadline}>{card.headline}</Text>
                <Text style={styles.cardDescription}>{card.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom CTA */}
        <View style={styles.ctaWrap}>
          <Text style={styles.ctaText}>
            Hands up. Phone down. We'll handle the rest.
          </Text>
          <Text style={styles.ctaEmoji}>🙌</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scroll: {
    paddingBottom: 60,
  },

  // Page header
  pageHeader: {
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  // Phone mockup
  phoneMockupWrap: {
    alignItems: 'center',
    marginBottom: 40,
  },
  phoneMockup: {
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#333',
    backgroundColor: '#111',
    overflow: 'hidden',
    minHeight: 580,
    position: 'relative',
    zIndex: 2,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: '#0a0015',
    paddingHorizontal: 14,
    paddingTop: 60,
    paddingBottom: 40,
    minHeight: 580,
  },
  lockScreenTop: {
    alignItems: 'center',
    marginBottom: 28,
  },
  lockTime: {
    fontSize: 64,
    fontWeight: '200',
    color: '#ffffff',
    letterSpacing: -2,
  },
  lockDate: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: -4,
  },
  notch: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 120,
    height: 28,
    backgroundColor: '#0a0015',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    zIndex: 10,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Notification banners
  bannersWrap: {
    gap: 8,
  },
  banner: {
    backgroundColor: 'rgba(22,22,22,0.92)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bannerHighlight: {
    borderColor: 'rgba(139,92,246,0.5)',
    backgroundColor: 'rgba(139,92,246,0.12)',
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bannerApp: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 17,
  },
  lockHint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    marginTop: 20,
    letterSpacing: 0.5,
  },
  phoneGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(139,92,246,0.2)',
    bottom: -40,
    zIndex: 1,
  },

  // Feature cards
  cardsWrap: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
    gap: 14,
  },
  cardIcon: {
    fontSize: 26,
    lineHeight: 34,
  },
  cardBody: {
    flex: 1,
  },
  cardHeadline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },

  // Bottom CTA
  ctaWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaEmoji: {
    fontSize: 32,
  },
});

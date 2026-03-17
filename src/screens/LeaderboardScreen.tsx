import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderEntry {
  rank: number;
  username: string;
  avatar: string; // emoji stand-in
  clips: number;
  downloads: number;
  points: number;
  badge: string;
  streak: number; // active upload days
  topFestival: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const allTimeLeaders: LeaderEntry[] = [
  {
    rank: 1,
    username: 'tom_d',
    avatar: '🎸',
    clips: 48,
    downloads: 32400,
    points: 9840,
    badge: '🏆 Legend',
    streak: 14,
    topFestival: 'Field Day',
  },
  {
    rank: 2,
    username: 'wave_rider',
    avatar: '🌊',
    clips: 39,
    downloads: 28100,
    points: 8310,
    badge: '🔥 On Fire',
    streak: 9,
    topFestival: 'Splendour in the Grass',
  },
  {
    rank: 3,
    username: 'jess_m',
    avatar: '💜',
    clips: 31,
    downloads: 21700,
    points: 6920,
    badge: '⭐ Top Fan',
    streak: 6,
    topFestival: 'Laneway Festival',
  },
  {
    rank: 4,
    username: 'desert_vibes',
    avatar: '🌵',
    clips: 24,
    downloads: 14200,
    points: 4800,
    badge: '🎯 Reliable',
    streak: 3,
    topFestival: 'Coachella',
  },
  {
    rank: 5,
    username: 'uk_crew',
    avatar: '🇬🇧',
    clips: 19,
    downloads: 11600,
    points: 3990,
    badge: '🎯 Reliable',
    streak: 2,
    topFestival: 'Glastonbury',
  },
  {
    rank: 6,
    username: 'meredith_fan',
    avatar: '🌅',
    clips: 15,
    downloads: 7800,
    points: 2950,
    badge: '🌱 Rising',
    streak: 4,
    topFestival: 'Meredith Music Festival',
  },
  {
    rank: 7,
    username: 'pit_life',
    avatar: '🎤',
    clips: 12,
    downloads: 6100,
    points: 2340,
    badge: '🌱 Rising',
    streak: 1,
    topFestival: 'Laneway Festival',
  },
  {
    rank: 8,
    username: 'neon_nights',
    avatar: '🌃',
    clips: 10,
    downloads: 4900,
    points: 1870,
    badge: '🌱 Rising',
    streak: 0,
    topFestival: 'Field Day',
  },
];

const monthlyLeaders: LeaderEntry[] = [
  { ...allTimeLeaders[2], rank: 1, points: 2100, clips: 9, downloads: 6800 },
  { ...allTimeLeaders[0], rank: 2, points: 1880, clips: 7, downloads: 5400 },
  { ...allTimeLeaders[5], rank: 3, points: 1540, clips: 6, downloads: 4200 },
  { ...allTimeLeaders[1], rank: 4, points: 1200, clips: 5, downloads: 3100 },
  { ...allTimeLeaders[6], rank: 5, points: 980, clips: 4, downloads: 2600 },
  { ...allTimeLeaders[3], rank: 6, points: 740, clips: 3, downloads: 1900 },
];

// Active prizes
const prizes = [
  { icon: '🎟', title: 'Festival Tickets', desc: 'Top 3 this month win double passes to a partner festival', badge: 'Top 3' },
  { icon: '👕', title: 'Handsup Merch Pack', desc: 'Top 10 uploaders get an exclusive merch drop', badge: 'Top 10' },
  { icon: '💜', title: 'Platform Credits', desc: 'Every uploader earns download credits to spend on premium clips', badge: 'All uploaders' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

const PODIUM_COLORS = ['#F59E0B', '#9CA3AF', '#B45309'];
const PODIUM_SIZES = [82, 72, 64];

function PodiumCard({ entry, pos }: { entry: LeaderEntry; pos: 0 | 1 | 2 }) {
  const isTop = pos === 0;
  return (
    <View style={[styles.podiumCard, isTop && styles.podiumCardTop]}>
      {isTop && <Text style={styles.crownEmoji}>👑</Text>}
      <Text style={[styles.podiumAvatar, { fontSize: PODIUM_SIZES[pos] * 0.45 }]}>
        {entry.avatar}
      </Text>
      <View style={[styles.podiumRankBadge, { backgroundColor: PODIUM_COLORS[pos] }]}>
        <Text style={styles.podiumRankText}>#{entry.rank}</Text>
      </View>
      <Text style={styles.podiumUsername}>@{entry.username}</Text>
      <Text style={styles.podiumPoints}>{entry.points.toLocaleString()} pts</Text>
      <Text style={styles.podiumBadge}>{entry.badge}</Text>
    </View>
  );
}

function LeaderRow({ entry }: { entry: LeaderEntry }) {
  const isHighRank = entry.rank <= 3;
  return (
    <View style={[styles.row, isHighRank && styles.rowHighlighted]}>
      <Text style={[styles.rowRank, isHighRank && styles.rowRankHighlighted]}>
        #{entry.rank}
      </Text>
      <Text style={styles.rowAvatar}>{entry.avatar}</Text>
      <View style={styles.rowInfo}>
        <View style={styles.rowNameLine}>
          <Text style={styles.rowUsername}>@{entry.username}</Text>
          {entry.streak > 0 && (
            <Text style={styles.rowStreak}>🔥 {entry.streak}d</Text>
          )}
        </View>
        <Text style={styles.rowFestival}>{entry.topFestival}</Text>
      </View>
      <View style={styles.rowStats}>
        <Text style={styles.rowPoints}>{entry.points.toLocaleString()}</Text>
        <Text style={styles.rowPointsLabel}>pts</Text>
        <Text style={styles.rowClips}>{entry.clips} clips</Text>
      </View>
    </View>
  );
}

function PrizeCard({ prize }: { prize: typeof prizes[0] }) {
  return (
    <View style={styles.prizeCard}>
      <Text style={styles.prizeIcon}>{prize.icon}</Text>
      <View style={styles.prizeInfo}>
        <View style={styles.prizeTitleRow}>
          <Text style={styles.prizeTitle}>{prize.title}</Text>
          <View style={styles.prizeBadge}>
            <Text style={styles.prizeBadgeText}>{prize.badge}</Text>
          </View>
        </View>
        <Text style={styles.prizeDesc}>{prize.desc}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

type Tab = 'monthly' | 'alltime';

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('monthly');
  const leaders = activeTab === 'monthly' ? monthlyLeaders : allTimeLeaders;
  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <Text style={styles.headerSub}>Top uploaders this month win real prizes 🎟</Text>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabs}>
          {(['monthly', 'alltime'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'monthly' ? '📅 This Month' : '🏆 All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Podium — top 3 */}
        <View style={styles.podium}>
          {/* 2nd place left, 1st centre, 3rd right */}
          <View style={styles.podiumRow}>
            {top3[1] && <PodiumCard entry={top3[1]} pos={1} />}
            {top3[0] && <PodiumCard entry={top3[0]} pos={0} />}
            {top3[2] && <PodiumCard entry={top3[2]} pos={2} />}
          </View>
        </View>

        {/* Prizes strip */}
        <View style={styles.prizesSection}>
          <Text style={styles.prizesSectionTitle}>🎁 Active Prizes</Text>
          {prizes.map((p, i) => <PrizeCard key={i} prize={p} />)}
        </View>

        {/* Rest of leaderboard */}
        {rest.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Full Rankings</Text>
            {rest.map((entry) => (
              <LeaderRow key={entry.username} entry={entry} />
            ))}
          </View>
        )}

        {/* Your position CTA */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaEmoji}>🙌</Text>
          <Text style={styles.ctaTitle}>Not on the board yet?</Text>
          <Text style={styles.ctaBody}>
            Upload your first clip and start earning points. Every download counts toward this month's prizes.
          </Text>
          <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.85}>
            <Text style={styles.ctaBtnText}>Upload a clip →</Text>
          </TouchableOpacity>
        </View>

        {/* Points explainer */}
        <View style={styles.explainer}>
          <Text style={styles.explainerTitle}>How points work</Text>
          <View style={styles.explainerRow}>
            <Text style={styles.explainerEmoji}>⬆️</Text>
            <Text style={styles.explainerText}>+50 pts per clip uploaded</Text>
          </View>
          <View style={styles.explainerRow}>
            <Text style={styles.explainerEmoji}>⬇️</Text>
            <Text style={styles.explainerText}>+5 pts per download your clip receives</Text>
          </View>
          <View style={styles.explainerRow}>
            <Text style={styles.explainerEmoji}>🔥</Text>
            <Text style={styles.explainerText}>Streak bonus: +20 pts per active day</Text>
          </View>
          <View style={styles.explainerRow}>
            <Text style={styles.explainerEmoji}>✅</Text>
            <Text style={styles.explainerText}>Verified clip (good quality): +25 pts bonus</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scroll: {
    paddingBottom: 80,
  },

  // Header
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  headerSub: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#8B5CF6',
  },
  tabText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#fff',
  },

  // Podium
  podium: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
  },
  podiumCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    width: (width - 56) / 3,
    borderWidth: 1,
    borderColor: '#222',
  },
  podiumCardTop: {
    backgroundColor: '#1a1220',
    borderColor: '#8B5CF644',
    paddingVertical: 20,
    marginBottom: 8,
  },
  crownEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  podiumAvatar: {
    marginBottom: 8,
  },
  podiumRankBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  podiumRankText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  podiumUsername: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 2,
    textAlign: 'center',
  },
  podiumPoints: {
    color: '#8B5CF6',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 4,
  },
  podiumBadge: {
    color: '#555',
    fontSize: 10,
    textAlign: 'center',
  },

  // Prizes
  prizesSection: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  prizesSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  prizeCard: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    alignItems: 'center',
    gap: 12,
  },
  prizeIcon: {
    fontSize: 32,
  },
  prizeInfo: {
    flex: 1,
  },
  prizeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  prizeTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  prizeBadge: {
    backgroundColor: '#8B5CF622',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  prizeBadgeText: {
    color: '#8B5CF6',
    fontSize: 10,
    fontWeight: '700',
  },
  prizeDesc: {
    color: '#666',
    fontSize: 12,
    lineHeight: 17,
  },

  // List
  listSection: {
    marginHorizontal: 24,
    marginBottom: 28,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#444',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    gap: 10,
  },
  rowHighlighted: {
    borderColor: '#8B5CF633',
    backgroundColor: '#14101e',
  },
  rowRank: {
    color: '#444',
    fontWeight: '800',
    fontSize: 14,
    width: 28,
    textAlign: 'center',
  },
  rowRankHighlighted: {
    color: '#8B5CF6',
  },
  rowAvatar: {
    fontSize: 26,
  },
  rowInfo: {
    flex: 1,
  },
  rowNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  rowUsername: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  rowStreak: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  rowFestival: {
    color: '#555',
    fontSize: 12,
  },
  rowStats: {
    alignItems: 'flex-end',
  },
  rowPoints: {
    color: '#8B5CF6',
    fontWeight: '800',
    fontSize: 15,
  },
  rowPointsLabel: {
    color: '#555',
    fontSize: 10,
    marginTop: -2,
  },
  rowClips: {
    color: '#444',
    fontSize: 11,
    marginTop: 2,
  },

  // CTA
  ctaCard: {
    marginHorizontal: 24,
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#8B5CF622',
  },
  ctaEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  ctaTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  ctaBody: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  ctaBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  ctaBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  // Points explainer
  explainer: {
    marginHorizontal: 24,
    backgroundColor: '#0f0f0f',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  explainerTitle: {
    color: '#555',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  explainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  explainerEmoji: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  explainerText: {
    color: '#666',
    fontSize: 13,
    lineHeight: 18,
  },
});

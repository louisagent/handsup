// ============================================================
// Handsup — Leaderboard Screen (Real Data)
// Top clips sorted by download_count from Supabase
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { getLeaderboard, getLeaderboardByEvent, getUserLeaderboard, UserLeaderboardEntry } from '../services/clips';
import { Clip } from '../types';
import { supabase } from '../services/supabase';
import { getEvents } from '../services/events';

const { width } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────────

type Period = 'week' | 'month' | 'all';

// ── Helpers ────────────────────────────────────────────────

const PODIUM_COLORS = ['#F59E0B', '#9CA3AF', '#B45309'];

// ── Sub-components ─────────────────────────────────────────

// Podium heights for each rank position
const PODIUM_HEIGHTS: Record<number, number> = { 1: 80, 2: 60, 3: 48 };
// Avatar sizes for each rank position
const AVATAR_SIZES: Record<number, number> = { 1: 64, 2: 52, 3: 52 };

function PodiumPillar({ entry, rank }: { entry: UserLeaderboardEntry | null; rank: 1 | 2 | 3 }) {
  const avatarSize = AVATAR_SIZES[rank];
  const colHeight = PODIUM_HEIGHTS[rank];

  // Blank space if no user at this position
  if (!entry) {
    return (
      <View style={[styles.pillarWrapper, rank === 1 && styles.pillarWrapperFirst]}>
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <View style={[
            styles.avatar,
            styles.avatarBlank,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          ]} />
          <View style={[styles.rankBadge, styles.rankBadgeBlank]}>
            <Text style={styles.rankBadgeText}>{rank}</Text>
          </View>
        </View>
        <Text style={styles.pillarArtist}>—</Text>
        <View style={[styles.podiumCol, { height: colHeight }]} />
      </View>
    );
  }

  const views = entry.total_views;
  const username = entry.username ?? '—';
  const initials = username
    .split('')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={[styles.pillarWrapper, rank === 1 && styles.pillarWrapperFirst]}>
      {/* Avatar + rank badge */}
      <View style={{ alignItems: 'center', marginBottom: 6 }}>
        {rank === 1 && <Text style={styles.crownEmoji}>👑</Text>}
        {entry.avatar_url ? (
          <View style={[
            styles.avatar,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
            rank === 1 && styles.avatarFirst,
          ]}>
            <Image source={{ uri: entry.avatar_url }} style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }} />
          </View>
        ) : (
          <View style={[
            styles.avatar,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
            rank === 1 && styles.avatarFirst,
          ]}>
            <Text style={[styles.avatarText, { fontSize: rank === 1 ? 22 : 16 }]}>{initials}</Text>
          </View>
        )}
        {/* Rank badge */}
        <View style={[styles.rankBadge, { backgroundColor: PODIUM_COLORS[rank - 1] }]}>
          <Text style={styles.rankBadgeText}>{rank}</Text>
        </View>
      </View>
      {/* Username */}
      <Text style={styles.pillarArtist} numberOfLines={1}>@{username}</Text>
      <Text style={styles.pillarDownloads}>{views.toLocaleString()}</Text>
      <Text style={styles.pillarDownloadsLabel}>views</Text>
      <Text style={styles.pillarUploader} numberOfLines={1}>{entry.total_uploads} uploads</Text>
      {/* The podium column */}
      <View style={[styles.podiumCol, { height: colHeight }]} />
    </View>
  );
}

function LeaderRow({ entry, rank }: { entry: UserLeaderboardEntry; rank: number }) {
  const isHighRank = rank <= 3;
  const views = entry.total_views;
  const username = entry.username ?? '—';
  const isVerified = entry.is_verified ?? false;

  return (
    <View style={[styles.row, isHighRank && styles.rowHighlighted]}>
      <Text style={[styles.rowRank, isHighRank && styles.rowRankHighlighted]}>
        #{rank}
      </Text>
      <View style={styles.rowInfo}>
        <Text style={styles.rowArtist} numberOfLines={1}>@{username}{isVerified ? ' ✓' : ''}</Text>
        <Text style={styles.rowFestival} numberOfLines={1}>{entry.total_uploads} uploads</Text>
        <Text style={styles.rowUploader} numberOfLines={1}>
          {entry.total_downloads.toLocaleString()} downloads
        </Text>
      </View>
      <View style={styles.rowStats}>
        <Text style={styles.rowDownloads}>{views.toLocaleString()}</Text>
        <Text style={styles.rowDownloadsLabel}>views</Text>
      </View>
    </View>
  );
}

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonRank} />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
      </View>
      <View style={styles.skeletonStat} />
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────

export default function LeaderboardScreen() {
  const [period, setPeriod] = useState<Period>('all');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [users, setUsers] = useState<UserLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [topFestivalNames, setTopFestivalNames] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single();
          if (data) setCurrentUsername((data as any).username);
        }
      } catch {
        // ignore
      }
    })();

    // Load top festival names from Supabase for the event filter
    getEvents().then((events) => {
      setTopFestivalNames(events.slice(0, 5).map((e) => e.name));
    }).catch(() => {});
  }, []);

  const load = useCallback(async (p: Period, event: string | null) => {
    try {
      const data = await getUserLeaderboard(20);
      setUsers(data);
    } catch {
      // silently fail — show empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(period, selectedEvent);
  }, [period, selectedEvent, load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load(period, selectedEvent);
  };

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  // Prepare podium entries with null for missing positions
  const podiumEntries: (UserLeaderboardEntry | null)[] = [
    top3[1] ?? null, // 2nd place
    top3[0] ?? null, // 1st place
    top3[2] ?? null, // 3rd place
  ];

  // Find current user's rank in the list
  const userRank = currentUsername
    ? users.findIndex((u) => u.username === currentUsername) + 1
    : 0;

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all',   label: 'All Time' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8B5CF6" colors={["#8B5CF6"]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {selectedEvent ? `${selectedEvent} Leaderboard` : 'Leaderboard'}
          </Text>
          <Text style={styles.headerSub}>🏆 Top clips right now</Text>
        </View>

        {/* User rank sticky bar / unranked state */}
        {currentUsername && userRank > 0 ? (
          <View style={styles.userRankBar}>
            <Text style={styles.userRankText}>
              You're ranked #{userRank}{selectedEvent ? ` at ${selectedEvent}` : ''} · Upload more to climb 👆
            </Text>
          </View>
        ) : currentUsername && !loading ? (
          <View style={[styles.userRankBar, styles.userRankBarUnranked]}>
            <Text style={styles.userRankTextUnranked}>
              You're unranked — upload your first clip to enter 👀
            </Text>
          </View>
        ) : null}

        {/* Event filter */}
        <View style={styles.eventFilterRow}>
          <TouchableOpacity
            style={[styles.eventFilterBtn, !selectedEvent && styles.eventFilterBtnActive]}
            onPress={() => { setSelectedEvent(null); setShowEventPicker(false); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.eventFilterBtnText, !selectedEvent && styles.eventFilterBtnTextActive]}>
              All Events
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.eventFilterBtn, !!selectedEvent && styles.eventFilterBtnActive]}
            onPress={() => setShowEventPicker((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={[styles.eventFilterBtnText, !!selectedEvent && styles.eventFilterBtnTextActive]}>
              {selectedEvent ?? 'By Event ▾'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Event picker dropdown */}
        {showEventPicker && (
          <View style={styles.eventDropdown}>
            {topFestivalNames.map((name) => (
              <TouchableOpacity
                key={name}
                style={[styles.eventDropdownItem, selectedEvent === name && styles.eventDropdownItemActive]}
                onPress={() => { setSelectedEvent(name); setShowEventPicker(false); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.eventDropdownText, selectedEvent === name && styles.eventDropdownTextActive]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Period pill switcher */}
        <View style={styles.pillRow}>
          {PERIODS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.pill, period === key && styles.pillActive]}
              onPress={() => setPeriod(key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, period === key && styles.pillTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          /* Skeleton loading */
          <View style={styles.listSection}>
            {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎪</Text>
            <Text style={styles.emptyTitle}>No clips yet.</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to set the bar. 🏆
            </Text>
          </View>
        ) : (
          <>
            {/* Podium — always show, with blanks for missing positions */}
            <View style={styles.podium}>
              <View style={styles.podiumRow}>
                <PodiumPillar entry={podiumEntries[0]} rank={2} />
                <PodiumPillar entry={podiumEntries[1]} rank={1} />
                <PodiumPillar entry={podiumEntries[2]} rank={3} />
              </View>
            </View>

            {/* Rest of leaderboard */}
            {rest.length > 0 && (
              <View style={styles.listSection}>
                <Text style={styles.listTitle}>Full Rankings</Text>
                {rest.map((entry, i) => (
                  <LeaderRow
                    key={entry.user_id}
                    entry={entry}
                    rank={i + 4}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* CTA */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaEmoji}>🙌</Text>
          <Text style={styles.ctaTitle}>Make your mark</Text>
          <Text style={styles.ctaBody}>
            Every download counts. Upload more clips to climb the board.
          </Text>
        </View>

        {/* Points explainer */}
        <View style={styles.explainer}>
          <Text style={styles.explainerTitle}>How to rank</Text>
          <View style={styles.explainerRow}>
            <Text style={styles.explainerEmoji}>⬇️</Text>
            <Text style={styles.explainerText}>Downloads are the primary ranking signal</Text>
          </View>
          <View style={styles.explainerRow}>
            <Text style={styles.explainerEmoji}>▶️</Text>
            <Text style={styles.explainerText}>Views show how far your clip reaches</Text>
          </View>
          <View style={styles.explainerRow}>
            <Text style={styles.explainerEmoji}>💬</Text>
            <Text style={styles.explainerText}>Comments boost your clip in Trending</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scroll: {
    paddingBottom: 80,
  },

  // Header
  header: {
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 28,
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

  // User rank bar
  userRankBar: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: '#1a0a2e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  userRankBarUnranked: {
    backgroundColor: '#111',
    borderColor: '#2a2a2a',
  },
  userRankText: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  userRankTextUnranked: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Event filter
  eventFilterRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    gap: 8,
    marginBottom: 12,
  },
  eventFilterBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  eventFilterBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  eventFilterBtnText: {
    color: '#555',
    fontWeight: '700',
    fontSize: 12,
  },
  eventFilterBtnTextActive: {
    color: '#fff',
  },
  eventDropdown: {
    marginHorizontal: 24,
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 12,
    overflow: 'hidden',
  },
  eventDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  eventDropdownItemActive: {
    backgroundColor: '#1a0a2e',
  },
  eventDropdownText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '500',
  },
  eventDropdownTextActive: {
    color: '#A78BFA',
    fontWeight: '700',
  },

  // Period pills
  pillRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    gap: 8,
    marginBottom: 32,
  },
  pill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pillActive: {
    backgroundColor: '#8B5CF6',
  },
  pillText: {
    color: '#555',
    fontWeight: '700',
    fontSize: 13,
  },
  pillTextActive: {
    color: '#fff',
  },

  // Podium
  podium: {
    paddingHorizontal: 16,
    marginBottom: 24,
    marginTop: 12,
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 4,
  },

  // Pillar-style podium
  pillarWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 0,
  },
  pillarWrapperFirst: {
    // 1st place pillar is center — slightly raised feel via taller column
  },
  avatar: {
    backgroundColor: '#2a1a4e',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarFirst: {
    borderColor: '#F59E0B',
    borderWidth: 2.5,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
  },
  rankBadge: {
    position: 'absolute' as const,
    bottom: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 10,
  },
  rankBadgeBlank: {
    backgroundColor: '#2a2a2a',
  },
  avatarBlank: {
    backgroundColor: '#1a1a1a',
    borderColor: '#2a2a2a',
  },
  crownEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  pillarArtist: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  pillarDownloads: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    marginTop: 3,
  },
  pillarDownloadsLabel: {
    color: '#555',
    fontSize: 9,
  },
  pillarUploader: {
    color: '#555',
    fontSize: 9,
    marginBottom: 8,
    textAlign: 'center',
  },
  podiumCol: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },

  // List
  listSection: {
    marginHorizontal: 24,
    marginBottom: 28,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#444',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    gap: 12,
  },
  rowHighlighted: {
    borderColor: '#8B5CF633',
    backgroundColor: '#14101e',
  },
  rowRank: {
    color: '#444',
    fontWeight: '800',
    fontSize: 14,
    width: 32,
    textAlign: 'center',
  },
  rowRankHighlighted: {
    color: '#8B5CF6',
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowArtist: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  rowFestival: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  rowUploader: {
    color: '#555',
    fontSize: 11,
  },
  rowStats: {
    alignItems: 'flex-end',
  },
  rowDownloads: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  rowDownloadsLabel: {
    color: '#555',
    fontSize: 10,
    marginTop: -2,
  },

  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  skeletonRank: {
    width: 32,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  skeletonBody: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
    width: '80%',
  },
  skeletonStat: {
    width: 48,
    height: 20,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
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
  },

  // Explainer
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
    flex: 1,
  },
});

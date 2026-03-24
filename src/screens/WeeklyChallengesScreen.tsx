// ============================================================
// Handsup — Weekly Challenges Screen
// Rotating weekly goals with badge rewards on completion
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import {
  getActiveChallenges,
  getUserProgress,
  claimBadge,
  Challenge,
  UserChallengeProgress,
} from '../services/challengesService';

// ── Helpers ─────────────────────────────────────────────────

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = new Date(weekStart + 'T00:00:00').toLocaleDateString('en-AU', opts);
  const end = new Date(weekEnd + 'T00:00:00').toLocaleDateString('en-AU', opts);
  const year = new Date(weekEnd + 'T00:00:00').getFullYear();
  return `${start} – ${end}, ${year}`;
}

// ── Progress Bar ─────────────────────────────────────────────

function ProgressBar({ current, goal }: { current: number; goal: number }) {
  const pct = Math.min(current / goal, 1);
  return (
    <View style={pbStyles.track}>
      <View style={[pbStyles.fill, { width: `${pct * 100}%` as any }]} />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1e1e2e',
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
  },
});

// ── Challenge Card ───────────────────────────────────────────

interface ChallengeCardProps {
  challenge: Challenge;
  progress: UserChallengeProgress | undefined;
  onClaim: (challengeId: string) => void;
  claiming: boolean;
}

function ChallengeCard({ challenge, progress, onClaim, claiming }: ChallengeCardProps) {
  const current = progress?.current_count ?? 0;
  const completed = progress?.completed ?? false;
  const claimed = progress?.badge_claimed ?? false;

  return (
    <View style={[cardStyles.card, completed && cardStyles.cardCompleted]}>
      {/* Badge + title row */}
      <View style={cardStyles.header}>
        <View style={cardStyles.badgeCircle}>
          <Text style={cardStyles.badgeEmoji}>{challenge.badge_reward}</Text>
        </View>
        <View style={cardStyles.titleBlock}>
          <Text style={cardStyles.title}>{challenge.title}</Text>
          <Text style={cardStyles.description}>{challenge.description}</Text>
        </View>
        {completed && (
          <View style={cardStyles.completedBadge}>
            <Text style={cardStyles.completedIcon}>✅</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <ProgressBar current={current} goal={challenge.goal_count} />

      {/* Progress label + CTA */}
      <View style={cardStyles.footer}>
        <Text style={cardStyles.progressLabel}>
          {current} / {challenge.goal_count}
        </Text>

        {completed && !claimed && (
          <TouchableOpacity
            style={cardStyles.claimBtn}
            onPress={() => onClaim(challenge.id)}
            disabled={claiming}
            activeOpacity={0.8}
          >
            {claiming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={cardStyles.claimBtnText}>Claim {challenge.badge_reward}</Text>
            )}
          </TouchableOpacity>
        )}

        {completed && claimed && (
          <View style={cardStyles.claimedTag}>
            <Text style={cardStyles.claimedTagText}>Claimed {challenge.badge_reward}</Text>
          </View>
        )}

        {!completed && (
          <Text style={cardStyles.remainingText}>
            {challenge.goal_count - current} to go
          </Text>
        )}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  cardCompleted: {
    borderColor: '#3D2080',
    backgroundColor: '#0d0a1a',
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  badgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  badgeEmoji: { fontSize: 22 },
  titleBlock: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
  },
  description: {
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
  },
  completedBadge: {
    alignSelf: 'flex-start',
  },
  completedIcon: { fontSize: 20 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  remainingText: {
    fontSize: 12,
    color: '#444',
  },
  claimBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  claimBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  claimedTag: {
    backgroundColor: '#1a1228',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3D2080',
  },
  claimedTagText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
});

// ── Main Screen ──────────────────────────────────────────────

export default function WeeklyChallengesScreen({ navigation }: any) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, UserChallengeProgress>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [activeChallenges, userProgress] = await Promise.all([
        getActiveChallenges(),
        getUserProgress(user.id),
      ]);

      setChallenges(activeChallenges);

      // Build map: challenge_id → progress row
      const map: Record<string, UserChallengeProgress> = {};
      userProgress.forEach((p) => {
        map[p.challenge_id] = p;
      });
      setProgressMap(map);
    } catch (e: any) {
      console.warn('WeeklyChallenges load error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleClaim = async (challengeId: string) => {
    if (!userId || claimingId) return;
    setClaimingId(challengeId);
    try {
      const success = await claimBadge(userId, challengeId);
      if (success) {
        // Optimistically update local state
        setProgressMap((prev) => ({
          ...prev,
          [challengeId]: {
            ...prev[challengeId],
            badge_claimed: true,
          },
        }));
        Alert.alert('Badge Claimed! 🏆', 'Nice work — you earned this week\'s reward!');
      } else {
        Alert.alert('Already claimed', 'You\'ve already claimed this badge.');
      }
    } catch {
      Alert.alert('Error', 'Could not claim badge. Try again.');
    } finally {
      setClaimingId(null);
    }
  };

  // Split challenges: incomplete first, completed last
  const incomplete = challenges.filter((c) => !progressMap[c.id]?.completed);
  const completed = challenges.filter((c) => progressMap[c.id]?.completed);
  const sorted = [...incomplete, ...completed];

  // Derive week range from first challenge (all share the same week)
  const weekLabel = challenges.length > 0
    ? formatWeekRange(challenges[0].week_start, challenges[0].week_end)
    : '';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Weekly Challenges 🏆</Text>
          {weekLabel ? (
            <Text style={styles.headerSubtitle}>{weekLabel}</Text>
          ) : null}
          <Text style={styles.headerHint}>
            Complete goals to earn badge rewards. Resets every Monday.
          </Text>
        </View>

        {/* ── Challenges ── */}
        {sorted.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color="#333" />
            <Text style={styles.emptyTitle}>No challenges this week</Text>
            <Text style={styles.emptySubtitle}>Check back soon — new goals drop every Monday!</Text>
          </View>
        ) : (
          <>
            {incomplete.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>IN PROGRESS</Text>
                {incomplete.map((c) => (
                  <ChallengeCard
                    key={c.id}
                    challenge={c}
                    progress={progressMap[c.id]}
                    onClaim={handleClaim}
                    claiming={claimingId === c.id}
                  />
                ))}
              </View>
            )}

            {completed.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>COMPLETED</Text>
                {completed.map((c) => (
                  <ChallengeCard
                    key={c.id}
                    challenge={c}
                    progress={progressMap[c.id]}
                    onClaim={handleClaim}
                    claiming={claimingId === c.id}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { paddingBottom: 100 },
  centered: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 8,
  },
  headerHint: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 12,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
});

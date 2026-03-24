// ============================================================
// Handsup — Weekly Challenges Screen
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Challenge, getWeeklyChallengeProgress, getWeekKey } from '../services/challenges';

type ChallengeWithProgress = Challenge & { progress: number; completed: boolean };

function ChallengeCard({ challenge }: { challenge: ChallengeWithProgress }) {
  const pct = Math.min(1, challenge.progress / challenge.target);
  return (
    <View style={[styles.card, challenge.completed && styles.cardCompleted]}>
      <View style={styles.cardHeader}>
        <Text style={styles.emoji}>{challenge.emoji}</Text>
        <View style={styles.cardInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{challenge.title}</Text>
            {challenge.completed && (
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            )}
          </View>
          <Text style={styles.description}>{challenge.description}</Text>
        </View>
        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>+{challenge.xpReward} XP</Text>
        </View>
      </View>
      {/* Progress bar */}
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[
            styles.progressFill,
            { width: `${pct * 100}%` as any },
            challenge.completed && styles.progressFillDone,
          ]} />
        </View>
        <Text style={styles.progressLabel}>
          {challenge.progress}/{challenge.target}
        </Text>
      </View>
    </View>
  );
}

export default function ChallengesScreen() {
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const weekKey = getWeekKey();
  const weekNum = weekKey.split('-W')[1];

  const load = useCallback(async () => {
    try {
      const data = await getWeeklyChallengeProgress();
      setChallenges(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const completed = challenges.filter((c) => c.completed).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor="#8B5CF6"
          colors={['#8B5CF6']}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.weekLabel}>Week {weekNum}</Text>
        <Text style={styles.headerTitle}>Weekly Challenges</Text>
        <Text style={styles.headerSub}>
          {completed}/{challenges.length} completed · Resets Monday
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.list}>
          {challenges.map((c) => (
            <ChallengeCard key={c.key} challenge={c} />
          ))}
        </View>
      )}

      <View style={styles.hint}>
        <Ionicons name="information-circle-outline" size={14} color="#444" />
        <Text style={styles.hintText}>Progress updates automatically as you use the app</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { paddingBottom: 60 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    gap: 4,
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#555' },

  list: { padding: 16, gap: 12 },

  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 16,
    gap: 12,
  },
  cardCompleted: {
    borderColor: '#10B98133',
    backgroundColor: '#0a1a12',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  emoji: { fontSize: 32 },
  cardInfo: { flex: 1, gap: 3 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#fff' },
  description: { fontSize: 13, color: '#666' },
  xpBadge: {
    backgroundColor: '#1a1228',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#8B5CF633',
  },
  xpText: { fontSize: 12, fontWeight: '700', color: '#A78BFA' },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%' as any,
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  progressFillDone: { backgroundColor: '#10B981' },
  progressLabel: { fontSize: 12, color: '#555', fontWeight: '600', minWidth: 32, textAlign: 'right' },

  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  hintText: { fontSize: 12, color: '#333' },
});

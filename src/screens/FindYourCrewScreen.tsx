// ============================================================
// Handsup — Find Your Crew Screen
// Solo festival-goers can find and connect with each other
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../services/supabase';
import {
  postLookingForCrew,
  stopLookingForCrew,
  getCrewLookups,
  getMyCrewLookup,
  sendCrewRequest,
  getConnectionStatus,
  CrewLookup,
  CrewConnection,
} from '../services/crewService';

export default function FindYourCrewScreen({ route, navigation }: any) {
  const { eventId, eventName } = route.params as {
    eventId: string;
    eventName: string;
  };

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myLookup, setMyLookup] = useState<CrewLookup | null>(null);
  const [lookups, setLookups] = useState<CrewLookup[]>([]);
  const [connectionMap, setConnectionMap] = useState<Record<string, CrewConnection | null>>({});

  const [messageInput, setMessageInput] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Track which user IDs have a pending connect action
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());

  // ── Load data ─────────────────────────────────────────────

  const loadAll = useCallback(async (userId: string) => {
    try {
      const [mine, others] = await Promise.all([
        getMyCrewLookup(userId, eventId),
        getCrewLookups(eventId, userId),
      ]);
      setMyLookup(mine);
      setLookups(others);

      // Build connection status map
      const map: Record<string, CrewConnection | null> = {};
      await Promise.all(
        others.map(async (l) => {
          const conn = await getConnectionStatus(userId, l.user_id, eventId);
          map[l.user_id] = conn;
        }),
      );
      setConnectionMap(map);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load crew lookups');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        loadAll(user.id);
      } else {
        setLoading(false);
      }
    });
  }, [loadAll]);

  const onRefresh = async () => {
    if (!currentUserId) return;
    setRefreshing(true);
    await loadAll(currentUserId);
    setRefreshing(false);
  };

  // ── Post looking ──────────────────────────────────────────

  const handlePostLooking = async () => {
    if (!currentUserId) return;
    if (!messageInput.trim()) {
      Alert.alert('Add a note', 'Write a short message so others know who you are!');
      return;
    }
    setPosting(true);
    try {
      await postLookingForCrew(currentUserId, eventId, messageInput.trim());
      await loadAll(currentUserId);
      setMessageInput('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not post your lookup');
    } finally {
      setPosting(false);
    }
  };

  // ── Stop looking ──────────────────────────────────────────

  const handleStopLooking = async () => {
    if (!currentUserId) return;
    Alert.alert(
      'Stop looking?',
      'You\'ll no longer be visible to other solo attendees.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Looking',
          style: 'destructive',
          onPress: async () => {
            try {
              await stopLookingForCrew(currentUserId, eventId);
              setMyLookup(null);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not stop your lookup');
            }
          },
        },
      ],
    );
  };

  // ── Connect ───────────────────────────────────────────────

  const handleConnect = async (targetUserId: string) => {
    if (!currentUserId) return;
    setConnectingIds((prev) => new Set(prev).add(targetUserId));
    try {
      const result = await sendCrewRequest(currentUserId, targetUserId, eventId);
      // Update the connection map optimistically
      setConnectionMap((prev) => ({
        ...prev,
        [targetUserId]: {
          id: result.connectionId,
          user_a_id: currentUserId,
          user_b_id: targetUserId,
          event_id: eventId,
          status: result.status,
          created_at: new Date().toISOString(),
        },
      }));

      if (result.status === 'connected') {
        Alert.alert('🎉 Connected!', "You're now connected! Time to find each other at the festival.");
      } else {
        Alert.alert('Request sent!', 'If they connect with you too, you\'ll both be matched up.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not send request');
    } finally {
      setConnectingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  // ── Helpers ───────────────────────────────────────────────

  const getDisplayName = (lookup: CrewLookup): string => {
    const p = lookup.profile;
    if (!p) return 'Anonymous';
    return p.display_name ?? (p.username ? `@${p.username}` : 'Anonymous');
  };

  const getInitials = (lookup: CrewLookup): string => {
    const name = getDisplayName(lookup);
    return name.replace('@', '').slice(0, 2).toUpperCase();
  };

  const getConnectionLabel = (userId: string): 'connect' | 'pending' | 'connected' => {
    const conn = connectionMap[userId];
    if (!conn) return 'connect';
    if (conn.status === 'connected') return 'connected';
    return 'pending';
  };

  // ── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Finding your crew…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={['#1a0a2e', '#0d0d1a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerEventName} numberOfLines={1}>{eventName}</Text>
          <Text style={styles.headerTitle}>🤝 Find Your Crew</Text>
          <Text style={styles.headerSubtitle}>
            Connect with other solo festival-goers
          </Text>
        </LinearGradient>

        {/* ── My Status ── */}
        <View style={styles.myStatusSection}>
          {myLookup && myLookup.active ? (
            /* Already posted */
            <View style={styles.visibleBanner}>
              <View style={styles.visibleBannerLeft}>
                <Ionicons name="eye" size={20} color="#22c55e" />
                <View>
                  <Text style={styles.visibleBannerTitle}>You're visible to others</Text>
                  <Text style={styles.visibleBannerMsg} numberOfLines={2}>
                    "{myLookup.message}"
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.stopBtn}
                onPress={handleStopLooking}
                activeOpacity={0.8}
              >
                <Text style={styles.stopBtnText}>Stop looking</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Not posted yet */
            <View style={styles.joinCard}>
              <Text style={styles.joinCardTitle}>Going solo? 🙋</Text>
              <Text style={styles.joinCardSubtitle}>
                Post your vibe so others can find you
              </Text>
              <TextInput
                style={styles.messageInput}
                placeholder="e.g. Big into techno, down for the whole weekend"
                placeholderTextColor="#555"
                value={messageInput}
                onChangeText={setMessageInput}
                maxLength={140}
                multiline
                numberOfLines={2}
              />
              <Text style={styles.charCount}>{messageInput.length}/140</Text>
              <TouchableOpacity
                style={[styles.postBtn, posting && styles.postBtnDisabled]}
                onPress={handlePostLooking}
                disabled={posting}
                activeOpacity={0.85}
              >
                {posting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.postBtnText}>🙋 I'm going solo</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Solo Attendees List ── */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>
            {lookups.length > 0
              ? `${lookups.length} solo attendee${lookups.length !== 1 ? 's' : ''} looking for crew`
              : 'No one else is looking yet'}
          </Text>
          {lookups.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎪</Text>
              <Text style={styles.emptyText}>
                Be the first to post! Others at {eventName} will see you here.
              </Text>
            </View>
          )}
          {lookups.map((lookup) => {
            const connLabel = getConnectionLabel(lookup.user_id);
            const isConnecting = connectingIds.has(lookup.user_id);

            return (
              <View key={lookup.id} style={styles.lookupCard}>
                {/* Avatar */}
                {lookup.profile?.avatar_url ? (
                  <Image
                    source={{ uri: lookup.profile.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{getInitials(lookup)}</Text>
                  </View>
                )}

                {/* Info */}
                <View style={styles.lookupInfo}>
                  <Text style={styles.lookupName} numberOfLines={1}>
                    {getDisplayName(lookup)}
                  </Text>
                  <Text style={styles.lookupMessage} numberOfLines={2}>
                    {lookup.message}
                  </Text>
                </View>

                {/* Connect button */}
                {connLabel === 'connected' ? (
                  <View style={styles.connectedBadge}>
                    <Text style={styles.connectedText}>✅ Connected</Text>
                  </View>
                ) : connLabel === 'pending' ? (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>⏳ Sent</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.connectBtn, isConnecting && styles.connectBtnDisabled]}
                    onPress={() => handleConnect(lookup.user_id)}
                    disabled={isConnecting}
                    activeOpacity={0.8}
                  >
                    {isConnecting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.connectBtnText}>Connect</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: {
    flex: 1, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  loadingText: { color: '#666', fontSize: 14 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    gap: 4,
  },
  headerEventName: {
    fontSize: 12, fontWeight: '700', color: '#8B5CF6',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#888', marginTop: 4 },

  // My status
  myStatusSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  visibleBanner: {
    backgroundColor: '#0a1a0a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#22c55e44',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  visibleBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  visibleBannerTitle: {
    color: '#22c55e',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  visibleBannerMsg: {
    color: '#888',
    fontSize: 13,
    fontStyle: 'italic',
  },
  stopBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  stopBtnText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },

  joinCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    padding: 20,
    gap: 10,
  },
  joinCardTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  joinCardSubtitle: { fontSize: 13, color: '#666', marginTop: -4 },
  messageInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    minHeight: 72,
    textAlignVertical: 'top',
  },
  charCount: { color: '#444', fontSize: 11, textAlign: 'right', marginTop: -6 },
  postBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  postBtnDisabled: { backgroundColor: '#4a2d8a' },
  postBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // List
  listSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // Lookup card
  lookupCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4C1D95',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  avatarInitials: { color: '#fff', fontWeight: '800', fontSize: 15 },
  lookupInfo: { flex: 1, gap: 4 },
  lookupName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  lookupMessage: { color: '#777', fontSize: 13, lineHeight: 18 },

  connectBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 80,
    alignItems: 'center',
  },
  connectBtnDisabled: { backgroundColor: '#4a2d8a' },
  connectBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  connectedBadge: {
    backgroundColor: '#0a1a0a',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#22c55e44',
    alignItems: 'center',
  },
  connectedText: { color: '#22c55e', fontWeight: '700', fontSize: 12 },

  pendingBadge: {
    backgroundColor: '#1a1500',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#F97316',
    alignItems: 'center',
  },
  pendingText: { color: '#F97316', fontWeight: '700', fontSize: 12 },
});

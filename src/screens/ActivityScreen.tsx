// ============================================================
// Handsup — Activity Screen
// Two tabs:
//   "You"       — your own notifications (likes, follows, comments)
//   "Following" — what people you follow are doing (uploads, reposts, badges)
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import NotificationsScreen from './NotificationsScreen';
import LeaderboardScreen from './LeaderboardScreen';
import { getIncomingCrewRequests, respondToCrewRequest, CrewRequest } from '../services/crewFinder';

// ── Types ──────────────────────────────────────────────────

type Tab = 'you' | 'following' | 'leaderboard';

type FeedItemType = 'upload' | 'repost' | 'badge';

interface FeedItem {
  id: string;
  type: FeedItemType;
  username: string;
  avatar_url?: string;
  timestamp: string;
  // clip-specific
  clipArtist?: string;
  clipFestival?: string;
  clipThumbnail?: string;
  clipId?: string;
  // badge-specific
  badgeEmoji?: string;
  badgeLabel?: string;
}

// ── Helpers ────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function feedActionText(type: FeedItemType): string {
  switch (type) {
    case 'upload': return 'uploaded a clip';
    case 'repost': return 'reposted';
    case 'badge':  return 'earned a badge';
  }
}

// ── Data Fetching ──────────────────────────────────────────

async function fetchFollowingFeed(): Promise<FeedItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Step 1: get IDs the current user follows
  const { data: followData, error: followError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  if (followError || !followData || followData.length === 0) return [];

  const followingIds: string[] = followData.map((r: any) => r.following_id as string);

  // Step 2: parallel fetch — uploads, reposts, badges
  const [uploadsRes, repostsRes, badgesRes] = await Promise.allSettled([
    supabase
      .from('clips')
      .select('id, artist, festival_name, thumbnail_url, created_at, uploader:profiles!uploader_id(username, avatar_url, is_verified)')
      .in('uploader_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('reposts')
      .select('id, created_at, reposter:profiles!user_id(username, avatar_url), clip:clips(id, artist, festival_name, thumbnail_url)')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('user_badges')
      .select('id, earned_at, badge_emoji, badge_label, user:profiles!user_id(username, avatar_url)')
      .in('user_id', followingIds)
      .order('earned_at', { ascending: false })
      .limit(10),
  ]);

  const items: FeedItem[] = [];

  // Map uploads
  if (uploadsRes.status === 'fulfilled' && uploadsRes.value.data) {
    for (const clip of uploadsRes.value.data) {
      const uploader = (clip as any).uploader;
      items.push({
        id: `upload-${clip.id}`,
        type: 'upload',
        username: uploader?.username ?? 'someone',
        avatar_url: uploader?.avatar_url,
        timestamp: clip.created_at,
        clipArtist: clip.artist,
        clipFestival: clip.festival_name,
        clipThumbnail: clip.thumbnail_url,
        clipId: clip.id,
      });
    }
  }

  // Map reposts
  if (repostsRes.status === 'fulfilled' && repostsRes.value.data) {
    for (const repost of repostsRes.value.data) {
      const reposter = (repost as any).reposter;
      const clip = (repost as any).clip;
      items.push({
        id: `repost-${repost.id}`,
        type: 'repost',
        username: reposter?.username ?? 'someone',
        avatar_url: reposter?.avatar_url,
        timestamp: repost.created_at,
        clipArtist: clip?.artist,
        clipFestival: clip?.festival_name,
        clipThumbnail: clip?.thumbnail_url,
        clipId: clip?.id,
      });
    }
  }

  // Map badges
  if (badgesRes.status === 'fulfilled' && badgesRes.value.data) {
    for (const badge of badgesRes.value.data) {
      const badgeUser = (badge as any).user;
      items.push({
        id: `badge-${badge.id}`,
        type: 'badge',
        username: badgeUser?.username ?? 'someone',
        avatar_url: badgeUser?.avatar_url,
        timestamp: badge.earned_at,
        badgeEmoji: badge.badge_emoji,
        badgeLabel: badge.badge_label,
      });
    }
  }

  // Sort by timestamp descending
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return items;
}

// ── Avatar Component ───────────────────────────────────────

function Avatar({ uri, username }: { uri?: string; username: string }) {
  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} />;
  }
  const initial = username.charAt(0).toUpperCase();
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </View>
  );
}

// ── Feed Item Card ─────────────────────────────────────────

function FeedItemCard({ item, onPress }: { item: FeedItem; onPress?: () => void }) {
  const hasClip = item.clipId && (item.clipArtist || item.clipFestival);

  return (
    <TouchableOpacity
      style={styles.feedCard}
      onPress={hasClip ? onPress : undefined}
      activeOpacity={hasClip ? 0.75 : 1}
    >
      <Avatar uri={item.avatar_url} username={item.username} />

      <View style={styles.feedCardBody}>
        <Text style={styles.feedCardText} numberOfLines={2}>
          <Text style={styles.feedCardUsername}>@{item.username}</Text>
          {' '}{feedActionText(item.type)}
        </Text>

        {item.type === 'badge' && item.badgeEmoji ? (
          <Text style={styles.feedCardSub} numberOfLines={1}>
            {item.badgeEmoji} {item.badgeLabel}
          </Text>
        ) : hasClip ? (
          <Text style={styles.feedCardSub} numberOfLines={1}>
            {item.clipArtist}{item.clipArtist && item.clipFestival ? ' @ ' : ''}{item.clipFestival}
          </Text>
        ) : null}

        <Text style={styles.feedCardTime}>{timeAgo(item.timestamp)}</Text>
      </View>

      {hasClip && (
        <View style={styles.feedThumbnailWrap}>
          {item.clipThumbnail ? (
            <Image source={{ uri: item.clipThumbnail }} style={styles.feedThumbnail} />
          ) : (
            <View style={[styles.feedThumbnail, styles.feedThumbnailPlaceholder]}>
              <Ionicons name="musical-notes" size={18} color="#555" />
            </View>
          )}
          <View style={styles.playIconOverlay}>
            <Ionicons name="play" size={10} color="#fff" />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Crew Requests Section ──────────────────────────────────

function CrewRequestsSection() {
  const [requests, setRequests] = useState<CrewRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIncomingCrewRequests()
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRespond = async (id: string, accept: boolean) => {
    try {
      await respondToCrewRequest(id, accept);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // silently fail
    }
  };

  if (loading || requests.length === 0) return null;

  return (
    <View style={styles.crewRequestSection}>
      <Text style={styles.crewRequestTitle}>🤝 Crew Requests ({requests.length})</Text>
      {requests.map((req) => (
        <View key={req.id} style={styles.crewRequestCard}>
          <Text style={styles.crewRequestText}>
            @{req.from_user?.username} wants to join your crew at {req.event?.name}
          </Text>
          <View style={styles.crewRequestActions}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleRespond(req.id, true)}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => handleRespond(req.id, false)}
              activeOpacity={0.8}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── You Tab (Notifications + Crew Requests) ────────────────

function YouTab() {
  return (
    <View style={{ flex: 1 }}>
      <CrewRequestsSection />
      <NotificationsScreen />
    </View>
  );
}

// ── Following Feed Tab ─────────────────────────────────────

function FollowingFeedTab({ navigation }: { navigation: any }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const loaded = useRef(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchFollowingFeed();
      setItems(data);
      setIsEmpty(data.length === 0);
    } catch (e) {
      setError('Could not load activity. Pull to try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Lazy load — only on first open
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      load();
    }
  }, [load]);

  const handleRefresh = () => load(true);

  const handleItemPress = (item: FeedItem) => {
    if (!item.clipId) return;
    // Build a minimal clip object for VideoDetail navigation
    navigation.navigate('VideoDetail', {
      video: {
        id: item.clipId,
        artist: item.clipArtist ?? '',
        festival_name: item.clipFestival ?? '',
        thumbnail_url: item.clipThumbnail,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (error) {
    return (
      <ScrollView
        contentContainerStyle={styles.centred}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8B5CF6" />}
      >
        <Text style={styles.errorText}>{error}</Text>
      </ScrollView>
    );
  }

  if (isEmpty) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8B5CF6" />}
      >
        <Text style={styles.emptyEmoji}>👥</Text>
        <Text style={styles.emptyTitle}>Nothing yet.</Text>
        <Text style={styles.emptySubtitle}>
          Follow some creators to see their activity here.
        </Text>
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <FeedItemCard item={item} onPress={() => handleItemPress(item)} />
      )}
      contentContainerStyle={styles.feedList}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8B5CF6" colors={['#8B5CF6']} />
      }
      ListFooterComponent={
        items.length > 0
          ? () => <Text style={styles.footer}>You're all caught up 🙌</Text>
          : null
      }
    />
  );
}

// ── Main Screen ────────────────────────────────────────────

export default function ActivityScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<Tab>('you');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'you', label: 'You' },
    { key: 'following', label: 'Following' },
    { key: 'leaderboard', label: 'Leaderboard' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Pills */}
      <View style={styles.pillBar}>
        {tabs.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.pill, activeTab === key && styles.pillActive]}
            onPress={() => setActiveTab(key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, activeTab === key && styles.pillTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Screen content */}
      <View style={styles.content}>
        {activeTab === 'you' && <YouTab />}
        {activeTab === 'following' && <FollowingFeedTab navigation={navigation} />}
        {activeTab === 'leaderboard' && <LeaderboardScreen />}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ── Pill bar
  pillBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  pillActive: {
    backgroundColor: '#8B5CF6',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  pillTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },

  // ── Feed list
  feedList: {
    padding: 16,
    gap: 4,
  },

  // ── Feed card
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 6,
    backgroundColor: '#0a0a0a',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    flexShrink: 0,
  },
  avatarFallback: {
    backgroundColor: '#1e1e2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  feedCardBody: {
    flex: 1,
    gap: 3,
  },
  feedCardText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 19,
  },
  feedCardUsername: {
    fontWeight: '700',
    color: '#fff',
  },
  feedCardSub: {
    fontSize: 12,
    color: '#666',
  },
  feedCardTime: {
    fontSize: 11,
    color: '#444',
    marginTop: 2,
  },

  // ── Thumbnail
  feedThumbnailWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  feedThumbnail: {
    width: 54,
    height: 54,
    borderRadius: 10,
  },
  feedThumbnailPlaceholder: {
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── States
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flexGrow: 1,
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
  errorText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footer: {
    textAlign: 'center',
    color: '#333',
    fontSize: 13,
    padding: 24,
  },

  // ── Crew Requests
  crewRequestSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  crewRequestTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  crewRequestCard: {
    backgroundColor: '#0d0718',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#8B5CF633',
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  crewRequestText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  crewRequestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  declineBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
});

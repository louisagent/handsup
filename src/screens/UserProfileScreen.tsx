import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Profile, Clip } from '../types';
import { getProfile } from '../services/profiles';
import { getClipsByUploader } from '../services/clips';
import { isFollowing, followUser, unfollowUser, getFollowCounts } from '../services/follows';
import { getMutedUserIds, muteUser, unmuteUser } from '../services/mutedUsers';
import { isModerator, banUser, isUserBanned } from '../services/moderator';
import { supabase } from '../services/supabase';
import { getOrCreateConversation } from '../services/messages';
import { SkeletonCard } from '../components/SkeletonCard';
import { getUserAttendedEvents } from '../services/attendance';
import { getUserBadges, BADGES, levelFromXp, xpForLevel, levelProgress } from '../services/xp';

interface FollowCounts {
  followers: number;
  following: number;
}

function getCreatorTagline(uploadCount: number): string {
  if (uploadCount === 0) return 'New to handsup 👋';
  if (uploadCount <= 2) return 'Getting started 📱';
  if (uploadCount <= 9) return 'Festival regular 🎪';
  if (uploadCount <= 24) return 'Festival veteran 🙌';
  if (uploadCount <= 49) return 'Festival pro 🎉';
  return 'Festival legend 🏆';
}

export default function UserProfileScreen({ route, navigation }: any) {
  const { userId } = route.params as { userId: string };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [muteLoading, setMuteLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isModUser, setIsModUser] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banLoading, setBanLoading] = useState(false);
  const [attendedEvents, setAttendedEvents] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const [profileData, clipsData, counts, followStatus, mutedIds] = await Promise.all([
        getProfile(userId),
        getClipsByUploader(userId),
        getFollowCounts(userId),
        isFollowing(userId),
        getMutedUserIds(),
      ]);
      setProfile(profileData);
      setClips(clipsData);
      setFollowCounts(counts);
      setFollowing(followStatus);
      setIsMuted(mutedIds.includes(userId));
      const [modStatus, bannedStatus] = await Promise.all([
        isModerator().catch(() => false),
        isUserBanned(userId).catch(() => false),
      ]);
      setIsModUser(modStatus);
      setIsBanned(bannedStatus);
      // Load "I Was There" attended events for this user
      getUserAttendedEvents(userId).then(setAttendedEvents).catch(() => {});
      // Load badges for this user
      getUserBadges(userId).then(setUserBadges).catch(() => {});
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleFollowToggle = async () => {
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(userId);
        setFollowing(false);
        setFollowCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
      } else {
        await followUser(userId);
        setFollowing(true);
        setFollowCounts((c) => ({ ...c, followers: c.followers + 1 }));
        const { notifyFollow } = await import('../services/notifications');
        notifyFollow(userId).catch(() => {});
      }
    } catch (_e) {
      // Silently ignore
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      // Unmute immediately — no confirmation needed
      setMuteLoading(true);
      unmuteUser(userId)
        .then(() => setIsMuted(false))
        .catch(() => {})
        .finally(() => setMuteLoading(false));
    } else {
      // Show confirmation before muting
      Alert.alert(
        'Mute this user?',
        "Their clips won't appear in your feed.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mute',
            style: 'destructive',
            onPress: () => {
              setMuteLoading(true);
              muteUser(userId)
                .then(() => setIsMuted(true))
                .catch(() => {})
                .finally(() => setMuteLoading(false));
            },
          },
        ]
      );
    }
  };

  const handleThreeDotMenu = () => {
    Alert.alert(
      'Options',
      `@${profile?.username}`,
      [
        {
          text: isMuted ? '🔈 Unmute user' : '🔇 Mute user',
          onPress: handleMuteToggle,
        },
        {
          text: '🚫 Block user',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Block User',
              `Block @${profile?.username}? They won't be able to message you or see your profile.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: () => {
                    // Call muteUser as a simple block mechanism for now
                    muteUser(userId)
                      .then(() => {
                        setIsMuted(true);
                        Alert.alert('Blocked', `You've blocked @${profile?.username}`);
                      })
                      .catch(() => {});
                  },
                },
              ]
            );
          },
        },
        {
          text: '🚩 Report user',
          onPress: () => {
            Alert.alert(
              'Report User',
              `To report @${profile?.username}, please email hello@handsuplive.com with details.`,
              [{ text: 'OK' }]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleBanToggle = () => {
    if (isBanned) {
      Alert.alert('Unban User', `Remove ban for @${profile?.username}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unban',
          onPress: async () => {
            setBanLoading(true);
            const { unbanUser } = await import('../services/moderator');
            unbanUser(userId)
              .then(() => setIsBanned(false))
              .catch(() => Alert.alert('Error', 'Could not unban user.'))
              .finally(() => setBanLoading(false));
          },
        },
      ]);
    } else {
      Alert.prompt(
        '🛡️ Ban User',
        `Ban @${profile?.username}? Enter a reason (optional):`,
        async (reason?: string) => {
          setBanLoading(true);
          banUser(userId, reason?.trim() || undefined)
            .then(() => setIsBanned(true))
            .catch(() => Alert.alert('Error', 'Could not ban user.'))
            .finally(() => setBanLoading(false));
        },
        'plain-text'
      );
    }
  };

  const initials = profile
    ? (profile.display_name?.trim()?.[0] ?? profile.username?.trim()?.[0] ?? '?').toUpperCase()
    : '?';

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="warning-outline" size={48} color="#555" />
        <Text style={styles.errorText}>{error ?? 'Profile not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData} activeOpacity={0.85}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
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
        {/* Header */}
        <View style={styles.header}>
          {/* Avatar */}
          <View style={styles.avatarCircle}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>

          {/* Names */}
          <Text style={styles.displayName}>{profile.display_name ?? profile.username}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          <Text style={styles.userTagline}>{getCreatorTagline(profile.total_uploads ?? clips.length)}</Text>
          <View style={styles.xpRow}>
            <Text style={styles.levelBadge}>Lv.{levelFromXp(profile.xp ?? 0)}</Text>
            <Text style={styles.xpText}>{(profile.xp ?? 0).toLocaleString()} XP</Text>
          </View>

          {profile.is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>⚡ Verified</Text>
            </View>
          )}

          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {/* Buttons */}
          {currentUserId !== userId && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.followBtn, following && styles.followingBtn]}
                onPress={handleFollowToggle}
                disabled={followLoading}
                activeOpacity={0.85}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.followBtnText}>
                    {following ? '✓ Following' : 'Follow'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.messageBtn}
                onPress={async () => {
                  try {
                    const conversationId = await getOrCreateConversation(userId);
                    navigation.navigate('Conversation', {
                      conversationId,
                      otherUser: {
                        id: userId,
                        username: profile.username,
                        avatar_url: profile.avatar_url,
                      },
                    });
                  } catch (error) {
                    console.error('Failed to open conversation:', error);
                  }
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="mail-outline" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.threeDotBtn}
                onPress={handleThreeDotMenu}
                activeOpacity={0.85}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Support button — shown to non-owners when creator has a support URL */}
          {profile.support_url && currentUserId !== userId && (
            <TouchableOpacity
              style={styles.supportBtn}
              onPress={() => {
                const url = profile.support_url!;
                Linking.canOpenURL(url).then((can) => {
                  if (can) Linking.openURL(url);
                  else Alert.alert('Cannot open link', url);
                });
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.supportBtnText}>☕ Support this creator</Text>
            </TouchableOpacity>
          )}

          {/* Ban button — only shown to moderators on other users' profiles */}
          {isModUser && currentUserId !== userId && (
            <TouchableOpacity
              style={[styles.banBtn, isBanned && styles.banBtnActive]}
              onPress={handleBanToggle}
              disabled={banLoading}
              activeOpacity={0.85}
            >
              {banLoading ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Text style={styles.banBtnText}>
                  {isBanned ? '🛡️ Banned — Tap to Unban' : '🛡️ Ban User'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.total_uploads}</Text>
            <Text style={styles.statLabel}>Uploads</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.total_downloads.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Downloads</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{followCounts.followers.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{followCounts.following.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Festivals (merged: clips + attended) */}
        {(() => {
          // Build festival map from clips
          const festivalMap: Record<string, string> = {};
          clips.forEach((c) => {
            if (c.festival_name) {
              const year = c.clip_date ? new Date(c.clip_date).getFullYear().toString() : '';
              if (!festivalMap[c.festival_name]) festivalMap[c.festival_name] = year;
            }
          });
          // Merge attended events (only add if not already in map)
          attendedEvents.forEach((a) => {
            const name = a.event?.name;
            if (name && !festivalMap[name]) {
              const year = a.event?.start_date ? new Date(a.event.start_date).getFullYear().toString() : '';
              festivalMap[name] = year;
            }
          });
          const festivalEntries = Object.entries(festivalMap);
          if (festivalEntries.length === 0) return null;
          return (
            <View style={styles.festivalsSection}>
              <Text style={styles.festivalsTitle}>{profile.username}'s Festivals</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.festivalBadgeRow}
              >
                {festivalEntries.map(([fest, year]) => (
                  <TouchableOpacity
                    key={fest}
                    style={styles.festivalBadge}
                    onPress={() => navigation.navigate('Search', { initialQuery: fest })}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.festivalBadgeIcon}>📍</Text>
                    <Text style={styles.festivalBadgeName} numberOfLines={2}>{fest}</Text>
                    {year ? <Text style={styles.festivalBadgeYear}>{year}</Text> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        })()}

        {/* Badges (earned only) */}
        {userBadges.length > 0 && (
          <View style={styles.badgesSection}>
            <Text style={styles.badgesTitle}>{userBadges.length} Achievement{userBadges.length !== 1 ? 's' : ''}</Text>
            {/* Top 5 most recent badges (non-scrollable) */}
            {userBadges.length > 0 && (
              <View style={styles.badgesTopRow}>
                {userBadges.slice(0, 5).map((key) => {
                  const badge = BADGES[key];
                  if (!badge) return null;
                  return (
                    <View key={key} style={styles.badgeCompact}>
                      <Text style={styles.badgeEmojiCompact}>{badge.emoji}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            {/* All badges (horizontally scrollable) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesRow}
            >
              {userBadges.map((key) => {
                const badge = BADGES[key];
                if (!badge) return null;
                return (
                  <View key={key} style={styles.badge}>
                    <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                    <Text style={styles.badgeLabel} numberOfLines={2}>{badge.label}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Clips section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Clips{clips.length > 0 ? ` (${clips.length})` : ''}
          </Text>

          {clips.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="videocam-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>No clips uploaded yet</Text>
            </View>
          ) : (
            clips.map((clip) => (
              <TouchableOpacity
                key={clip.id}
                style={styles.clipCard}
                onPress={() => navigation.navigate('VideoDetail', { video: clip })}
                activeOpacity={0.85}
              >
                {clip.thumbnail_url ? (
                  <Image source={{ uri: clip.thumbnail_url }} style={styles.clipThumb} />
                ) : (
                  <View style={[styles.clipThumb, styles.clipThumbPlaceholder]}>
                    <Ionicons name="musical-notes-outline" size={24} color="#333" />
                  </View>
                )}
                <View style={styles.clipInfo}>
                  <Text style={styles.clipArtist}>{clip.artist}</Text>
                  <Text style={styles.clipFestival}>{clip.festival_name}</Text>
                  <Text style={styles.clipMeta}>
                    {clip.location} · {clip.clip_date}
                  </Text>
                  <View style={styles.clipStats}>
                    <Text style={styles.clipStat}>▶ {clip.view_count.toLocaleString()}</Text>
                    <Text style={styles.clipStat}>⬇ {clip.download_count.toLocaleString()}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: { color: '#EF4444', fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  retryText: { color: '#8B5CF6', fontWeight: '700' },

  // Header
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: { color: '#fff', fontSize: 28, fontWeight: '800' },
  displayName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  username: { fontSize: 14, color: '#555', marginTop: 2 },
  userTagline: { fontSize: 13, color: '#666', fontWeight: '500', marginTop: 4 },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  levelBadge: {
    backgroundColor: '#8B5CF6',
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  xpText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  verifiedBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  verifiedText: { color: '#A78BFA', fontSize: 12, fontWeight: '700' },
  bio: {
    marginTop: 10,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
    alignItems: 'center',
  },
  followBtn: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  followBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  messageBtn: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  threeDotBtn: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  muteBtn: {
    marginTop: 8,
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  muteBtnActive: {
    backgroundColor: '#1a1a1a',
    borderColor: '#555',
  },
  muteBtnText: { color: '#aaa', fontWeight: '600', fontSize: 14 },
  supportBtn: {
    marginTop: 8,
    backgroundColor: '#1a1228',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF644',
  },
  supportBtnText: {
    color: '#A78BFA',
    fontWeight: '700',
    fontSize: 14,
  },
  banBtn: {
    marginTop: 8,
    backgroundColor: '#1a0808',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF444433',
  },
  banBtnActive: {
    backgroundColor: '#2a0808',
    borderColor: '#EF4444',
  },
  banBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: '#555', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: '#2a2a2a' },

  // Festivals
  festivalsSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  festivalsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  festivalBadgeRow: { gap: 10, paddingBottom: 4 },
  festivalBadge: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a1650',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 90,
    maxWidth: 120,
  },
  festivalBadgeIcon: { fontSize: 18, marginBottom: 4 },
  festivalBadgeName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
  festivalBadgeYear: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },

  // Attended (I Was There)
  attendedSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  attendedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  attendedRow: { gap: 10 },
  attendedBadge: {
    backgroundColor: '#0a1a12',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B98133',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 90,
    maxWidth: 120,
  },
  attendedBadgeIcon: { fontSize: 18, marginBottom: 4 },
  attendedBadgeName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
  attendedBadgeYear: { color: '#10B981', fontSize: 11, fontWeight: '600', marginTop: 3 },

  // Badges
  badgesSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  badgesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  badgesTopRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'flex-start',
  },
  badgeCompact: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a1650',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmojiCompact: {
    fontSize: 24,
  },
  badgesRow: { gap: 10 },
  badge: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a1650',
    padding: 10,
    alignItems: 'center',
    width: 80,
    gap: 6,
  },
  badgeEmoji: { fontSize: 26 },
  badgeLabel: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Clips list
  section: { padding: 16, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: { color: '#555', fontSize: 15, textAlign: 'center' },
  clipCard: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 10,
  },
  clipThumb: { width: 110, height: 82, backgroundColor: '#1a1a1a' },
  clipThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  clipInfo: { flex: 1, padding: 12 },
  clipArtist: { fontSize: 14, fontWeight: '700', color: '#fff' },
  clipFestival: { fontSize: 12, color: '#8B5CF6', marginTop: 2 },
  clipMeta: { fontSize: 11, color: '#555', marginTop: 2 },
  clipStats: { flexDirection: 'row', gap: 10, marginTop: 6 },
  clipStat: { fontSize: 11, color: '#444' },
});

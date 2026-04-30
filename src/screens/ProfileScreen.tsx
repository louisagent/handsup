// ============================================================
// Handsup — Profile Screen (Premium Rewrite)
// Black background, purple accents, white text
// ============================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ActionSheetIOS,
  Alert,
  Platform,
  StatusBar,
  FlatList,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentProfile, getMyUploads } from '../services/auth';
import { getFollowCounts } from '../services/follows';
import { pinClip, unpinClip } from '../services/profiles';
import { supabase } from '../services/supabase';
import { getUserBadges, BADGES, xpForLevel, levelProgress, levelFromXp } from '../services/xp';
import { getStreakInfo } from '../services/streaks';
import { getUserAttendedEvents } from '../services/attendance';
import { Profile, Clip } from '../types';

// ── Helpers ────────────────────────────────────────────────

function getInitials(name?: string, username?: string): string {
  const letter = name?.trim()?.[0] ?? username?.trim()?.[0] ?? '?';
  return letter.toUpperCase();
}

// ── Sub-components ─────────────────────────────────────────

function AvatarCircle({ profile }: { profile: Profile | null }) {
  if (profile?.avatar_url) {
    return (
      <View style={avatarStyles.circle}>
        <Image source={{ uri: profile.avatar_url }} style={avatarStyles.avatarImage} />
      </View>
    );
  }
  return (
    <View style={avatarStyles.circle}>
      <Text style={avatarStyles.initials}>
        {getInitials(profile?.display_name, profile?.username)}
      </Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 14,
    overflow: 'hidden',
  },
  initials: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
});

function ClipCard({
  clip,
  onPress,
  onLongPress,
  isPinned,
}: {
  clip: Clip;
  onPress: () => void;
  onLongPress: () => void;
  isPinned?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[clipStyles.card, isPinned && clipStyles.cardPinned]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      delayLongPress={400}
    >
      {/* Thumbnail */}
      <View style={clipStyles.thumb}>
        {clip.thumbnail_url ? (
          <Image 
            source={{ uri: clip.thumbnail_url }} 
            style={{ width: '100%', height: '100%' }} 
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="play-circle-outline" size={28} color="#8B5CF6" />
        )}
        {isPinned && (
          <View style={clipStyles.pinnedBadge}>
            <Ionicons name="pin" size={10} color="#fff" />
          </View>
        )}
      </View>
      <View style={clipStyles.info}>
        <Text style={clipStyles.artist} numberOfLines={1}>{clip.artist}</Text>
        <Text style={clipStyles.festival} numberOfLines={1}>{clip.festival_name}</Text>
        <View style={clipStyles.meta}>
          <Ionicons name="location-outline" size={11} color="#555" />
          <Text style={clipStyles.metaText} numberOfLines={1}>{clip.location}</Text>
        </View>
        <View style={clipStyles.stats}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="eye-outline" size={11} color="#8B5CF6" />
            <Text style={clipStyles.statText}>{(clip.view_count ?? 0).toLocaleString()}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="arrow-down-circle-outline" size={11} color="#555" />
            <Text style={clipStyles.statText}>{clip.download_count.toLocaleString()}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const clipStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    alignItems: 'center',
  },
  cardPinned: {
    borderColor: '#8B5CF6',
    backgroundColor: '#0d0a1a',
  },
  thumb: {
    width: 90,
    height: 72,
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1e1e1e',
    position: 'relative',
  },
  pinnedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  pinnedBadgeText: {
    fontSize: 10,
  },
  info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  artist: { fontSize: 14, fontWeight: '700', color: '#fff' },
  festival: { fontSize: 12, color: '#8B5CF6', marginTop: 2, fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 },
  metaText: { fontSize: 11, color: '#555' },
  stats: { flexDirection: 'row', gap: 10, marginTop: 6 },
  statText: { fontSize: 11, color: '#444' },
});

function SettingsRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={settingStyles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={settingStyles.iconBox}>
        <Ionicons name={icon} size={20} color="#8B5CF6" />
      </View>
      <Text style={settingStyles.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#333" />
    </TouchableOpacity>
  );
}

const settingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 15, color: '#fff', fontWeight: '500' },
});

// ── Creator tagline ─────────────────────────────────────────

function getCreatorTagline(uploadCount: number): string {
  if (uploadCount === 0) return 'New to handsup 👋';
  if (uploadCount <= 2) return 'Getting started 📱';
  if (uploadCount <= 9) return 'Festival regular 🎪';
  if (uploadCount <= 24) return 'Festival veteran 🙌';
  return 'Festival crew 🏆';
}

// ── Main Screen ─────────────────────────────────────────────

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [pinnedClipIds, setPinnedClipIds] = useState<string[]>([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePromptDismissed, setProfilePromptDismissed] = useState(true);
  const [badges, setBadges] = useState<string[]>([]);
  const [attendedEvents, setAttendedEvents] = useState<any[]>([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const clipsYOffset = useRef<number>(0);
  const [selectedBadge, setSelectedBadge] = useState<{ key: string; label: string; emoji: string; description: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [prof, uploads, dismissed] = await Promise.all([
        getCurrentProfile(),
        getMyUploads() as Promise<Clip[]>,
        AsyncStorage.getItem('handsup_profile_prompt_dismissed'),
      ]);
      setProfile(prof);
      setClips(uploads);
      setProfilePromptDismissed(dismissed === 'true');
      // Load pinned_clip_ids (fallback to old single pin for backward compat)
      let pinnedIds: string[] = prof?.pinned_clip_ids ?? [];
      if (prof?.pinned_clip_id && !pinnedIds.includes(prof.pinned_clip_id)) {
        pinnedIds = [prof.pinned_clip_id, ...pinnedIds];
      }
      setPinnedClipIds(pinnedIds);
      if (prof) {
        const counts = await getFollowCounts(prof.id);
        setFollowCounts(counts);
        // Load XP and badges
        setXp(prof.xp ?? 0);
        setLevel(prof.level ?? 1);
        getUserBadges(prof.id).then(setBadges).catch(() => {});
        // Load attended events for "I Was There" badges
        getUserAttendedEvents(prof.id).then(setAttendedEvents).catch(() => {});
        // Load streak info
        getStreakInfo(prof.id)
          .then((info) => {
            setStreak(info.current);
            setLongestStreak(info.longest);
          })
          .catch(() => {});
      }
    } catch (_e) {
      // silently fail — data just won't show
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleDismissProfilePrompt = async () => {
    await AsyncStorage.setItem('handsup_profile_prompt_dismissed', 'true');
    setProfilePromptDismissed(true);
  };

  const handleDeleteClip = (clip: Clip) => {
    Alert.alert(
      'Delete clip?',
      `"${clip.artist} @ ${clip.festival_name}" will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('clips').delete().eq('id', clip.id);
              setClips((prev) => prev.filter((c) => c.id !== clip.id));
              if (pinnedClipIds.includes(clip.id)) {
                await unpinClip(clip.id);
                setPinnedClipIds((prev) => prev.filter((id) => id !== clip.id));
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not delete clip.');
            }
          },
        },
      ]
    );
  };

  const handleLongPressClip = (clip: Clip) => {
    const isPinned = pinnedClipIds.includes(clip.id);
    const canPin = pinnedClipIds.length < 3;
    let pinLabel = 'Pin to profile';
    if (isPinned) pinLabel = 'Unpin from profile';
    else if (!canPin) pinLabel = 'Max 3 pins';
    const options = [pinLabel, '🗑 Delete clip', 'Cancel'];

    const runAction = async (idx: number) => {
      if (idx === 0) {
        // Pin / Unpin — update local state immediately for snappy UI, then persist
        if (isPinned) {
          setPinnedClipIds((prev) => prev.filter((id) => id !== clip.id));
          try { await unpinClip(clip.id); } catch (e: any) {
            setPinnedClipIds((prev) => [...prev, clip.id]); // rollback on error
            Alert.alert('Error', e?.message ?? 'Could not unpin clip.');
          }
        } else if (canPin) {
          setPinnedClipIds((prev) => [...prev, clip.id]);
          try { await pinClip(clip.id); } catch (e: any) {
            setPinnedClipIds((prev) => prev.filter((id) => id !== clip.id)); // rollback on error
            Alert.alert('Error', e?.message ?? 'Could not pin clip.');
          }
        } else {
          Alert.alert('Max Pins', 'You can pin up to 3 clips. Unpin one to add another.');
        }
      } else if (idx === 1) {
        handleDeleteClip(clip);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 2, destructiveButtonIndex: 1 },
        runAction
      );
    } else {
      Alert.alert(
        clip.artist,
        'Choose an action',
        [
          { text: pinLabel, onPress: () => runAction(0) },
          { text: '🗑 Delete clip', style: 'destructive', onPress: () => runAction(1) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const showProfilePrompt =
    !profilePromptDismissed &&
    !!(profile) &&
    !profile.bio &&
    !profile.avatar_url;

  // Pinned clips (up to 3)
  const pinnedClips = pinnedClipIds
    .map((id) => clips.find((c) => c.id === id))
    .filter((c): c is Clip => !!c);

  // Best clip — highest download count
  const bestClip = clips.length > 0
    ? clips.reduce((best, c) => (c.download_count > best.download_count ? c : best), clips[0])
    : null;
  
  // Sorted clips for "My Clips" section: best clip → pinned clips → rest
  const sortedClips = (() => {
    const best = bestClip && bestClip.download_count > 0 ? bestClip : null;
    const pinned = pinnedClips.filter((c) => c.id !== best?.id); // Don't duplicate best
    const rest = clips.filter((c) => c.id !== best?.id && !pinnedClipIds.includes(c.id));
    return [best, ...pinned, ...rest].filter((c): c is Clip => !!c);
  })();

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <>
    <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
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
        <TouchableOpacity
          style={styles.gearBtn}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.75}
        >
          <Ionicons name="settings-outline" size={22} color="#555" />
        </TouchableOpacity>
        <AvatarCircle profile={profile} />
        {(!profile?.display_name || profile?.display_name === 'New User') ? (
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.8}>
            <Text style={styles.addNamePrompt}>Add your name →</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.displayName}>{profile.display_name}</Text>
        )}
        <Text style={styles.username}>@{profile?.username || 'unknown'}</Text>
        {/* Creator tagline based on upload count */}
        <Text style={styles.creatorTagline}>
          {getCreatorTagline(profile?.total_uploads ?? clips.length)}
        </Text>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.stat}
            onPress={() => scrollViewRef.current?.scrollTo({ y: clipsYOffset.current, animated: true })}
            activeOpacity={0.75}
          >
            <Text style={styles.statValue}>{(profile?.total_uploads ?? clips.length).toLocaleString()}</Text>
            <Text style={[styles.statLabel, styles.statLabelTappable]}>Uploads</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{(profile?.total_downloads ?? 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Downloads</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{followCounts.following.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{followCounts.followers.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          {streak > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>🔥 {streak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Level + XP bar ── */}
        <View style={styles.xpSection}>
          <View style={styles.xpHeader}>
            <Text style={styles.levelBadge}>Lv.{levelFromXp(xp)}</Text>
            <Text style={styles.xpText}>{xp.toLocaleString()} / {xpForLevel(levelFromXp(xp) + 1).toLocaleString()} XP</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${levelProgress(xp, levelFromXp(xp)) * 100}%` as any }]} />
          </View>
        </View>

        {/* ── Profile Completion Prompt ── */}
        {showProfilePrompt && (
          <View style={styles.profilePromptBanner}>
            <View style={styles.profilePromptLeft} />
            <View style={styles.profilePromptContent}>
              <Text style={styles.profilePromptTitle}>Complete your profile to get discovered</Text>
              <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
                <Text style={styles.profilePromptLink}>Add bio & photo →</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleDismissProfilePrompt} style={styles.profilePromptDismiss}>
              <Text style={styles.profilePromptDismissText}>×</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── FESTIVALS (merged with attended) ── */}
      {(() => {
        // Build festival map from clips
        const festivalMap: Record<string, { year: string; hasClip: boolean }> = {};
        clips.forEach((c) => {
          if (c.festival_name) {
            const year = c.clip_date ? new Date(c.clip_date).getFullYear().toString() : '';
            if (!festivalMap[c.festival_name]) {
              festivalMap[c.festival_name] = { year, hasClip: true };
            }
          }
        });
        // Merge attended events (only add if not already in map)
        attendedEvents.forEach((a) => {
          const name = a.event?.name;
          if (name && !festivalMap[name]) {
            const year = a.event?.start_date ? new Date(a.event.start_date).getFullYear().toString() : '';
            festivalMap[name] = { year, hasClip: false };
          }
        });
        const festivalEntries = Object.entries(festivalMap);
        if (festivalEntries.length === 0) return null;
        // Sort by year (most recent first), then by name
        const sortedFestivals = festivalEntries.sort(([_, a], [__, b]) => {
          const yearA = parseInt(a.year) || 0;
          const yearB = parseInt(b.year) || 0;
          if (yearB !== yearA) return yearB - yearA; // descending year
          return 0;
        });
        return (
          <View style={styles.festivalsSection}>
            <Text style={styles.sectionTitle}>FESTIVALS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.festivalBadgeRow}
            >
              {sortedFestivals.map(([fest, info]) => (
                <TouchableOpacity
                  key={fest}
                  style={styles.festivalBadge}
                  onPress={() => navigation.navigate('Search', { initialQuery: fest })}
                  activeOpacity={0.75}
                >
                  <Text style={styles.festivalBadgeIcon}>📍</Text>
                  <Text style={styles.festivalBadgeName} numberOfLines={2}>{fest}</Text>
                  {info.year ? <Text style={styles.festivalBadgeYear}>{info.year}</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      })()}

      {/* ── Badges ── */}
      {/* ── BADGES (Earned badges only) ── */}
      {(() => {
        // Filter out badges that don't exist in BADGES definition
        const validBadges = badges.filter((key) => BADGES[key]);
        return validBadges.length > 0 ? (
          <View style={styles.badgesSection}>
            <Text style={styles.badgesTitle}>{validBadges.length} BADGE{validBadges.length !== 1 ? 'S' : ''}</Text>
            {/* All badges (horizontally scrollable, same size) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
              {validBadges.map((key) => {
                const badge = BADGES[key];
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.badgeUniform}
                    onPress={() => setSelectedBadge({ key, ...badge })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.badgeEmojiUniform}>{badge.emoji}</Text>
                    <Text style={styles.badgeLabelUniform} numberOfLines={2}>{badge.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.badgesSection}>
            <Text style={styles.badgesTitle}>0 BADGES</Text>
            <Text style={styles.badgesEmpty}>Earn your first badge by uploading a clip</Text>
          </View>
        );
      })()}

      {/* ── Best Clip ── */}
      {bestClip && bestClip.download_count > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Best Clip</Text>
          <TouchableOpacity
            style={styles.bestClipCard}
            onPress={() => navigation.navigate('VideoDetail', { video: bestClip })}
            activeOpacity={0.85}
          >
            {bestClip.thumbnail_url ? (
              <Image source={{ uri: bestClip.thumbnail_url }} style={styles.bestClipThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.bestClipThumb, styles.bestClipThumbPlaceholder]} />
            )}
            <View style={styles.bestClipOverlay}>
              <View style={styles.bestClipInfo}>
                <Text style={styles.bestClipArtist} numberOfLines={1}>{bestClip.artist}</Text>
                <Text style={styles.bestClipFestival} numberOfLines={1}>{bestClip.festival_name}</Text>
              </View>
              <View style={styles.bestClipStat}>
                <Text style={styles.bestClipDownloads}>⬇ {bestClip.download_count.toLocaleString()}</Text>
                <Text style={styles.bestClipDownloadsLabel}>downloads</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 📌 Pinned Section ── */}
      {pinnedClips.length > 0 && (
        <View style={styles.section}>
          <View style={styles.pinnedSectionHeader}>
            <Text style={styles.pinnedSectionTitle}>Pinned</Text>
          </View>
          {pinnedClips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              isPinned
              onPress={() => navigation.navigate('VideoDetail', { video: clip })}
              onLongPress={() => handleLongPressClip(clip)}
            />
          ))}
        </View>
      )}

      {/* ── All Clips ── */}
      <View
        style={styles.section}
        onLayout={(e) => { clipsYOffset.current = e.nativeEvent.layout.y; }}
      >
        <Text style={styles.sectionTitle}>All Clips</Text>
        {clips.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-outline" size={36} color="#333" />
            <Text style={styles.emptyText}>Your first clip could be the most viewed. 👀</Text>
          </View>
        ) : (
          sortedClips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              isPinned={pinnedClipIds.includes(clip.id)}
              onPress={() => navigation.navigate('VideoDetail', { video: clip })}
              onLongPress={() => handleLongPressClip(clip)}
            />
          ))
        )}
        {clips.length > 0 && (
          <Text style={styles.longPressHint}>Long press a clip to pin or delete it</Text>
        )}
      </View>

      {/* ── Content ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content</Text>
        <View style={styles.settingsBlock}>
          <SettingsRow
            icon="trophy-outline"
            label="Weekly Challenges 🏆"
            onPress={() => navigation.navigate('WeeklyChallenges')}
          />
          <SettingsRow
            icon="bookmark-outline"
            label="Saved Clips"
            onPress={() => navigation.navigate('SavedClips')}
          />
          <SettingsRow
            icon="download-outline"
            label="Download History"
            onPress={() => navigation.navigate('DownloadHistory')}
          />
          <SettingsRow
            icon="bar-chart-outline"
            label="Creator Stats"
            onPress={() => navigation.navigate('CreatorStats')}
          />
          {!profile?.is_verified && (
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Get Verified ⚡"
              onPress={() => navigation.navigate('VerificationApplication')}
            />
          )}
          {profile?.is_verified && (
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Admin Panel"
              onPress={() => navigation.navigate('Admin')}
            />
          )}
        </View>
      </View>

      {/* ── Settings ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsBlock}>
          <SettingsRow
            icon="person-circle-outline"
            label="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <SettingsRow
            icon="settings-outline"
            label="Settings"
            onPress={() => navigation.navigate('Settings')}
          />
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            onPress={() => navigation.navigate('Settings')}
          />
          <SettingsRow
            icon="people-outline"
            label="My Groups"
            onPress={() => navigation.navigate('GroupsScreen')}
          />
        </View>
      </View>

      {/* ── Sign Out ── */}
      <View style={styles.signOutSection}>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

    {/* Badge Info Modal */}
    <Modal
      visible={!!selectedBadge}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedBadge(null)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setSelectedBadge(null)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalEmoji}>{selectedBadge?.emoji}</Text>
          <Text style={styles.modalTitle}>{selectedBadge?.label}</Text>
          <Text style={styles.modalDescription}>{selectedBadge?.description}</Text>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setSelectedBadge(null)}
            activeOpacity={0.8}
          >
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { paddingBottom: 100 },
  centered: { alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    paddingTop: 64,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  gearBtn: {
    position: 'absolute',
    top: 64,
    right: 24,
    padding: 6,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  addNamePrompt: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    marginTop: 3,
    marginBottom: 4,
  },
  creatorTagline: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    marginBottom: 6,
  },
  bio: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
    maxWidth: 280,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: '#222' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, color: '#555', marginTop: 3, fontWeight: '500' },
  statLabelTappable: { color: '#8B5CF6' },

  // Festivals
  festivalsSection: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 4 },
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

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  pinnedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pinnedSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: -0.3,
  },
  pinnedHint: {
    fontSize: 11,
    color: '#8B5CF6',
    marginBottom: 10,
    marginTop: -8,
  },
  longPressHint: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 10,
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  emptyText: { color: '#444', fontSize: 14, fontWeight: '600' },

  // Settings block
  settingsBlock: {
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },

  // Best Clip card
  bestClipCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#8B5CF633',
  },
  bestClipThumb: {
    width: '100%',
    height: 120,
    backgroundColor: '#1a1228',
  },
  bestClipThumbPlaceholder: {
    backgroundColor: '#1a1228',
  },
  bestClipOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#0d0a1a',
  },
  bestClipInfo: { flex: 1 },
  bestClipArtist: { color: '#fff', fontWeight: '800', fontSize: 15 },
  bestClipFestival: { color: '#8B5CF6', fontSize: 12, fontWeight: '600', marginTop: 2 },
  bestClipStat: { alignItems: 'flex-end' },
  bestClipDownloads: { color: '#A78BFA', fontWeight: '800', fontSize: 16 },
  bestClipDownloadsLabel: { color: '#555', fontSize: 10 },

  // XP & Level
  xpSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: '100%',
    marginTop: 12,
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  nextLevelText: { fontSize: 12, color: '#444' },
  xpTrack: {
    height: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%' as any,
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },

  // Badges
  badgesSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  badgesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 2,
    marginBottom: 12,
  },
  badgesEmpty: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 12,
  },
  badgesRow: { gap: 10, paddingBottom: 4 },
  badgeUniform: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a1650',
    padding: 10,
    alignItems: 'center',
    width: 80,
    height: 100,
    justifyContent: 'center',
    gap: 6,
  },
  badgeEmojiUniform: { fontSize: 26 },
  badgeLabelUniform: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Sign out
  signOutSection: { padding: 16, marginTop: 8 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1c0a0a',
    borderWidth: 1,
    borderColor: '#EF444430',
    borderRadius: 14,
    paddingVertical: 16,
  },
  signOutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },

  // Profile completion prompt
  profilePromptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1228',
    borderRadius: 12,
    marginTop: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2d1f4a',
  },
  profilePromptLeft: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: '#8B5CF6',
  },
  profilePromptContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  profilePromptTitle: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  profilePromptLink: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '700',
  },
  profilePromptDismiss: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePromptDismissText: {
    color: '#555',
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 22,
  },

  // Badge Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  modalEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalCloseBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalCloseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

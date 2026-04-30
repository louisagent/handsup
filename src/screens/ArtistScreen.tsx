import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Switch,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Clip } from '../types';
import { getClipsByArtist } from '../services/clips';
import { SkeletonCard } from '../components/SkeletonCard';
import { isFollowing, followUser, unfollowUser } from '../services/follows';
import * as Haptics from 'expo-haptics';
import { getArtistClaim, getMyArtistClaim, ArtistClaim } from '../services/artistClaim';
import { getArtistFestivalAppearances } from '../services/lineups';
import { supabase } from '../services/supabase';
import {
  getArtistDiscussions,
  getDiscussionReplies,
  postArtistDiscussion,
  ArtistDiscussion,
} from '../services/discussions';

const SCREEN_WIDTH = Dimensions.get('window').width;

function formatTimeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ArtistScreen({ route, navigation }: any) {
  const { artist } = route.params as { artist: string };

  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [uploaderChecked, setUploaderChecked] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const viewModeLoaded = useRef(false);
  const [artistClaim, setArtistClaim] = useState<ArtistClaim | null>(null);
  const [myClaim, setMyClaim] = useState<ArtistClaim | null>(null);
  const [upcomingGigs, setUpcomingGigs] = useState<any[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'clips' | 'discussion'>('clips');

  // Discussion state
  const [discussions, setDiscussions] = useState<ArtistDiscussion[]>([]);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string>('user');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, ArtistDiscussion[]>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyPosting, setReplyPosting] = useState<Record<string, boolean>>({});

  // Load persisted view mode once on mount
  useEffect(() => {
    AsyncStorage.getItem('handsup_artist_view_mode').then((val) => {
      if (val === 'grid' || val === 'list') setViewMode(val);
      viewModeLoaded.current = true;
    }).catch(() => { viewModeLoaded.current = true; });
  }, []);

  const loadClips = useCallback(async () => {
    try {
      setError(null);
      const data = await getClipsByArtist(artist);
      setClips(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load clips');
    } finally {
      setLoading(false);
    }
  }, [artist]);

  useEffect(() => { loadClips(); }, [loadClips]);

  // Load current user's username
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.username) setCurrentUsername(profile.username);
      } catch {}
    })();
  }, []);

  const artistSlug = artist.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const loadDiscussions = useCallback(async () => {
    setDiscussionLoading(true);
    try {
      const data = await getArtistDiscussions(artistSlug);
      setDiscussions(data);
    } catch {}
    finally { setDiscussionLoading(false); }
  }, [artistSlug]);

  useEffect(() => {
    if (activeTab === 'discussion') loadDiscussions();
  }, [activeTab, loadDiscussions]);

  const handlePostDiscussion = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const post = await postArtistDiscussion({
        artist_slug: artistSlug,
        body: newPost.trim(),
        username: currentUsername,
      });
      setDiscussions((prev) => [post, ...prev]);
      setNewPost('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not post.');
    } finally {
      setPosting(false);
    }
  };

  const handleToggleReplies = async (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
      return;
    }
    setExpandedPost(postId);
    if (!replies[postId]) {
      try {
        const data = await getDiscussionReplies(postId);
        setReplies((prev) => ({ ...prev, [postId]: data }));
      } catch {}
    }
  };

  const handlePostReply = async (parentId: string) => {
    const text = replyText[parentId]?.trim();
    if (!text) return;
    setReplyPosting((prev) => ({ ...prev, [parentId]: true }));
    try {
      const reply = await postArtistDiscussion({
        artist_slug: artistSlug,
        body: text,
        username: currentUsername,
        parent_id: parentId,
      });
      setReplies((prev) => ({ ...prev, [parentId]: [...(prev[parentId] ?? []), reply] }));
      setReplyText((prev) => ({ ...prev, [parentId]: '' }));
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not post reply.');
    } finally {
      setReplyPosting((prev) => ({ ...prev, [parentId]: false }));
    }
  };

  // Load artist claim data
  useEffect(() => {
    Promise.all([
      getArtistClaim(artist).catch(() => null),
      getMyArtistClaim(artist).catch(() => null),
    ]).then(([claim, myClaimData]) => {
      setArtistClaim(claim);
      setMyClaim(myClaimData);
    });
    // Load festival appearances
    getArtistFestivalAppearances(artist)
      .then(setUpcomingGigs)
      .catch(() => {});
  }, [artist]);

  // Once clips load, check follow status for uploader_id of first clip
  useEffect(() => {
    if (uploaderChecked || clips.length === 0) return;
    const uploaderId = clips[0]?.uploader_id;
    if (!uploaderId) {
      setUploaderChecked(true);
      return;
    }
    setUploaderChecked(true);
    isFollowing(uploaderId).then(setFollowing).catch(() => {});
  }, [clips, uploaderChecked]);

  // Load notify preference once we know the uploader
  useEffect(() => {
    const uid = clips.length > 0 ? clips[0]?.uploader_id : null;
    if (!uid) return;
    AsyncStorage.getItem(`handsup_artist_notify_${uid}`)
      .then((val) => setNotifyEnabled(val === 'true'))
      .catch(() => {});
  }, [clips]);

  // Persist view mode whenever it changes (after initial load)
  useEffect(() => {
    if (!viewModeLoaded.current) return;
    AsyncStorage.setItem('handsup_artist_view_mode', viewMode).catch(() => {});
  }, [viewMode]);

  const uploaderUserId = clips.length > 0 ? clips[0]?.uploader_id : null;

  const handleFollowToggle = async () => {
    if (!uploaderUserId || followLoading) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(uploaderUserId);
        setFollowing(false);
      } else {
        await followUser(uploaderUserId);
        setFollowing(true);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Error', 'Could not update follow status.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleNotifyToggle = async (value: boolean) => {
    if (!uploaderUserId) return;
    setNotifyEnabled(value);
    await AsyncStorage.setItem(`handsup_artist_notify_${uploaderUserId}`, value ? 'true' : 'false').catch(() => {});
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClips();
    setRefreshing(false);
  };

  // Is this artist verified?
  const isArtistVerified = clips.some((c) => c.uploader?.is_verified === true);

  // Aggregate stats
  const totalViews = clips.reduce((sum, c) => sum + (c.view_count ?? 0), 0);
  const totalDownloads = clips.reduce((sum, c) => sum + (c.download_count ?? 0), 0);
  const festivals = [...new Set(clips.map((c) => c.festival_name).filter(Boolean))];

  const renderClipCard = (item: Clip) => (
    <TouchableOpacity
      key={item.id}
      style={styles.clipCard}
      onPress={() => navigation.navigate('VerticalFeed', { initialClip: item, clips })}
      activeOpacity={0.85}
    >
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="musical-notes-outline" size={24} color="#333" />
        </View>
      )}
      <View style={styles.clipInfo}>
        <Text style={styles.clipFestival}>{item.festival_name}</Text>
        <Text style={styles.clipMeta}>
          {item.location} · {item.clip_date}
        </Text>
        {item.description ? (
          <Text style={styles.clipDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.clipStats}>
          <Text style={styles.clipStat}>▶ {(item.view_count ?? 0).toLocaleString()}</Text>
          <Text style={styles.clipStat}>⬇ {(item.download_count ?? 0).toLocaleString()}</Text>
          {item.duration_seconds != null && (
            <Text style={styles.clipStat}>⏱ {item.duration_seconds}s</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const GRID_ITEM_SIZE = (SCREEN_WIDTH - 32 - 8) / 2; // 16px padding each side, 8px gap

  const renderGridCard = ({ item }: { item: Clip }) => (
    <TouchableOpacity
      style={[styles.gridCard, { width: GRID_ITEM_SIZE }]}
      onPress={() => navigation.navigate('VerticalFeed', { initialClip: item, clips })}
      activeOpacity={0.85}
    >
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={[styles.gridThumb, { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE }]} />
      ) : (
        <View style={[styles.gridThumb, styles.thumbPlaceholder, { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE }]}>
          <Ionicons name="musical-notes-outline" size={28} color="#333" />
        </View>
      )}
      <View style={styles.gridInfo}>
        <Text style={styles.gridArtist} numberOfLines={1}>{item.artist}</Text>
        <Text style={styles.gridFestival} numberOfLines={1}>{item.festival_name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.artistAvatar}>
            <Text style={styles.avatarEmoji}>🎤</Text>
          </View>
          <Text style={styles.artistName}>{artist}</Text>
          {!loading && (
            <Text style={styles.clipCount}>
              {clips.length} clip{clips.length !== 1 ? 's' : ''} on Handsup
            </Text>
          )}

          {/* Follow button */}
          {!loading && uploaderUserId && (
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followBtnActive]}
              onPress={handleFollowToggle}
              disabled={followLoading}
              activeOpacity={0.8}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={following ? '#fff' : '#8B5CF6'} />
              ) : (
                <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Verified artist claim info */}
          {artistClaim && (
            <View style={styles.claimSection}>
              <View style={styles.verifiedArtistBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#8B5CF6" />
                <Text style={styles.verifiedArtistText}>Verified Artist</Text>
              </View>
              {artistClaim.bio ? <Text style={styles.artistBio}>{artistClaim.bio}</Text> : null}
              <View style={styles.socialLinks}>
                {artistClaim.instagram_url && (
                  <TouchableOpacity onPress={() => Linking.openURL(artistClaim.instagram_url!)} style={styles.socialBtn}>
                    <Ionicons name="logo-instagram" size={20} color="#E1306C" />
                  </TouchableOpacity>
                )}
                {artistClaim.spotify_url && (
                  <TouchableOpacity onPress={() => Linking.openURL(artistClaim.spotify_url!)} style={styles.socialBtn}>
                    <Ionicons name="musical-notes" size={20} color="#1DB954" />
                  </TouchableOpacity>
                )}
                {artistClaim.soundcloud_url && (
                  <TouchableOpacity onPress={() => Linking.openURL(artistClaim.soundcloud_url!)} style={styles.socialBtn}>
                    <Ionicons name="cloud-outline" size={20} color="#FF5500" />
                  </TouchableOpacity>
                )}
                {artistClaim.website_url && (
                  <TouchableOpacity onPress={() => Linking.openURL(artistClaim.website_url!)} style={styles.socialBtn}>
                    <Ionicons name="globe-outline" size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Claim this profile button */}
          {!artistClaim && !myClaim && (
            <TouchableOpacity
              style={styles.claimBtn}
              onPress={() => {
                Alert.alert(
                  `Claim ${artist}’s Profile`,
                  'How would you like to proceed?',
                  [
                    {
                      text: 'Submit Claim Request',
                      onPress: () => navigation.navigate('ArtistClaim', { artistName: artist }),
                    },
                    {
                      text: 'Email Us',
                      onPress: () => {
                        const subject = encodeURIComponent(`Artist Profile Claim: ${artist}`);
                        const body = encodeURIComponent(`Hi, I am ${artist} and would like to claim my profile on Handsup.`);
                        Linking.openURL(`mailto:hello@handsuplive.com?subject=${subject}&body=${body}`);
                      },
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color="#8B5CF6" />
              <Text style={styles.claimBtnText}>Are you {artist}? Claim this profile</Text>
            </TouchableOpacity>
          )}

          {/* Pending claim banner */}
          {myClaim && myClaim.status === 'pending' && (
            <View style={styles.pendingClaimBanner}>
              <Ionicons name="time-outline" size={14} color="#FBBF24" />
              <Text style={styles.pendingClaimText}>Claim pending review</Text>
            </View>
          )}

          {/* Notify on new clips toggle — only visible when following */}
          {!loading && uploaderUserId && following && (
            <View style={styles.notifyRow}>
              <Text style={styles.notifyLabel}>🔔 Notify on new clips</Text>
              <Switch
                value={notifyEnabled}
                onValueChange={handleNotifyToggle}
                trackColor={{ false: '#333', true: '#8B5CF6' }}
                thumbColor={notifyEnabled ? '#fff' : '#888'}
              />
            </View>
          )}

          {/* Stats row */}
          {!loading && clips.length > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{clips.length.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Clips</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{totalDownloads.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Downloads</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{festivals.length}</Text>
                <Text style={styles.statLabel}>Festival{festivals.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Festivals strip */}
        {!loading && festivals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seen at</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.festivalChips}
            >
              {festivals.map((f) => (
                <View key={f} style={styles.chip}>
                  <Text style={styles.chipText}>{f}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 🎪 Playing at — upcoming festival appearances */}
        {upcomingGigs.length > 0 && (
          <View style={styles.gigsSection}>
            <Text style={styles.gigsSectionTitle}>🎪 Playing at</Text>
            {upcomingGigs.map((gig) => (
              <TouchableOpacity
                key={gig.id}
                style={styles.gigRow}
                onPress={() => navigation.navigate('EventDetail', { event: gig.event })}
                activeOpacity={0.85}
              >
                <View style={styles.gigInfo}>
                  <Text style={styles.gigName}>{gig.event?.name}</Text>
                  <Text style={styles.gigMeta}>
                    {gig.event?.city}{gig.stage ? ` · ${gig.stage}` : ''}{gig.day_label ? ` · ${gig.day_label}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#333" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBarBtn, activeTab === 'clips' && styles.tabBarBtnActive]}
            onPress={() => setActiveTab('clips')}
            activeOpacity={0.85}
          >
            <Ionicons name="play-outline" size={16} color={activeTab === 'clips' ? '#8B5CF6' : '#666'} />
            <Text style={[styles.tabBarLabel, activeTab === 'clips' && styles.tabBarLabelActive]}>
              Clips
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBarBtn, activeTab === 'discussion' && styles.tabBarBtnActive]}
            onPress={() => setActiveTab('discussion')}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubbles-outline" size={16} color={activeTab === 'discussion' ? '#8B5CF6' : '#666'} />
            <Text style={[styles.tabBarLabel, activeTab === 'discussion' && styles.tabBarLabelActive]}>
              Discussion
            </Text>
          </TouchableOpacity>
        </View>

        {/* Clips Tab */}
        {activeTab === 'clips' && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                All clips{!loading && clips.length > 0 ? ` (${clips.length})` : ''}
              </Text>
              {!loading && clips.length > 0 && (
                <TouchableOpacity
                  onPress={() => setViewMode((m) => m === 'list' ? 'grid' : 'list')}
                  style={styles.viewToggleBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
                    size={20}
                    color="#8B5CF6"
                  />
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : error ? (
              <View style={styles.empty}>
                <Ionicons name="warning-outline" size={32} color="#555" />
                <Text style={styles.emptyText}>⚠️ {error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadClips}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : clips.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🎤</Text>
                <Text style={styles.emptyText}>No clips of {artist} yet.</Text>
                <Text style={styles.emptySubText}>Been to one of their shows? Upload the first one. 🎤</Text>
                <TouchableOpacity
                  style={styles.addArtistBtn}
                  onPress={() => navigation.navigate('AddArtist', { artistName: artist })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.addArtistBtnText}>➕ Add this artist</Text>
                </TouchableOpacity>
              </View>
            ) : viewMode === 'grid' ? (
              <FlatList
                data={clips}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={styles.gridRow}
                renderItem={renderGridCard}
              />
            ) : (
              clips.map(renderClipCard)
            )}
          </View>
        )}

        {/* Discussion Tab */}
        {activeTab === 'discussion' && (
          <View style={styles.section}>
            {discussionLoading ? (
              <ActivityIndicator color="#8B5CF6" style={{ marginTop: 24 }} />
            ) : discussions.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyText}>No discussions yet. Start the conversation! 💬</Text>
              </View>
            ) : (
              discussions.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <Text style={styles.postUsername}>@{post.username}</Text>
                    <Text style={styles.postTime}>{formatTimeAgo(post.created_at)}</Text>
                  </View>
                  <Text style={styles.postBody}>{post.body}</Text>
                  <TouchableOpacity
                    style={styles.replyToggleBtn}
                    onPress={() => handleToggleReplies(post.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chatbubble-outline" size={13} color="#666" />
                    <Text style={styles.replyToggleText}>
                      {expandedPost === post.id ? 'Hide replies' : 'Reply'}
                    </Text>
                  </TouchableOpacity>
                  {expandedPost === post.id && (
                    <View style={styles.repliesContainer}>
                      {(replies[post.id] ?? []).map((reply) => (
                        <View key={reply.id} style={styles.replyCard}>
                          <Text style={styles.replyUsername}>@{reply.username}</Text>
                          <Text style={styles.replyBody}>{reply.body}</Text>
                        </View>
                      ))}
                      <View style={styles.replyInputRow}>
                        <TextInput
                          style={styles.replyInput}
                          placeholder="Write a reply..."
                          placeholderTextColor="#555"
                          value={replyText[post.id] ?? ''}
                          onChangeText={(t) => setReplyText((prev) => ({ ...prev, [post.id]: t }))}
                          multiline
                        />
                        <TouchableOpacity
                          style={styles.replyPostBtn}
                          onPress={() => handlePostReply(post.id)}
                          disabled={replyPosting[post.id]}
                          activeOpacity={0.85}
                        >
                          {replyPosting[post.id] ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Ionicons name="send" size={16} color="#fff" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))
            )}

            {/* New post input */}
            <View style={styles.newPostRow}>
              <TextInput
                style={styles.newPostInput}
                placeholder="Start a discussion..."
                placeholderTextColor="#555"
                value={newPost}
                onChangeText={setNewPost}
                multiline
              />
              <TouchableOpacity
                style={styles.newPostBtn}
                onPress={handlePostDiscussion}
                disabled={posting}
                activeOpacity={0.85}
              >
                {posting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  hero: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(139,92,246,0.12)',
    top: 0,
  },
  artistAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarEmoji: { fontSize: 40 },
  artistName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  clipCount: { fontSize: 13, color: '#8B5CF6', marginTop: 4, fontWeight: '600' },
  followBtn: {
    marginTop: 14,
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    minWidth: 100,
    alignItems: 'center',
  },
  followBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  followBtnTextActive: {
    color: '#fff',
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
    width: '100%',
  },
  notifyLabel: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  claimSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#8B5CF633',
    padding: 14,
  },
  verifiedArtistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1a1228',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#8B5CF655',
  },
  verifiedArtistText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  artistBio: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 19,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  socialBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#8B5CF644',
    backgroundColor: '#1a1228',
  },
  claimBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  pendingClaimBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1a1500',
    borderWidth: 1,
    borderColor: '#FBBF2433',
  },
  pendingClaimText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FBBF24',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: '#555', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#2a2a2a' },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  viewToggleBtn: {
    padding: 6,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  gridRow: {
    gap: 8,
    marginBottom: 8,
  },
  gridCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 0,
  },
  gridThumb: {
    backgroundColor: '#1a1a1a',
  },
  gridInfo: {
    padding: 8,
  },
  gridArtist: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  gridFestival: {
    fontSize: 11,
    color: '#8B5CF6',
    marginTop: 2,
  },
  gigsSection: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#111', borderRadius: 14,
    borderWidth: 1, borderColor: '#1e1e1e',
    overflow: 'hidden',
  },
  gigsSectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#8B5CF6',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
    letterSpacing: 0.5,
  },
  gigRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#1a1a1a',
  },
  gigInfo: { flex: 1 },
  gigName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  gigMeta: { fontSize: 12, color: '#555', marginTop: 2 },
  festivalChips: { gap: 8, paddingBottom: 4 },
  chip: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipText: { color: '#A78BFA', fontSize: 13, fontWeight: '600' },
  clipCard: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 10,
  },
  thumb: { width: 110, height: 82, backgroundColor: '#1a1a1a' },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipInfo: { flex: 1, padding: 12 },
  clipFestival: { fontSize: 13, fontWeight: '700', color: '#8B5CF6' },
  clipMeta: { fontSize: 11, color: '#555', marginTop: 2 },
  clipDesc: { fontSize: 12, color: '#888', marginTop: 4, lineHeight: 17 },
  clipStats: { flexDirection: 'row', gap: 10, marginTop: 6 },
  clipStat: { fontSize: 11, color: '#444' },
  empty: { padding: 36, alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyText: { color: '#555', fontSize: 15, textAlign: 'center', fontWeight: '600' },
  emptySubText: { color: '#444', fontSize: 13, textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  retryText: { color: '#8B5CF6', fontWeight: '700' },
  addArtistBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  addArtistBtnText: { color: '#8B5CF6', fontWeight: '700', fontSize: 14 },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
  },
  tabBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
  },
  tabBarBtnActive: {
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  tabBarLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  tabBarLabelActive: {
    color: '#8B5CF6',
  },
  // Discussion
  postCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    padding: 14,
    marginBottom: 10,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  postUsername: { color: '#8B5CF6', fontWeight: '700', fontSize: 13 },
  postTime: { color: '#444', fontSize: 11 },
  postBody: { color: '#ddd', fontSize: 14, lineHeight: 20 },
  replyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  replyToggleText: { color: '#666', fontSize: 12 },
  repliesContainer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#222' },
  replyCard: {
    backgroundColor: '#161616',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  replyUsername: { color: '#8B5CF6', fontWeight: '600', fontSize: 12, marginBottom: 3 },
  replyBody: { color: '#bbb', fontSize: 13 },
  replyInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'flex-end',
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 80,
  },
  replyPostBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPostRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    alignItems: 'flex-end',
  },
  newPostInput: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    maxHeight: 100,
  },
  newPostBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

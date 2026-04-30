import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActionSheetIOS,
  Platform,
  Modal,
  Share,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LazyImage } from '../components/LazyImage';
import { useFocusEffect } from '@react-navigation/native';
import { Clip } from '../types';
import { getRecentClips, getTrendingClips, getFollowingClips, recordDownload, getForYouFeed, getThisTimeLastYearClips, getFeaturedFestivalClips, trackView } from '../services/clips';
import { getUpcomingEventsByCity, getUpcomingEvents } from '../services/events';
import { getRepostFeed, RepostFeedItem } from '../services/repostsService';
import { isOnline, subscribeToNetwork, cacheHomeFeed, getCachedHomeFeed } from '../services/network';
import OfflineBanner from '../components/OfflineBanner';
import { SkeletonCard, SkeletonTrendCard } from '../components/SkeletonCard';
import { SwipeableClipCard } from '../components/SwipeableClipCard';
import { useSavedClips } from '../hooks/useSavedClips';
import * as Haptics from 'expo-haptics';
import { supabase } from '../services/supabase';
import { getCached, setCache } from '../utils/cache';
import { getMutedUserIds } from '../services/mutedUsers';

const FEED_CACHE_KEY = 'handsup_feed_cache';
const EVENTS_CACHE_KEY = 'handsup_events_cache';
const EVENTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface FeedCache {
  recent: Clip[];
  trending: Clip[];
}

const PAGE_SIZE = 10;

type FeedTab = 'forYou' | 'following';

export default function HomeScreen({ navigation }: any) {
  const { isSaved, toggleSave } = useSavedClips();
  const [feedTab, setFeedTab] = useState<FeedTab>('forYou');
  const [trending, setTrending] = useState<Clip[]>([]);
  const [recent, setRecent] = useState<Clip[]>([]);
  const [followingClips, setFollowingClips] = useState<Clip[]>([]);
  const [forYouClips, setForYouClips] = useState<Clip[]>([]);
  const [forYouLoading, setForYouLoading] = useState(false);
  const [currentEvents, setCurrentEvents] = useState<any[]>([]);
  const [happeningNowClips, setHappeningNowClips] = useState<Clip[]>([]);
  const [happeningLoading, setHappeningLoading] = useState(true);
  const [repostClips, setRepostClips] = useState<Array<Clip & { reposted_by?: string; reposted_at?: string }>>([]);
  const [lastYearClips, setLastYearClips] = useState<Clip[]>([]);
  const [featuredFestival, setFeaturedFestival] = useState<{ festivalName: string; clips: Clip[] } | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  // Raw (unfiltered) clips kept so we can re-filter without a network request
  const rawRecentRef = useRef<Clip[]>([]);
  const rawFollowingRef = useRef<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [newClipsAvailable, setNewClipsAvailable] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [contextClip, setContextClip] = useState<Clip | null>(null);
  const forYouScale = useRef(new Animated.Value(1)).current;
  const followingScale = useRef(new Animated.Value(1)).current;
  // Pulsing green dot for "HAPPENING NOW"
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Track visible clip for auto-play
  const [visibleClipId, setVisibleClipId] = useState<string | null>(null);
  const [loadingMoreForYou, setLoadingMoreForYou] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    // Load cache immediately for instant display
    getCached<FeedCache>(FEED_CACHE_KEY).then((cached) => {
      if (cached) {
        setRecent(cached.recent);
        setTrending(cached.trending);
        setLoading(false);
      }
    });
    loadData();

    // Check initial network state then subscribe to changes
    isOnline().then((online) => setIsOffline(!online));
    const unsubscribeNetwork = subscribeToNetwork((online) => setIsOffline(!online));
    return () => unsubscribeNetwork();
  }, []);

  // Re-filter feeds when the screen comes back into focus (e.g. after muting someone)
  useFocusEffect(
    useCallback(() => {
      if (rawRecentRef.current.length === 0) return; // skip on first mount (loadData handles it)
      getMutedUserIds().then((mutedIds) => {
        if (mutedIds.length === 0) {
          setRecent(rawRecentRef.current);
          setFollowingClips(rawFollowingRef.current);
        } else {
          setRecent(rawRecentRef.current.filter((c) => !c.uploader_id || !mutedIds.includes(c.uploader_id)));
          setFollowingClips(rawFollowingRef.current.filter((c) => !c.uploader_id || !mutedIds.includes(c.uploader_id)));
        }
      });
    }, [])
  );

  // ── Supabase Realtime subscription ──────────────────────
  useEffect(() => {
    const subscription = supabase
      .channel('clips-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'clips' },
        (payload) => {
          if ((payload.new as Clip).is_approved) {
            setRecent((prev) => [payload.new as Clip, ...prev]);
            setNewClipsAvailable(true);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    await loadData();
    setRefreshing(false);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Get current user for repost feed (non-blocking if unauthenticated)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setForYouLoading(true);
      setHappeningLoading(true);

      // Check cache for events first
      const cachedEvents = await getCached<{clips: Clip[], ts: number}>(EVENTS_CACHE_KEY);
      if (cachedEvents && Date.now() - cachedEvents.ts < EVENTS_CACHE_TTL) {
        setHappeningNowClips(cachedEvents.clips);
        setHappeningLoading(false);
      } else {
        // Query for currently happening events
        const now = new Date().toISOString();
        const { data: liveEvents } = await supabase
          .from('events')
          .select('id, name, festival_name, start_date, end_date')
          .lte('start_date', now)
          .gte('end_date', now)
          .limit(10);
        
        setCurrentEvents(liveEvents ?? []);
        
        // If events exist, get clips for those festivals
        let liveClips: Clip[] = [];
        if (liveEvents && liveEvents.length > 0) {
          const festNames = liveEvents.map(e => e.festival_name).filter(Boolean);
          if (festNames.length > 0) {
            const { data: liveClipsData } = await supabase
              .from('clips')
              .select('*, uploader:profiles!uploader_id(username, is_verified)')
              .eq('is_approved', true)
              .in('festival_name', festNames)
              .order('created_at', { ascending: false })
              .limit(5);
            liveClips = liveClipsData ?? [];
          }
        }
        setHappeningNowClips(liveClips);
        setHappeningLoading(false);
        // Cache the result
        setCache(EVENTS_CACHE_KEY, { clips: liveClips, ts: Date.now() });
      }
      
      const [trendingData, recentData, followingData, mutedIds, repostData, forYouData] = await Promise.all([
        getTrendingClips(3),
        getRecentClips(PAGE_SIZE, 0),
        getFollowingClips(20),
        getMutedUserIds(),
        currentUser ? getRepostFeed(currentUser.id).catch(() => [] as RepostFeedItem[]) : Promise.resolve([] as RepostFeedItem[]),
        getForYouFeed(20).catch(() => [] as Clip[]),
      ]);
      // Store raw data in refs so useFocusEffect can re-filter without a network hit
      rawRecentRef.current = recentData;
      rawFollowingRef.current = followingData;
      // Filter out clips from muted users
      const filteredRecent = mutedIds.length > 0
        ? recentData.filter((c: Clip) => !c.uploader_id || !mutedIds.includes(c.uploader_id))
        : recentData;
      const filteredFollowing = mutedIds.length > 0
        ? followingData.filter((c: Clip) => !c.uploader_id || !mutedIds.includes(c.uploader_id))
        : followingData;
      setTrending(trendingData);
      setRecent(filteredRecent);
      setFollowingClips(filteredFollowing);
      setForYouClips(forYouData);
      setForYouLoading(false);

      // Load featured festival for empty For You feed state (non-blocking)
      getFeaturedFestivalClips().then(setFeaturedFestival).catch(() => {});

      // Load "This Time Last Year" clips (non-blocking)
      getThisTimeLastYearClips(5).then(setLastYearClips).catch(() => {});

      // Load upcoming events — try user's city first, fall back to global
      (async () => {
        let events: any[] = [];
        if (currentUser) {
          const { data: profile } = await supabase.from('profiles').select('home_city').eq('id', currentUser.id).single();
          if (profile?.home_city) {
            events = await getUpcomingEventsByCity(profile.home_city, 5).catch(() => []);
          }
        }
        if (events.length === 0) {
          events = await getUpcomingEvents(5).catch(() => []);
        }
        setUpcomingEvents(events);
      })();
      // repostData is RepostFeedItem[] from getRepostFeed
      const repostItems = repostData as RepostFeedItem[];
      const filteredReposts = mutedIds.length > 0
        ? repostItems.filter((item) => !item.clip.uploader_id || !mutedIds.includes(item.clip.uploader_id))
        : repostItems;
      setRepostClips(filteredReposts.map((item) => ({
        ...item.clip,
        reposted_by: item.reposter.username,
        reposted_at: item.reposted_at,
      })));
      setPage(0);
      setHasMore(recentData.length === PAGE_SIZE);
      // Persist fresh data to both caches
      setCache<FeedCache>(FEED_CACHE_KEY, { recent: filteredRecent, trending: trendingData });
      cacheHomeFeed(filteredRecent);
      setIsOffline(false);
    } catch (err: any) {
      // Try offline cache before showing error
      const cachedClips = await getCachedHomeFeed();
      if (cachedClips && cachedClips.length > 0) {
        setRecent(cachedClips);
        setIsOffline(true);
      } else {
        setError(err?.message ?? 'Failed to load clips');
      }
    } finally {
      setLoading(false);
      setForYouLoading(false);
    }
  };

  const loadMoreRecent = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const newClips = await getRecentClips(PAGE_SIZE, nextPage * PAGE_SIZE);
      setRecent((prev) => [...prev, ...newClips]);
      setPage(nextPage);
      setHasMore(newClips.length === PAGE_SIZE);
    } catch {
      // silently ignore pagination errors
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    if (distanceFromBottom < 200 && !loadingMore && hasMore && feedTab === 'forYou') {
      loadMoreRecent();
    }
  };

  const switchTab = (tab: FeedTab) => {
    Haptics.selectionAsync();
    setFeedTab(tab);
    const targetScale = tab === 'forYou' ? forYouScale : followingScale;
    const otherScale = tab === 'forYou' ? followingScale : forYouScale;
    Animated.spring(targetScale, {
      toValue: 1.08,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start(() =>
      Animated.spring(targetScale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }).start()
    );
    Animated.spring(otherScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
  };

  const goToVideo = useCallback((video: Clip) =>
    navigation.navigate('VerticalFeed', {
      initialClip: video,
      // Don't pass clips: let VerticalFeedScreen fetch its own paginated list
    }), [navigation]);
  const goToArtist = useCallback((artist: string) =>
    navigation.navigate('Artist', { artist }), [navigation]);

  const handleLongPress = (video: Clip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const options = ['Watch', 'Save', 'Share', 'Go to Artist', 'Go to Event', 'Report', 'Cancel'];

    const runAction = async (index: number) => {
      switch (index) {
        case 0: goToVideo(video); break;
        case 1:
          await recordDownload(video.id).catch(() => {});
          break;
        case 2:
          Share.share({ message: `${video.artist} at ${video.festival_name}`, url: video.video_url }).catch(() => {});
          break;
        case 3: goToArtist(video.artist); break;
        case 4:
          if (video.event_id) {
            navigation.navigate('EventDetail', { event: { id: video.event_id, name: video.festival_name } });
          }
          break;
        case 5: navigation.navigate('Report', { clipId: video.id, artist: video.artist }); break;
        default: break;
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: options.length - 2 },
        runAction
      );
    } else {
      setContextClip(video);
    }
  };

  const handleAndroidContextAction = async (index: number) => {
    if (!contextClip) return;
    setContextClip(null);
    await (async () => {
      switch (index) {
        case 0: goToVideo(contextClip); break;
        case 1: await recordDownload(contextClip.id).catch(() => {}); break;
        case 2:
          Share.share({ message: `${contextClip.artist} at ${contextClip.festival_name}`, url: contextClip.video_url }).catch(() => {});
          break;
        case 3: goToArtist(contextClip.artist); break;
        case 4:
          if (contextClip.event_id) {
            navigation.navigate('EventDetail', { event: { id: contextClip.event_id, name: contextClip.festival_name } });
          }
          break;
        case 5: navigation.navigate('Report', { clipId: contextClip.id, artist: contextClip.artist }); break;
        default: break;
      }
    })();
  };

  const renderFeedPills = () => (
    <View style={styles.pillRow}>
      <Animated.View style={{ transform: [{ scale: forYouScale }] }}>
        <TouchableOpacity
          style={[styles.pill, feedTab === 'forYou' && styles.pillActive]}
          onPress={() => switchTab('forYou')}
        >
          <Text style={[styles.pillText, feedTab === 'forYou' && styles.pillTextActive]}>
            For You
          </Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: followingScale }] }}>
        <TouchableOpacity
          style={[styles.pill, feedTab === 'following' && styles.pillActive]}
          onPress={() => switchTab('following')}
        >
          <Text style={[styles.pillText, feedTab === 'following' && styles.pillTextActive]}>
            Following
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderClipCard = (video: Clip & { reposted_by?: string }, keyPrefix = '', index = 0, isActive = false) => (
    <View key={`${keyPrefix}${video.id}`}>
      {video.reposted_by && (
        <View style={styles.repostHeader}>
          <Ionicons name="repeat" size={13} color="#10B981" />
          <Text style={styles.repostHeaderText}>@{video.reposted_by} reposted</Text>
        </View>
      )}
      <SwipeableClipCard
        video={video}
        isSaved={isSaved(video.id)}
        onToggleSave={toggleSave}
        onPress={() => goToVideo(video)}
        onArtistPress={() => goToArtist(video.artist)}
        onLongPress={() => handleLongPress(video)}
        isActive={isActive}
      />
    </View>
  );

  // Load more For You clips when scrolling near the end
  const loadMoreForYouClips = useCallback(async () => {
    if (loadingMoreForYou || forYouLoading) return;
    try {
      setLoadingMoreForYou(true);
      const offset = forYouClips.length;
      const more = await getRecentClips(20, offset);
      setForYouClips(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const newClips = more.filter(c => !existingIds.has(c.id));
        return [...prev, ...newClips];
      });
    } catch {
      // silent fail
    } finally {
      setLoadingMoreForYou(false);
    }
  }, [forYouClips.length, loadingMoreForYou, forYouLoading]);

  // Track clip visibility for auto-play
  const handleClipScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const scrollY = contentOffset.y;
    const viewHeight = layoutMeasurement.height;
    
    // Calculate card height based on portrait aspect ratio (9:16)
    const cardHeight = screenWidth * (16 / 9) + 80; // thumbnail + info row
    
    // Simple heuristic: consider the clip at the center of the screen as "visible"
    const centerY = scrollY + viewHeight / 2;
    const estimatedIndex = Math.floor(centerY / cardHeight);
    
    // Determine which clip array to check based on active tab
    const currentClips = feedTab === 'forYou' ? forYouClips : followingClips;
    const activeClip = currentClips[estimatedIndex];
    
    if (activeClip && activeClip.id !== visibleClipId) {
      setVisibleClipId(activeClip.id);
      // Track view when clip scrolls into view
      trackView(activeClip.id).catch(() => {});
    }
    
    // Infinite scroll: load more when approaching the end (For You tab only)
    if (feedTab === 'forYou') {
      const distanceFromEnd = contentSize.height - scrollY - viewHeight;
      if (distanceFromEnd < viewHeight * 1.5 && !loadingMoreForYou) {
        loadMoreForYouClips();
      }
    }
  };

  if (loading && recent.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <Image source={require('../../assets/logo-full.jpeg')} style={styles.logoImage} resizeMode="contain" />
              
            </View>
            <Text style={styles.tagline}>feel it now. find it later.</Text>
          </View>
          <View style={styles.pillRowWrapper}>{renderFeedPills()}</View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="trending-up" size={18} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Trending this week</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingList}
              scrollEnabled={false}
            >
              <SkeletonTrendCard />
            </ScrollView>
          </View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>JUST UPLOADED</Text>
            </View>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    setNewClipsAvailable(false);
  };

  const CONTEXT_OPTIONS = ['Watch', 'Save', 'Share', 'Go to Artist', 'Go to Event', 'Report'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Offline banner — slides in from top when no network */}
      <OfflineBanner visible={isOffline} />

      {/* Android long-press context modal */}
      <Modal
        visible={contextClip !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setContextClip(null)}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setContextClip(null)}>
          <View style={styles.contextMenu}>
            <Text style={styles.contextTitle} numberOfLines={1}>
              {contextClip?.artist}
            </Text>
            {CONTEXT_OPTIONS.map((option, idx) => (
              <TouchableOpacity
                key={option}
                style={[styles.contextOption, idx === CONTEXT_OPTIONS.length - 1 && styles.contextOptionDestructive]}
                onPress={() => handleAndroidContextAction(idx)}
              >
                <Text style={[styles.contextOptionText, idx === CONTEXT_OPTIONS.length - 1 && styles.contextOptionTextDestructive]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.contextCancel} onPress={() => setContextClip(null)}>
              <Text style={styles.contextCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* New clips banner */}
      {newClipsAvailable && (
        <TouchableOpacity
          style={styles.newClipsBanner}
          onPress={scrollToTop}
          activeOpacity={0.85}
        >
          <Text style={styles.newClipsBannerText}>✨ New clips available ↑</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={200}
        onScroll={(e) => {
          handleScroll(e);
          handleClipScroll(e);
        }}
        contentContainerStyle={styles.scrollContent}
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
          <View style={styles.logoRow}>
            <Image source={require('../../assets/logo-full.jpeg')} style={styles.logoImage} resizeMode="contain" />
            
          </View>
          <Text style={styles.tagline}>Find the best clips from the set</Text>
        </View>

        {/* Feed toggle pills */}
        <View style={styles.pillRowWrapper}>{renderFeedPills()}</View>

        {/* Activity stats bar — only shown when clips exist */}
        {(() => {
          const now = Date.now();
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const allClips = rawRecentRef.current.length > 0 ? rawRecentRef.current : recent;
          const uploadsToday = allClips.filter((c) => {
            const t = c.created_at ? new Date(c.created_at).getTime() : 0;
            return t > oneDayAgo;
          }).length;
          const downloadsToday = allClips
            .filter((c) => {
              const t = c.created_at ? new Date(c.created_at).getTime() : 0;
              return t >= todayStart.getTime();
            })
            .reduce((sum, c) => sum + (c.download_count ?? 0), 0);
          const clipsThisWeek = allClips.filter((c) => {
            const t = c.created_at ? new Date(c.created_at).getTime() : 0;
            return t > oneWeekAgo;
          }).length;

          if (uploadsToday === 0 && clipsThisWeek === 0) return null;

          return (
            <View style={styles.activityStatsBar}>
              <View style={styles.activityStatPill}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="cloud-upload-outline" size={14} color="#8B5CF6" />
                  <Text style={styles.activityStatText}><Text style={styles.activityStatNumber}>{uploadsToday}</Text> uploads today</Text>
                </View>
              </View>
              <View style={styles.activityStatPill}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="eye-outline" size={14} color="#8B5CF6" />
                  <Text style={styles.activityStatText}><Text style={styles.activityStatNumber}>{downloadsToday}</Text> views today</Text>
                </View>
              </View>
              <View style={styles.activityStatPill}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="trending-up-outline" size={14} color="#8B5CF6" />
                  <Text style={styles.activityStatText}><Text style={styles.activityStatNumber}>{clipsThisWeek}</Text> clips this week</Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* Watch Feed banner */}
        <TouchableOpacity
          style={styles.watchFeedBannerWrapper}
          onPress={() => navigation.navigate('VerticalFeed')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#1a0a2e', '#0D0D0D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.watchFeedBanner}
          >
            <View style={styles.watchFeedLeftBorder} />
            <Ionicons name="radio-outline" size={14} color="#8B5CF6" />
            <Text style={styles.watchFeedText}>Best clips from recent sets</Text>
            <Text style={styles.watchFeedArrow}>›</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Trending banner */}
        <TouchableOpacity
          style={styles.trendingBanner}
          onPress={() => navigation.navigate('Trending')}
          activeOpacity={0.85}
        >
          <Ionicons name="flame-outline" size={18} color="#8B5CF6" />
          <Text style={styles.watchFeedText}>Trending</Text>
          <Text style={styles.watchFeedArrow}>›</Text>
        </TouchableOpacity>

        {/* HAPPENING NOW — show loading state or clips */}
        {(happeningLoading || happeningNowClips.length > 0) && (() => {
          if (happeningLoading && happeningNowClips.length === 0) {
            return (
              <View style={styles.happeningNowSection}>
                <View style={styles.happeningNowTitleRow}>
                  <Animated.View style={[styles.happeningDot, { opacity: pulseAnim }]} />
                  <Text style={styles.happeningNowTitle}>HAPPENING NOW</Text>
                </View>
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                </View>
              </View>
            );
          }
          if (happeningNowClips.length === 0) return null;
          const happeningClips = happeningNowClips.slice(0, 3);
          // Aggregate clip counts by festival
          const festivalCounts: Record<string, number> = {};
          recent.forEach((c) => {
            if (c.festival_name) {
              festivalCounts[c.festival_name] = (festivalCounts[c.festival_name] ?? 0) + 1;
            }
          });
          const festivalSummary = Object.entries(festivalCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => `🎪 ${name} — ${count} clip${count !== 1 ? 's' : ''}`)
            .join('  ·  ');
          return (
            <View style={styles.happeningNowSection}>
              {/* Title row with pulsing dot */}
              <View style={styles.happeningNowTitleRow}>
                <Animated.View style={[styles.happeningDot, { opacity: pulseAnim }]} />
                <Text style={styles.happeningNowTitle}>HAPPENING NOW</Text>
              </View>
              {festivalSummary.length > 0 && (
                <Text style={styles.happeningActivitySummary} numberOfLines={2}>
                  {festivalSummary}
                </Text>
              )}
              {happeningClips.map((video) => (
                <TouchableOpacity
                  key={video.id}
                  style={styles.happeningCard}
                  onPress={() => goToVideo(video)}
                  activeOpacity={0.85}
                >
                  <View style={styles.happeningThumbWrap}>
                    {video.thumbnail_url ? (
                      <LazyImage uri={video.thumbnail_url} style={styles.happeningThumb} />
                    ) : (
                      <View style={[styles.happeningThumb, styles.happeningThumbPlaceholder]}>
                        <Ionicons name="musical-notes" size={16} color="#333" />
                      </View>
                    )}
                    {/* Festival chip overlay on thumbnail */}
                    {video.festival_name ? (
                      <View style={styles.happeningThumbFestivalChip}>
                        <Text style={styles.happeningThumbFestivalText} numberOfLines={1}>{video.festival_name}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.happeningInfo}>
                    <Text style={styles.happeningArtist} numberOfLines={1}>{video.artist}</Text>
                    <Text style={styles.happeningMeta}>{video.location}</Text>
                  </View>
                  <Text style={styles.happeningArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })()}

        {/* This Time Last Year */}
        {lastYearClips.length > 0 && (
          <View style={styles.lastYearSection}>
            <Text style={styles.lastYearTitle}>🕰️ This Time Last Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lastYearScroll}>
              {lastYearClips.map((clip) => (
                <TouchableOpacity
                  key={clip.id}
                  style={styles.lastYearCard}
                  onPress={() => navigation.navigate('VideoDetail', { video: clip })}
                  activeOpacity={0.85}
                >
                  {clip.thumbnail_url ? (
                    <Image source={{ uri: clip.thumbnail_url }} style={styles.lastYearThumb} />
                  ) : (
                    <View style={[styles.lastYearThumb, styles.lastYearThumbPlaceholder]}>
                      <Ionicons name="musical-notes-outline" size={20} color="#333" />
                    </View>
                  )}
                  <View style={styles.lastYearCardInfo}>
                    <Text style={styles.lastYearArtist} numberOfLines={1}>{clip.artist}</Text>
                    <Text style={styles.lastYearFestival} numberOfLines={1}>{clip.festival_name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Upcoming Festivals */}
        {upcomingEvents.length > 0 && (
          <View style={styles.upcomingSection}>
            <View style={styles.upcomingTitleRow}>
              <Ionicons name="calendar-outline" size={18} color="#8B5CF6" />
              <Text style={styles.upcomingTitle}>Upcoming Festivals</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingScroll}>
              {upcomingEvents.map((event) => {
                const daysUntil = Math.ceil((new Date(event.start_date).getTime() - Date.now()) / 86400000);
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.upcomingCard}
                    onPress={() => navigation.navigate('EventDetail', { event })}
                    activeOpacity={0.85}
                  >
                    <View style={styles.upcomingDaysBadge}>
                      <Text style={styles.upcomingDaysNum}>{daysUntil}</Text>
                      <Text style={styles.upcomingDaysLabel}>days</Text>
                    </View>
                    <Text style={styles.upcomingEventName} numberOfLines={2}>{event.name}</Text>
                    <Text style={styles.upcomingEventCity} numberOfLines={1}>{event.city}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {feedTab === 'forYou' ? (
          <>
            {/* Trending strip */}
            {trending.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="flame-outline" size={16} color="#8B5CF6" />
                    <Text style={styles.sectionTitle}>Trending this week</Text>
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.trendingList}
                >
                  {trending.map((video) => (
                    <TouchableOpacity
                      key={video.id}
                      style={styles.trendCard}
                      onPress={() => goToVideo(video)}
                    >
                      {video.thumbnail_url ? (
                        <LazyImage uri={video.thumbnail_url} style={styles.trendThumb} />
                      ) : (
                        <View style={[styles.trendThumb, styles.placeholderThumb, styles.thumbnailPlaceholder]}>
                          <Ionicons name="musical-notes" size={28} color="#333" />
                          <Text style={styles.thumbnailPlaceholderText} numberOfLines={1}>
                            {video.artist}
                          </Text>
                        </View>
                      )}
                      <View style={styles.trendOverlay}>
                        <Text style={styles.trendArtist} numberOfLines={1}>{video.artist}</Text>
                        <Text style={styles.trendMeta}>{video.location}</Text>
                        {(video.view_count ?? 0) > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="eye-outline" size={12} color="#8B5CF6" />
                            <Text style={styles.trendDownloads}>{(video.view_count ?? 0).toLocaleString()}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* For You algorithmic feed */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="star-outline" size={16} color="#8B5CF6" />
                  <Text style={styles.sectionTitle}>For You</Text>
                </View>
              </View>
              {forYouLoading ? (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                </View>
              ) : forYouClips.length === 0 ? (
                featuredFestival ? (
                  <View style={styles.featuredSection}>
                    <View style={styles.featuredHeader}>
                      <View style={styles.featuredBadge}>
                        <Text style={styles.featuredBadgeText}>FEATURED</Text>
                      </View>
                      <Text style={styles.featuredTitle}>{featuredFestival.festivalName}</Text>
                      <Text style={styles.featuredSub}>Explore clips from this festival</Text>
                    </View>
                    {featuredFestival.clips.map((clip, idx) => renderClipCard(clip, 'featured-', idx, visibleClipId === clip.id))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>0 clips. You're early. Set the tone</Text>
                )
              ) : (
                <>
                  {forYouClips.map((v, i) => renderClipCard(v, 'foryou-', i, visibleClipId === v.id))}
                  {loadingMoreForYou && (
                    <View style={{ padding: 16, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#8B5CF6" />
                    </View>
                  )}
                </>
              )}
            </View>
          </>
        ) : (
          /* Following feed */
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="people-outline" size={16} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>From people you follow</Text>
              </View>
            </View>
            {followingClips.length === 0 && repostClips.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Follow some creators to see their clips here 🙌
                </Text>
                <TouchableOpacity
                  style={styles.discoverBtn}
                  onPress={() => switchTab('forYou')}
                >
                  <Text style={styles.discoverBtnText}>Discover</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {followingClips.map((v, i) => renderClipCard(v, 'following-', i, visibleClipId === v.id))}
                {repostClips.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>🔁 Reposts</Text>
                    </View>
                    {repostClips.map((v, i) => renderClipCard(v, 'repost-', i, visibleClipId === v.id))}
                  </>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingBottom: 100 },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#EF4444', fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  retryText: { color: '#8B5CF6', fontWeight: '700' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoImage: { width: 160, height: 48, borderRadius: 0 },
  logo: { fontSize: 26, fontWeight: '800', color: '#fff' },
  tagline: { fontSize: 13, color: '#8B5CF6', marginTop: 2, letterSpacing: 0.5 },
  pillRowWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
  },
  pillRow: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 3,
    alignSelf: 'flex-start',
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 21,
  },
  pillActive: {
    backgroundColor: '#8B5CF6',
  },
  pillText: { fontSize: 13, fontWeight: '700', color: '#555' },
  pillTextActive: { color: '#fff' },
  section: { marginTop: 24 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 14 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  trendingList: { paddingHorizontal: 16, gap: 12 },
  trendCard: {
    width: 200,
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#161616',
  },
  trendThumb: { width: '100%', height: '100%' },
  placeholderThumb: { backgroundColor: '#2a2a2a' },
  trendOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  trendArtist: { color: '#fff', fontWeight: '700', fontSize: 14 },
  trendMeta: { color: '#aaa', fontSize: 11, marginTop: 1 },
  trendDownloads: { color: '#8B5CF6', fontSize: 11, marginTop: 3, fontWeight: '600' },
  card: {
    backgroundColor: '#161616',
    overflow: 'hidden',
    marginBottom: 20,
  },
  thumbnailContainer: { position: 'relative' },
  thumbnail: { width: '100%', aspectRatio: 9/16, backgroundColor: '#161616' },
  durationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 14 },
  artist: { fontSize: 18, fontWeight: '700', color: '#fff' },
  festival: { fontSize: 14, color: '#8B5CF6', marginTop: 2, fontWeight: '600' },
  uploaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  uploader: { fontSize: 12, color: '#666' },
  verifiedBadge: { fontSize: 11, color: '#8B5CF6' },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  description: { fontSize: 13, color: '#aaa', marginTop: 8, lineHeight: 18 },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  statText: { fontSize: 12, color: '#555' },
  // (legacy — stats now live in SwipeableClipCard's statsBar)
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  emptyText: { color: '#555', fontSize: 14, textAlign: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
  emptyStateText: { color: '#555', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverBtn: {
    marginTop: 20,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  discoverBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  newClipsBanner: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 99,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  newClipsBannerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // Context menu (Android)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  contextMenu: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#222',
  },
  contextTitle: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  contextOption: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  contextOptionDestructive: { borderBottomColor: 'transparent' },
  contextOptionText: { fontSize: 16, color: '#fff', fontWeight: '500' },
  contextOptionTextDestructive: { color: '#EF4444' },
  contextCancel: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  contextCancelText: { fontSize: 16, color: '#555', fontWeight: '600', textAlign: 'center' },
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  repostHeaderText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  // Activity stats bar
  activityStatsBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    gap: 6,
  },
  activityStatPill: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  activityStatText: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
  },
  activityStatNumber: {
    color: '#fff',
    fontWeight: '800',
  },

  watchFeedBannerWrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  watchFeedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  watchFeedLeftBorder: {
    width: 3,
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
    marginRight: 6,
  },
  trendingBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1a1228',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  watchFeedIcon: { fontSize: 18, color: '#8B5CF6' },
  watchFeedText: { flex: 1, color: '#8B5CF6', fontWeight: '700', fontSize: 15 },
  watchFeedArrow: { color: '#8B5CF6', fontSize: 22, fontWeight: '300' },

  // Happening now
  happeningNowSection: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    overflow: 'hidden',
  },
  happeningNowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 8,
  },
  happeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  happeningNowTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  happeningActivitySummary: {
    fontSize: 11,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 10,
    lineHeight: 16,
  },
  happeningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#161616',
    gap: 12,
  },
  happeningThumbWrap: {
    width: 56,
    height: 46,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  happeningThumb: {
    width: '100%',
    height: '100%',
  },
  happeningThumbPlaceholder: {
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholder: {
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  thumbnailPlaceholderText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  happeningThumbFestivalChip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(139,92,246,0.85)',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  happeningThumbFestivalText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  happeningInfo: {
    flex: 1,
    gap: 3,
  },
  happeningArtist: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  happeningMeta: {
    fontSize: 11,
    color: '#555',
  },
  happeningArrow: {
    color: '#333',
    fontSize: 20,
    fontWeight: '300',
  },

  // This Time Last Year
  lastYearSection: { marginBottom: 24 },
  lastYearTitle: {
    fontSize: 16, fontWeight: '800', color: '#fff',
    paddingHorizontal: 16, marginBottom: 12, letterSpacing: -0.3,
  },
  lastYearScroll: { paddingHorizontal: 16, gap: 10 },
  lastYearCard: {
    width: 150,
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  lastYearThumb: { width: '100%', height: 100, backgroundColor: '#1a1a1a' },
  lastYearThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  lastYearCardInfo: { padding: 10 },
  lastYearArtist: { fontSize: 13, fontWeight: '700', color: '#fff' },
  lastYearFestival: { fontSize: 11, color: '#8B5CF6', marginTop: 2 },

  // Featured Festival empty state
  featuredSection: { paddingBottom: 40 },
  featuredHeader: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  featuredBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  featuredSub: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },

  // Upcoming Festivals
  upcomingSection: { marginBottom: 24 },
  upcomingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  upcomingTitle: {
    fontSize: 16, fontWeight: '800', color: '#fff',
    letterSpacing: -0.3,
  },
  upcomingScroll: { paddingHorizontal: 16, gap: 10 },
  upcomingCard: {
    width: 140,
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 14,
    gap: 8,
  },
  upcomingDaysBadge: {
    backgroundColor: '#1a1228',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF633',
    alignSelf: 'flex-start',
  },
  upcomingDaysNum: { fontSize: 22, fontWeight: '800', color: '#8B5CF6' },
  upcomingDaysLabel: { fontSize: 10, color: '#8B5CF6', fontWeight: '600' },
  upcomingEventName: { fontSize: 13, fontWeight: '700', color: '#fff', lineHeight: 18 },
  upcomingEventCity: { fontSize: 11, color: '#555' },
});

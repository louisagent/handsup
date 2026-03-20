import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
  Linking,
  Share,
  Image,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp } from '@react-navigation/native';
import { Clip } from '../types';
import { trackView, recordDownload, getClipsByEvent, searchClips, likeClip, unlikeClip, hasLiked, getLikeCount, getReactions, addReaction, removeReaction, getMyReactions } from '../services/clips';
import { scheduleLocalNotification } from '../services/notifications';
import { Clip as ClipType } from '../types';
import { trackEvent } from '../services/analytics';
import {
  getMyCollections,
  createCollection,
  addClipToCollection,
  Collection,
} from '../services/collections';
import { useSavedClips } from '../hooks/useSavedClips';
import { splitByHashtagsAndMentions } from '../utils/tags';
import TrackIdRow from '../components/TrackIdRow';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { supabase } from '../services/supabase';
import { isFollowing, followUser, unfollowUser } from '../services/follows';
import { getComments, postComment, Comment } from '../services/comments';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY_AUTOPLAY, STORAGE_KEY_DATA_SAVER } from './SettingsScreen';
import * as MediaLibrary from 'expo-media-library';
import * as StoreReview from 'expo-store-review';

type VideoDetailRouteParams = {
  VideoDetail: { video: Clip };
};

type Props = {
  route: RouteProp<VideoDetailRouteParams, 'VideoDetail'>;
  navigation: any;
};

// ── Helpers ────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// ── Comment Row ────────────────────────────────────────────

function CommentRow({ comment, currentUserId, onDelete, onMentionPress }: {
  comment: Comment;
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onMentionPress: (username: string) => void;
}) {
  const username = comment.user?.username ?? 'unknown';
  const isVerified = comment.user?.is_verified ?? false;
  const isOwn = currentUserId === comment.user_id;

  const handleLongPress = () => {
    if (!isOwn) return;
    Alert.alert('Delete comment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(comment.id),
      },
    ]);
  };

  // Render comment text with @mentions as purple links
  const renderCommentText = (text: string) => {
    const segments = text.split(/(#[\w]+|@[\w]+)/g).filter(Boolean);
    return (
      <Text style={styles.commentText}>
        {segments.map((seg, i) =>
          seg.startsWith('@') ? (
            <Text
              key={i}
              style={styles.commentMention}
              onPress={() => onMentionPress(seg.slice(1))}
            >
              {seg}
            </Text>
          ) : seg.startsWith('#') ? (
            <Text key={i} style={styles.commentHashtag}>{seg}</Text>
          ) : (
            <Text key={i}>{seg}</Text>
          )
        )}
      </Text>
    );
  };

  return (
    <TouchableOpacity
      style={styles.commentRow}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      {/* Avatar */}
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>{username[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text style={[styles.commentUsername, isVerified && styles.commentUsernameVerified]}>
            @{username}
          </Text>
          {isVerified && (
            <Ionicons name="checkmark-circle" size={12} color="#8B5CF6" style={{ marginLeft: 3 }} />
          )}
          <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
        </View>
        {renderCommentText(comment.text)}
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────

export default function VideoDetailScreen({ route, navigation }: Props) {
  const { video: initialVideo } = route.params;
  const [video, setVideo] = useState<Clip>(initialVideo);
  const videoRef = useRef<Video>(null);
  const { isSaved, toggleSave } = useSavedClips();
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [shouldAutoplay, setShouldAutoplay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const saved = isSaved(video.id);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Reactions state
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<string[]>([]);

  // @mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<{ id: string; username: string }[]>([]);

  // Festival related clips state
  const [festivalClips, setFestivalClips] = useState<ClipType[]>([]);
  const [festivalClipsLoading, setFestivalClipsLoading] = useState(true);

  // View count animation
  const [displayViewCount, setDisplayViewCount] = useState(0);
  const hasAnimatedViews = useRef(false);

  // ── Controls auto-hide ──────────────────────────────────

  const showControls = useCallback(() => {
    setControlsVisible(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Clear existing timer
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    // Auto-hide after 3s
    controlsTimerRef.current = setTimeout(() => {
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setControlsVisible(false));
    }, 3000);
  }, [controlsOpacity]);

  useEffect(() => {
    showControls();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  // Load autoplay preference from AsyncStorage
  useEffect(() => {
    (async () => {
      const [ap, ds] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_AUTOPLAY),
        AsyncStorage.getItem(STORAGE_KEY_DATA_SAVER),
      ]);
      const dataSaver = ds === 'true';
      const autoplay = ap === null ? true : ap === 'true';
      setShouldAutoplay(autoplay && !dataSaver);
    })();
  }, []);

  // Track view on mount + load current user + follow status + like state
  useEffect(() => {
    trackView(video.id).catch(() => {});
    trackEvent('clip_view', { clip_id: video.id, artist: video.artist }).catch(() => {});

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setIsLoggedIn(true);
        if (video.uploader_id && video.uploader_id !== user.id) {
          const result = await isFollowing(video.uploader_id).catch(() => false);
          setFollowing(result);
        }
      }
      // Load like state and count regardless of auth
      const [likedState, count] = await Promise.all([
        hasLiked(video.id).catch(() => false),
        getLikeCount(video.id).catch(() => 0),
      ]);
      setLiked(likedState);
      setLikeCount(count);
    })();
  }, [video.id, video.uploader_id]);

  // Mention autocomplete — search when user types @...
  useEffect(() => {
    if (!mentionQuery || mentionQuery.length < 1) {
      setMentionResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username')
          .ilike('username', `${mentionQuery}%`)
          .limit(5);
        setMentionResults(data ?? []);
      } catch {
        setMentionResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const handleCommentTextChange = (text: string) => {
    setCommentText(text);
    // Check if cursor is after an @ sign
    const atMatch = text.match(/@([\w]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };

  const handleMentionSelect = (username: string) => {
    // Replace the partial @query with @username + space
    const replaced = commentText.replace(/@([\w]*)$/, `@${username} `);
    setCommentText(replaced);
    setMentionQuery(null);
    setMentionResults([]);
  };

  // Load reactions on mount
  const loadReactions = useCallback(async () => {
    try {
      const [reactionCounts, mine] = await Promise.all([
        getReactions(video.id),
        getMyReactions(video.id),
      ]);
      setReactions(reactionCounts);
      setMyReactions(mine);
    } catch {
      // silently fail
    }
  }, [video.id]);

  useEffect(() => { loadReactions(); }, [loadReactions]);

  const handleReactionToggle = async (emoji: string) => {
    if (!isLoggedIn) {
      Alert.alert('Sign in to react');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const alreadyReacted = myReactions.includes(emoji);
    // Optimistic update
    setMyReactions((prev) =>
      alreadyReacted ? prev.filter((e) => e !== emoji) : [...prev, emoji]
    );
    setReactions((prev) => ({
      ...prev,
      [emoji]: Math.max(0, (prev[emoji] ?? 0) + (alreadyReacted ? -1 : 1)),
    }));
    try {
      if (alreadyReacted) {
        await removeReaction(video.id, emoji);
      } else {
        await addReaction(video.id, emoji);
      }
    } catch {
      // Revert on error
      setMyReactions((prev) =>
        alreadyReacted ? [...prev, emoji] : prev.filter((e) => e !== emoji)
      );
      setReactions((prev) => ({
        ...prev,
        [emoji]: Math.max(0, (prev[emoji] ?? 0) + (alreadyReacted ? 1 : -1)),
      }));
    }
  };

  // Load comments on mount
  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const data = await getComments(video.id);
      setComments(data);
    } catch {
      // silently fail — show empty
    } finally {
      setCommentsLoading(false);
    }
  }, [video.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  // Animate view count on first render
  useEffect(() => {
    if (hasAnimatedViews.current) return;
    hasAnimatedViews.current = true;
    const target = video.view_count ?? 0;
    if (target === 0) {
      setDisplayViewCount(0);
      return;
    }
    const duration = 600;
    const steps = 30;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const progress = step / steps;
      setDisplayViewCount(Math.round(progress * target));
      if (step >= steps) {
        clearInterval(timer);
        setDisplayViewCount(target);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [video.view_count]);

  // Load festival-related clips on mount (non-blocking)
  useEffect(() => {
    (async () => {
      try {
        let results: ClipType[] = [];
        if (video.event_id) {
          results = await getClipsByEvent(video.event_id);
        } else if (video.festival_name) {
          results = await searchClips({ festival: video.festival_name, limit: 7 });
        }
        // Filter out the current clip
        setFestivalClips(results.filter((c) => c.id !== video.id).slice(0, 6));
      } catch {
        // silently fail
      } finally {
        setFestivalClipsLoading(false);
      }
    })();
  }, [video.id, video.event_id, video.festival_name]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setIsBuffering(true);
      return;
    }
    setIsPlaying(status.isPlaying);
    setIsBuffering(status.isBuffering ?? false);
    setPositionMillis(status.positionMillis ?? 0);
    setDurationMillis(status.durationMillis ?? 0);

    if (status.didJustFinish) {
      setVideoEnded(true);
      setIsPlaying(false);
      showControls();
    } else {
      setVideoEnded(false);
    }
  };

  const handleVideoTap = async () => {
    showControls();
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const handleMuteToggle = async () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    await videoRef.current.setIsMutedAsync(newMuted);
    setIsMuted(newMuted);
    showControls();
  };

  const handleFullscreen = async () => {
    if (!videoRef.current) return;
    await videoRef.current.presentFullscreenPlayer();
  };

  const handleReplay = async () => {
    if (!videoRef.current) return;
    setVideoEnded(false);
    await videoRef.current.setPositionAsync(0);
    await videoRef.current.playAsync();
    showControls();
  };

  const handleProgressBarTap = async (e: any) => {
    if (!videoRef.current || durationMillis === 0) return;
    const { locationX, target } = e.nativeEvent;
    // We need the bar width — use a layout-based approach
    // We'll use the percentage based on touch location vs bar width
    showControls();
  };

  const handleDownload = async () => {
    if (downloaded) return;
    try {
      // Request media library permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your camera roll to save clips.');
        return;
      }

      // Save to camera roll
      await MediaLibrary.saveToLibraryAsync(video.video_url);

      // Record download in DB
      await recordDownload(video.id);
      setDownloaded(true);
      trackEvent('clip_download', { clip_id: video.id }).catch(() => {});

      // Download milestone notification (every 5 downloads)
      const newCount = (video.download_count ?? 0) + 1;
      if (newCount % 5 === 0) {
        scheduleLocalNotification(
          `⬇️ ${newCount} people downloaded your clip!`,
          `Your ${video.artist} clip from ${video.festival_name} is getting popular 🙌`
        ).catch(() => {});
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved to Camera Roll! 🎉', 'The clip has been saved to your camera roll.');

      // ── App review prompt (Item 3) ──────────────────────────
      try {
        const alreadyRequested = await AsyncStorage.getItem('handsup_review_requested');
        if (alreadyRequested !== 'true') {
          const countStr = await AsyncStorage.getItem('handsup_download_count');
          const count = countStr ? parseInt(countStr, 10) : 0;
          const newCount = count + 1;
          await AsyncStorage.setItem('handsup_download_count', String(newCount));

          if (newCount === 3) {
            const available = await StoreReview.isAvailableAsync();
            if (available) {
              await StoreReview.requestReview();
              await AsyncStorage.setItem('handsup_review_requested', 'true');
            }
          }
        }
      } catch {
        // silently ignore review prompt errors
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save clip to camera roll.');
    }
  };

  const handleLike = async () => {
    if (!isLoggedIn) {
      Alert.alert('Sign in to like clips');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikeCount((prev) => (nowLiked ? prev + 1 : Math.max(0, prev - 1)));
    try {
      if (nowLiked) {
        await likeClip(video.id);
        trackEvent('clip_like', { clip_id: video.id }).catch(() => {});
      } else {
        await unlikeClip(video.id);
      }
    } catch {
      // revert on error
      setLiked(!nowLiked);
      setLikeCount((prev) => (nowLiked ? Math.max(0, prev - 1) : prev + 1));
    }
  };

  const handleFollowToggle = async () => {
    if (!video.uploader_id || followLoading) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(video.uploader_id);
        setFollowing(false);
      } else {
        await followUser(video.uploader_id);
        setFollowing(true);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Error', 'Could not update follow status.');
    } finally {
      setFollowLoading(false);
    }
  };

  const deepLinkUrl = `handsuplate://clip/${video.id}`;

  const handleSaveLongPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const collections: Collection[] = await getMyCollections();
      const options = [
        ...collections.map((c) => c.name),
        '➕ New Collection',
        'Cancel',
      ];
      Alert.alert(
        'Save to...',
        'Choose a collection',
        [
          ...collections.map((c) => ({
            text: c.name,
            onPress: async () => {
              try {
                await addClipToCollection(c.id, video.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Saved!', `Added to "${c.name}"`);
              } catch (e: any) {
                Alert.alert('Error', e?.message ?? 'Could not save to collection.');
              }
            },
          })),
          {
            text: '➕ New Collection',
            onPress: () => {
              Alert.prompt(
                'New Collection',
                'Enter a name for your new collection',
                async (name?: string) => {
                  if (!name?.trim()) return;
                  try {
                    const newCol = await createCollection(name.trim());
                    await addClipToCollection(newCol.id, video.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert('Saved!', `Added to "${newCol.name}"`);
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Could not create collection.');
                  }
                },
                'plain-text'
              );
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch {
      Alert.alert('Error', 'Could not load collections.');
    }
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const shareMessage = `Check out ${video.artist} at ${video.festival_name} on handsuplive.com 🙌\n\n${deepLinkUrl}`;
    try {
      await Share.share({ message: shareMessage, url: deepLinkUrl });
    } catch {
      Alert.alert('Share clip', deepLinkUrl, [{ text: 'OK' }]);
    }
  };

  const handleShareToInstagramStories = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const videoUrl = video.video_url;
    if (!videoUrl) {
      Alert.alert('No video URL', 'This clip has no shareable link.');
      return;
    }
    const instagramUrl = `instagram-stories://share?source_url=${encodeURIComponent(videoUrl)}`;
    const canOpen = await Linking.canOpenURL(instagramUrl);
    if (canOpen) {
      await Linking.openURL(instagramUrl);
    } else {
      Alert.alert('Instagram not installed', 'Install Instagram to share to Stories.');
    }
  };

  const handlePostComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    try {
      const newComment = await postComment(video.id, trimmed);
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not post comment.');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { deleteComment } = await import('../services/comments');
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      Alert.alert('Error', 'Could not delete comment.');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const progressPercent = durationMillis > 0 ? positionMillis / durationMillis : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── Video Player ── */}
        <View style={styles.videoWrapper}>
          {video.video_url ? (
            <>
              <Video
                ref={videoRef}
                source={{ uri: video.video_url }}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={shouldAutoplay}
                isMuted={isMuted}
                useNativeControls={false}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                posterSource={video.thumbnail_url ? { uri: video.thumbnail_url } : undefined}
                usePoster={!!video.thumbnail_url}
              />

              {/* Buffering spinner */}
              {isBuffering && !videoEnded && (
                <View style={styles.overlay}>
                  <ActivityIndicator size="large" color="#8B5CF6" />
                </View>
              )}

              {/* Tap overlay — triggers play/pause and shows controls */}
              <TouchableOpacity
                style={styles.tapOverlay}
                onPress={handleVideoTap}
                activeOpacity={1}
              />

              {/* HD badge — top-left corner of player */}
              {video.resolution && (
                <View style={styles.hdVideoBadge} pointerEvents="none">
                  <Text style={styles.hdVideoBadgeText}>HD</Text>
                </View>
              )}

              {/* Track ID overlay — bottom-left corner of player */}
              {video.track_name && video.track_artist && (
                <TouchableOpacity
                  style={styles.trackIdOverlay}
                  onPress={() => video.track_streaming_url ? Linking.openURL(video.track_streaming_url) : null}
                  activeOpacity={video.track_streaming_url ? 0.75 : 1}
                  pointerEvents="box-only"
                >
                  <Ionicons name="musical-notes" size={10} color="#A78BFA" style={{ marginRight: 5 }} />
                  <View>
                    <Text style={styles.trackIdOverlayLabel}>TRACK ID</Text>
                    <Text style={styles.trackIdOverlayTrack} numberOfLines={1}>
                      {video.track_artist} – {video.track_name}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Controls overlay (animated) */}
              <Animated.View
                style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
                pointerEvents="box-none"
              >
                {/* Play/Pause centre indicator */}
                {!isBuffering && !videoEnded && !isPlaying && (
                  <View style={styles.playButton} pointerEvents="none">
                    <Ionicons name="play" size={28} color="#fff" />
                  </View>
                )}

                {/* Mute button — top right */}
                <TouchableOpacity
                  style={styles.muteBtn}
                  onPress={handleMuteToggle}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isMuted ? 'volume-mute' : 'volume-high'}
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>

                {/* Fullscreen button — bottom right */}
                <TouchableOpacity
                  style={styles.fullscreenBtn}
                  onPress={handleFullscreen}
                  activeOpacity={0.8}
                >
                  <Ionicons name="expand-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </Animated.View>

              {/* Replay overlay — centred, shown when video ends */}
              {videoEnded && (
                <TouchableOpacity
                  style={styles.replayOverlay}
                  onPress={handleReplay}
                  activeOpacity={0.8}
                >
                  <View style={styles.replayCircle}>
                    <Ionicons name="refresh" size={32} color="#fff" />
                  </View>
                </TouchableOpacity>
              )}

              {/* Progress bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercent * 100}%` },
                    ]}
                  />
                </View>
              </View>
            </>
          ) : (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam-off-outline" size={40} color="#444" />
              <Text style={styles.videoUnavailable}>Video unavailable</Text>
            </View>
          )}
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>

          {/* Title + Follow */}
          <View style={styles.artistRow}>
            <View style={styles.artistNameRow}>
              <Text style={styles.artist}>{video.artist}</Text>
              {video.track_name && video.track_artist ? (
                <TouchableOpacity
                  style={styles.trackIdChip}
                  onPress={() => video.track_streaming_url ? Linking.openURL(video.track_streaming_url) : null}
                  activeOpacity={video.track_streaming_url ? 0.7 : 1}
                >
                  <Ionicons name="musical-notes-outline" size={10} color="#8B5CF6" />
                  <Text style={styles.trackIdChipText} numberOfLines={1}>
                    {video.track_artist} – {video.track_name}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.trackIdChipUnknown} activeOpacity={0.7}>
                  <Text style={styles.trackIdChipUnknownText}>Track ID</Text>
                </TouchableOpacity>
              )}
              {video.resolution ? (
                <View style={styles.hdBadge}>
                  <Text style={styles.hdBadgeText}>HD</Text>
                </View>
              ) : null}
            </View>
            {video.uploader_id && video.uploader_id !== currentUserId && (
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
          </View>
          <Text style={styles.festival}>{video.festival_name}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color="#666" />
            <Text style={styles.metaText}>{video.location}</Text>
            <Ionicons name="calendar-outline" size={13} color="#666" style={styles.metaIcon} />
            <Text style={styles.metaText}>{formatDate(video.clip_date)}</Text>
          </View>

          {video.description ? (
            <Text style={styles.description}>
              {splitByHashtagsAndMentions(video.description).map((segment, i) =>
                segment.startsWith('#') ? (
                  <Text
                    key={i}
                    style={styles.hashtag}
                    onPress={() => navigation.navigate('Search', { initialQuery: segment })}
                  >
                    {segment}
                  </Text>
                ) : segment.startsWith('@') ? (
                  <Text
                    key={i}
                    style={styles.mention}
                    onPress={() => navigation.navigate('UserProfile', { username: segment.slice(1) })}
                  >
                    {segment}
                  </Text>
                ) : (
                  <Text key={i}>{segment}</Text>
                )
              )}
            </Text>
          ) : null}

          {/* ── Track ID Row ── */}
          <TrackIdRow
            clip={video}
            isUploader={currentUserId === video.uploader_id}
            onUpdate={async () => {
              // Reload clip from Supabase to get latest track info
              try {
                const { data } = await supabase
                  .from('clips')
                  .select('*')
                  .eq('id', video.id)
                  .single();
                if (data) setVideo((prev) => ({ ...prev, ...data }));
              } catch {
                // silently fail
              }
            }}
          />

          {/* ── Instagram Stories Button — prominent, above stats ── */}
          <TouchableOpacity
            style={styles.instagramBtn}
            onPress={handleShareToInstagramStories}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#f9ce34', '#ee2a7b', '#6228d7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.instagramGradient}
            >
              <Ionicons name="logo-instagram" size={18} color="#fff" />
              <Text style={styles.instagramBtnText}>Share to Instagram Stories</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {displayViewCount > 0 ? displayViewCount.toLocaleString() : '—'}
              </Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {video.download_count > 0 ? video.download_count.toLocaleString() : '—'}
              </Text>
              <Text style={styles.statLabel}>Downloads</Text>
            </View>
            {video.resolution && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{video.resolution}</Text>
                  <Text style={styles.statLabel}>Quality</Text>
                </View>
              </>
            )}
            {video.uploader && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue} numberOfLines={1}>@{video.uploader.username}</Text>
                  <Text style={styles.statLabel}>Uploader</Text>
                </View>
              </>
            )}
          </View>

          {/* ── Reactions Bar ── */}
          <View style={styles.reactionsBar}>
            {['🔥', '🙌', '😮', '💜', '🎵'].map((emoji) => {
              const active = myReactions.includes(emoji);
              const count = reactions[emoji] ?? 0;
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.reactionBtn, active && styles.reactionBtnActive]}
                  onPress={() => handleReactionToggle(emoji)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {count > 0 && (
                    <Text style={[styles.reactionCount, active && styles.reactionCountActive]}>
                      {count}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, liked && styles.actionBtnActive]}
              onPress={handleLike}
              activeOpacity={0.8}
            >
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#EF4444' : '#888'} />
              <Text style={[styles.actionLabel, liked && styles.actionLabelLiked]}>
                {likeCount > 0 ? likeCount.toLocaleString() : 'Like'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, saved && styles.actionBtnActive]}
              onPress={async () => {
                await toggleSave(video.id);
                // Sync to Supabase saves table
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  if (!saved) {
                    // Saving — upsert into saves table
                    await supabase.from('saves').upsert({
                      user_id: user.id,
                      clip_id: video.id,
                      saved_at: new Date().toISOString(),
                    });
                  } else {
                    // Unsaving — delete from saves table
                    await supabase
                      .from('saves')
                      .delete()
                      .eq('user_id', user.id)
                      .eq('clip_id', video.id);
                  }
                }
              }}
              onLongPress={handleSaveLongPress}
              delayLongPress={400}
              activeOpacity={0.8}
            >
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? '#8B5CF6' : '#888'} />
              <Text style={[styles.actionLabel, saved && styles.actionLabelSaved]}>
                {saved ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, downloaded && styles.actionBtnDownloaded]}
              onPress={handleDownload}
              disabled={downloaded}
              activeOpacity={0.8}
            >
              <Ionicons name={downloaded ? 'checkmark-circle' : 'download-outline'} size={22} color={downloaded ? '#4ade80' : '#888'} />
              <Text style={[styles.actionLabel, downloaded && styles.actionLabelDownloaded]}>
                {downloaded ? 'Saved' : 'Download'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={22} color="#888" />
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Report link */}
          <TouchableOpacity
            style={styles.reportLink}
            onPress={() => navigation.navigate('Report', { clipId: video.id })}
            activeOpacity={0.75}
          >
            <Ionicons name="flag-outline" size={13} color="#444" />
            <Text style={styles.reportLinkText}>Report</Text>
          </TouchableOpacity>

          {/* ── More from this festival ── */}
          {video.festival_name && (
            <View style={styles.festivalSection}>
              <Text style={styles.festivalSectionTitle}>
                More from {video.festival_name}
              </Text>
              {festivalClipsLoading ? (
                <ActivityIndicator color="#8B5CF6" style={{ marginVertical: 16 }} />
              ) : festivalClips.length === 0 ? (
                <View style={styles.festivalEmpty}>
                  <Text style={styles.festivalEmptyText}>No other clips from this festival yet</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.festivalScrollContent}
                >
                  {festivalClips.map((clip) => (
                    <TouchableOpacity
                      key={clip.id}
                      style={styles.festivalCard}
                      onPress={() => navigation.replace('VideoDetail', { video: clip })}
                      activeOpacity={0.85}
                    >
                      {clip.thumbnail_url ? (
                        <Image source={{ uri: clip.thumbnail_url }} style={styles.festivalCardThumb} />
                      ) : (
                        <View style={[styles.festivalCardThumb, styles.festivalCardThumbPlaceholder]}>
                          <Ionicons name="musical-notes-outline" size={22} color="#333" />
                        </View>
                      )}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.75)']}
                        style={styles.festivalCardGradient}
                      >
                        <Text style={styles.festivalCardArtist} numberOfLines={1}>{clip.artist}</Text>
                        {clip.location ? (
                          <Text style={styles.festivalCardLocation} numberOfLines={1}>{clip.location}</Text>
                        ) : null}
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* ── Comments Section ── */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              💬 Comments{comments.length > 0 ? ` (${comments.length})` : ''}
            </Text>

            {commentsLoading ? (
              <ActivityIndicator color="#8B5CF6" style={{ marginVertical: 24 }} />
            ) : comments.length === 0 ? (
              <View style={styles.commentsEmpty}>
                <Ionicons name="chatbubbles-outline" size={32} color="#333" />
                <Text style={styles.commentsEmptyText}>No comments yet — be the first!</Text>
              </View>
            ) : (
              <View style={styles.commentsList}>
                {comments.map((c) => (
                  <CommentRow
                    key={c.id}
                    comment={c}
                    currentUserId={currentUserId}
                    onDelete={handleDeleteComment}
                    onMentionPress={(username) => navigation.navigate('UserProfile', { username })}
                  />
                ))}
              </View>
            )}

            {/* Comment Input */}
            {isLoggedIn ? (
              <View style={styles.commentInputWrapper}>
                {/* Mention autocomplete dropdown */}
                {mentionResults.length > 0 && (
                  <View style={styles.mentionDropdown}>
                    {mentionResults.map((profile) => (
                      <TouchableOpacity
                        key={profile.id}
                        style={styles.mentionItem}
                        onPress={() => handleMentionSelect(profile.username)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.mentionAvatar}>
                          <Text style={styles.mentionAvatarText}>
                            {profile.username[0]?.toUpperCase() ?? '?'}
                          </Text>
                        </View>
                        <Text style={styles.mentionUsername}>@{profile.username}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={styles.commentInputRow}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment… (use @username to mention)"
                    placeholderTextColor="#444"
                    value={commentText}
                    onChangeText={handleCommentTextChange}
                    maxLength={280}
                    returnKeyType="send"
                    onSubmitEditing={handlePostComment}
                    multiline={false}
                  />
                  <TouchableOpacity
                    style={[styles.commentSendBtn, (!commentText.trim() || posting) && styles.commentSendBtnDisabled]}
                    onPress={handlePostComment}
                    disabled={!commentText.trim() || posting}
                    activeOpacity={0.8}
                  >
                    {posting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="send" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.signInPrompt}>
                <Text style={styles.signInPromptText}>Sign in to comment</Text>
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { paddingBottom: 60 },

  // Video
  videoWrapper: {
    width: '100%',
    height: 260,
    backgroundColor: '#0a0a0a',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30,
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139,92,246,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  muteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenBtn: {
    position: 'absolute',
    bottom: 18,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  replayCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 0,
  },
  progressBarTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressBarFill: {
    height: 3,
    backgroundColor: '#8B5CF6',
    borderRadius: 0,
  },
  // HD badge on video player (top-left, absolute)
  hdVideoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 10,
  },
  hdVideoBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Track ID overlay — bottom-left of video player
  trackIdOverlay: {
    position: 'absolute',
    bottom: 14,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 5, 20, 0.78)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: 180,
    zIndex: 20,
  },
  trackIdOverlayLabel: {
    color: '#8B5CF6',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 1,
  },
  trackIdOverlayTrack: {
    color: '#e0d4ff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  videoUnavailable: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },

  // Body
  body: { padding: 20 },

  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 12,
  },
  artistNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  artist: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  trackIdChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1a0a2e',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#8B5CF633',
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'center',
    maxWidth: 180,
  },
  trackIdChipText: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '600',
  },
  trackIdChipUnknown: {
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'center',
  },
  trackIdChipUnknownText: {
    color: '#444',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hdBadge: {
    backgroundColor: '#FBBF24',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'center',
  },
  hdBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    minWidth: 80,
    alignItems: 'center',
  },
  followBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  followBtnTextActive: {
    color: '#fff',
  },
  festival: {
    fontSize: 15,
    color: '#8B5CF6',
    fontWeight: '800',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 3,
  },
  metaIcon: {
    marginLeft: 10,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 22,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  hashtag: {
    color: '#8B5CF6',
    fontWeight: '600',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#111',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  stat: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: '#222' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#fff', maxWidth: 90 },
  statLabel: { fontSize: 11, color: '#555', marginTop: 3 },

  // Reactions
  reactionsBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  reactionBtn: {
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#222',
    minWidth: 52,
  },
  reactionBtnActive: {
    backgroundColor: '#1a1228',
    borderColor: '#8B5CF6',
  },
  reactionEmoji: {
    fontSize: 22,
  },
  reactionCount: {
    color: '#666',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  reactionCountActive: {
    color: '#8B5CF6',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    gap: 5,
  },
  actionBtnActive: {
    borderColor: '#8B5CF644',
    backgroundColor: '#1a1228',
  },
  actionBtnDownloaded: {
    borderColor: '#4ade8044',
    backgroundColor: '#0f1e0f',
  },
  actionLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  actionLabelLiked: { color: '#EF4444' },
  actionLabelSaved: { color: '#8B5CF6' },
  actionLabelDownloaded: { color: '#4ade80' },

  // Comments
  commentsSection: { marginTop: 4 },
  commentsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  commentsEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    marginBottom: 16,
  },
  commentsEmptyText: {
    color: '#444',
    fontSize: 14,
    fontWeight: '600',
  },
  commentsList: {
    marginBottom: 12,
    gap: 2,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2a1650',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  commentAvatarText: {
    color: '#8B5CF6',
    fontWeight: '800',
    fontSize: 14,
  },
  commentBody: { flex: 1 },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 4,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: '#aaa',
  },
  commentUsernameVerified: {
    color: '#8B5CF6',
  },
  commentTime: {
    fontSize: 11,
    color: '#444',
    marginLeft: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  mention: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  commentMention: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  commentHashtag: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  commentInputWrapper: {
    marginTop: 8,
    position: 'relative',
  },
  mentionDropdown: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 6,
    overflow: 'hidden',
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  mentionAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2a1650',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionAvatarText: {
    color: '#8B5CF6',
    fontWeight: '800',
    fontSize: 12,
  },
  mentionUsername: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  commentSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendBtnDisabled: {
    backgroundColor: '#2a1a4a',
  },
  signInPrompt: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  signInPromptText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },

  // Festival related clips
  festivalSection: {
    marginBottom: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  festivalSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  festivalScrollContent: {
    gap: 10,
  },
  festivalCard: {
    width: 200,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  festivalCardThumb: {
    width: '100%',
    height: '100%',
  },
  festivalCardThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  festivalCardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 28,
  },
  festivalCardArtist: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  festivalCardLocation: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 1,
  },
  festivalEmpty: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    paddingVertical: 20,
    alignItems: 'center',
  },
  festivalEmptyText: {
    color: '#444',
    fontSize: 13,
    fontWeight: '600',
  },

  // Report
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 16,
    marginTop: -12,
  },
  reportLinkText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
  },

  // Instagram
  instagramBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  instagramGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  instagramBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

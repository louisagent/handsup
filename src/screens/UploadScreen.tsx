import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Share,
  Switch,
  Linking,
} from 'react-native';
import { getCachedLocation } from '../services/location';
import Slider from '@react-native-community/slider';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import type { Video as VideoType } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from '../services/supabase';
import { uploadClip } from '../services/clips';
import { trackEvent } from '../services/analytics';
import { notifyFollowersOfNewClip } from '../services/notifications';
import { createArtistIfNotExists } from '../services/artists';
import { splitByHashtags } from '../utils/tags';
import { detectTrackForClip } from '../services/acrcloud';

const LAST_EVENT_KEY = 'handsup_last_upload_event';

// ─── Platform limits ──────────────────────────────────────────────────────────
export const MAX_VIDEO_DURATION_SECONDS = 60;
export const MAX_UPLOADS_PER_EVENT = 10;

const SCREEN_WIDTH = Dimensions.get('window').width;

async function getUploadsForEvent(festival: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count, error } = await supabase
    .from('clips')
    .select('id', { count: 'exact', head: true })
    .eq('uploader_id', user.id)
    .ilike('festival_name', festival);
  if (error) return 0;
  return count ?? 0;
}

// Try multiple timestamps to find a non-black frame
async function generateBestThumbnail(videoUri: string): Promise<string | null> {
  const timestamps = [2000, 5000, 1000, 10000, 3000]; // Try 2s first, then 5s, etc.
  for (const time of timestamps) {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time });
      if (uri) return uri;
    } catch {
      continue;
    }
  }
  return null;
}

export default function UploadScreen({ route }: any) {
  const prefillFestival = route?.params?.prefillFestival ?? '';
  const prefillLocation = route?.params?.prefillLocation ?? '';

  // ── Quick mode
  const [quickMode, setQuickMode] = useState(true);

  // ── Form fields
  const [artist, setArtist] = useState('');
  const [festival, setFestival] = useState(prefillFestival);
  const [location, setLocation] = useState(prefillLocation);
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  // Track auto-filled fields
  const [dateAutoFilled, setDateAutoFilled] = useState(true);
  const [locationAutoFilled, setLocationAutoFilled] = useState(false);

  // ── Step / flow
  const [step, setStep] = useState<1 | 2>(1);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  const uploadXHRRef = useRef<XMLHttpRequest | null>(null);

  // ── Video
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null); // seconds

  // ── Trimmer state
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [trimStartMs, setTrimStartMs] = useState(0);
  const [trimEndMs, setTrimEndMs] = useState(0);
  const [trimApplied, setTrimApplied] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const trimVideoRef = useRef<VideoType>(null);

  // ── Date picker
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── Event upload limit
  const [uploadsForEvent, setUploadsForEvent] = useState(0);
  const [checkingLimit, setCheckingLimit] = useState(false);

  // ── Thumbnail
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  // ── Last event pre-fill
  const [prefilled, setPrefilled] = useState(false);
  const [prefillDismissed, setPrefillDismissed] = useState(false);

  // ── Track ID (optional pre-fill on upload)
  const [trackName, setTrackName] = useState('');
  const [trackArtist, setTrackArtist] = useState('');

  // ── Post-submit info
  const [submittedArtist, setSubmittedArtist] = useState('');
  const [submittedFestival, setSubmittedFestival] = useState('');
  const [submittedClipId, setSubmittedClipId] = useState<string | null>(null);
  const [festivalClipCount, setFestivalClipCount] = useState<number>(0);

  // ── Success animation
  const successScale = useRef(new Animated.Value(0)).current;

  // ── Progress bar animated width
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (festival.trim().length > 2) {
      const timer = setTimeout(async () => {
        setCheckingLimit(true);
        const count = await getUploadsForEvent(festival.trim());
        setUploadsForEvent(count);
        setCheckingLimit(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setUploadsForEvent(0);
    }
    return undefined;
  }, [festival]);

  // On mount: check AsyncStorage for last upload event (pre-fill if < 2 days old)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LAST_EVENT_KEY);
        if (!raw) return;
        const saved: { festival: string; location: string; date: string } = JSON.parse(raw);
        const savedDate = new Date(saved.date);
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        if (savedDate >= twoDaysAgo && saved.festival && saved.location) {
          setFestival(saved.festival);
          setLocation(saved.location);
          setPrefilled(true);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Auto-fill location from cached GPS
  useEffect(() => {
    (async () => {
      try {
        const loc = await getCachedLocation();
        if (loc?.city && !location) {
          setLocation(loc.city);
          setLocationAutoFilled(true);
        }
      } catch {
        // ignore
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate progress bar whenever uploadProgress changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: uploadProgress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [uploadProgress]);

  const uploadsRemaining = MAX_UPLOADS_PER_EVENT - uploadsForEvent;
  const atEventLimit = uploadsForEvent >= MAX_UPLOADS_PER_EVENT;
  // A video is too long only if we haven't trimmed it
  const videoTooLong = videoDuration !== null && videoDuration > MAX_VIDEO_DURATION_SECONDS && !trimApplied;

  const initVideoAsset = (uri: string, durationMs: number | null) => {
    setVideoUri(uri);
    const durationSecs = durationMs != null ? Math.round(durationMs / 1000) : null;
    setVideoDuration(durationSecs);
    // If video > 60s, open trimmer
    if (durationSecs != null && durationSecs > MAX_VIDEO_DURATION_SECONDS) {
      const durMs = durationMs ?? durationSecs * 1000;
      setTrimStartMs(0);
      setTrimEndMs(Math.min(durMs, MAX_VIDEO_DURATION_SECONDS * 1000));
      setTrimApplied(false);
      setShowTrimmer(true);
    } else {
      setShowTrimmer(false);
      setTrimApplied(false);
    }
  };

  const handlePickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library to pick a video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 60,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      initVideoAsset(asset.uri, asset.duration ?? null);
    }
  };

  const handleRecordVideo = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Please allow camera access to record festival clips.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      initVideoAsset(asset.uri, asset.duration ?? null);
    }
  };

  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

  const uploadVideoWithProgress = async (
    fileUri: string,
    fileName: string,
    onProgress: (pct: number) => void
  ): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const supabaseUrl = (supabase as any).supabaseUrl as string;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/clips/${fileName}`;

    const response = await fetch(fileUri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      uploadXHRRef.current = xhr;

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          onProgress(pct);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Return the storage path (not a public URL — clips bucket is private)
          resolve(fileName);
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload network error')));
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('Content-Type', 'video/mp4');
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.send(blob);
    });
  };

  const handleCancelUpload = () => {
    if (uploadXHRRef.current) {
      uploadXHRRef.current.abort();
      uploadXHRRef.current = null;
    }
    setUploadProgress(0);
    setUploadStatus('idle');
    setUploading(false);
  };

  const handleNextStep = () => {
    if (!artist || !festival) {
      Alert.alert('Missing info', 'Please fill in artist and festival.');
      return;
    }
    if (!quickMode && !location) {
      Alert.alert('Missing info', 'Please fill in location.');
      return;
    }
    if (!videoUri) {
      Alert.alert('No video selected', 'Please pick a video from your library.');
      return;
    }
    if (atEventLimit) {
      Alert.alert(
        'Upload limit reached',
        `You've already uploaded ${MAX_UPLOADS_PER_EVENT} clips from ${festival}.`
      );
      return;
    }
    if (videoTooLong) {
      Alert.alert('Video too long', `Clips must be ${MAX_VIDEO_DURATION_SECONDS}s or less.`);
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Sign in required', 'Please sign in before uploading a clip.');
        setUploading(false);
        setUploadStatus('idle');
        return;
      }

      const fileName = `${user.id}/${Date.now()}-${artist.replace(/\s+/g, '-').toLowerCase()}.mp4`;

      // Use XHR-based upload for real progress events
      // uploadVideoWithProgress now returns the storage path (not a public URL)
      const storagePath = await uploadVideoWithProgress(videoUri!, fileName, setUploadProgress);

      // Generate a 1-year signed URL for the private clips bucket
      const { data: signedData, error: signedError } = await supabase.storage
        .from('clips')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
      const videoUrl = signedData?.signedUrl ?? storagePath;
      if (signedError) {
        console.warn('Failed to create signed URL, storing path instead:', signedError.message);
      }

      setUploadProgress(100);
      setUploadStatus('processing');

      // ── Generate thumbnail ──────────────────────────────────
      let thumbUrl: string | undefined;
      try {
        const thumbUri = await generateBestThumbnail(videoUri!);
        if (!thumbUri) throw new Error('no thumbnail');
        setThumbnailUri(thumbUri);
        const thumbData = await fetch(thumbUri);
        const thumbBlob = await thumbData.blob();
        const thumbPath = `${user.id}/${Date.now()}-thumb.jpg`;
        // Try 'thumbnails' bucket first, fall back to 'clips' bucket
        let thumbBucket = 'thumbnails';
        let { error: thumbError } = await supabase.storage
          .from(thumbBucket)
          .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' });
        
        if (thumbError) {
          // thumbnails bucket doesn't exist — use clips bucket
          thumbBucket = 'clips';
          const fallback = await supabase.storage
            .from(thumbBucket)
            .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' });
          thumbError = fallback.error;
        }
        
        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from(thumbBucket)
            .getPublicUrl(thumbPath);
          thumbUrl = thumbUrlData?.publicUrl;
        }
      } catch {
        // thumbnail generation is best-effort — don't fail the upload
      }

      // Build description with trim metadata if applied
      const trimNote = trimApplied
        ? `[trim:${trimStartMs}-${trimEndMs}ms] `
        : '';
      const finalDescription = trimNote + (description || '');

      // Insert metadata
      const uploadedClip = await uploadClip({
        artist,
        festival_name: festival,
        location,
        clip_date: dateString,
        description: finalDescription || undefined,
        video_url: videoUrl,
        thumbnail_url: thumbUrl,
        duration_seconds: trimApplied
          ? Math.round((trimEndMs - trimStartMs) / 1000)
          : (videoDuration ?? undefined),
        track_name: trackName.trim() || undefined,
        track_artist: trackArtist.trim() || undefined,
        track_id_status: (trackName.trim() && trackArtist.trim()) ? 'confirmed' : 'unknown',
      } as any);

      // ── ACRCloud track detection (fire and forget) ──────────
      if (uploadedClip?.id && videoUrl) {
        detectTrackForClip(uploadedClip.id, videoUrl)
          .then((result) => {
            if (result.matched) {
              console.log(`[ACRCloud] Track detected: ${result.track_artist} – ${result.track_name}`);
            }
          })
          .catch(() => {
            // Silent fail — community suggestions still available
          });
      }

      setSubmittedArtist(artist);
      setSubmittedFestival(festival);
      setSubmittedClipId(uploadedClip?.id ?? null);
      trackEvent('clip_upload', { artist, festival }).catch(() => {});

      // Auto-create artist profile if it doesn't exist (fire and forget)
      if (artist) {
        createArtistIfNotExists(artist).catch(() => {});
      }

      // Save last event to AsyncStorage for pre-fill on next upload
      AsyncStorage.setItem(LAST_EVENT_KEY, JSON.stringify({
        festival,
        location,
        date: new Date().toISOString(),
      })).catch(() => {});

      // Feature 1: Notify followers (fire and forget)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', currentUser.id)
          .single();
        const uploaderUsername = profileData?.username ?? 'someone';
        notifyFollowersOfNewClip(uploadedClip?.id ?? '', artist, festival, uploaderUsername).catch(() => {});
      }

      // 30 min after upload — check on the clip
      Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 How\'s your clip doing?',
          body: `Check how many people have viewed and downloaded your upload from ${festival}`,
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 30 * 60 },
      }).catch(() => {});

      // Fetch updated festival clip count for ranking card
      const updatedCount = await getUploadsForEvent(festival.trim());
      setFestivalClipCount(updatedCount);

      setUploadStatus('done');
      setSubmitted(true);

      // Spring-animate the success emoji
      Animated.spring(successScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start();

      // Reset progress UI after short delay
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress(0);
      }, 2000);
    } catch (err: any) {
      if ((err as Error).message === 'Upload cancelled') {
        // Already handled by handleCancelUpload — don't show error alert
        return;
      }
      setUploadStatus('error');
      Alert.alert('Upload failed', err?.message ?? 'Something went wrong. Please try again.');
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress(0);
      }, 2000);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setArtist('');
    setFestival('');
    setLocation('');
    setDate(new Date());
    setDateAutoFilled(true);
    setLocationAutoFilled(false);
    setDescription('');
    setVideoUri(null);
    setVideoDuration(null);
    setThumbnailUri(null);
    setUploadsForEvent(0);
    setSubmitted(false);
    setStep(1);
    setUploadProgress(0);
    setUploadStatus('idle');
    successScale.setValue(0);
    setShowTrimmer(false);
    setTrimApplied(false);
    setTrimStartMs(0);
    setTrimEndMs(0);
    setIsPreviewing(false);
    setPrefilled(false);
    setPrefillDismissed(false);
  };

  // ── Success Screen ────────────────────────────────────────
  if (submitted) {
    const deepLink = submittedClipId
      ? `https://handsup.app/clips/${submittedClipId}`
      : `https://handsup.app`;

    const handleShare = async () => {
      try {
        await Share.share({
          message: `Check out this ${submittedArtist} clip from ${submittedFestival} on Handsup! 🙌\n${deepLink}`,
          url: deepLink,
          title: `${submittedArtist} @ ${submittedFestival}`,
        });
      } catch {
        // ignore cancel
      }
    };

    const isFestivalCrew = festivalClipCount >= 3;

    return (
      <ScrollView contentContainerStyle={styles.successContainer}>
        <Animated.Text style={[styles.successEmoji, { transform: [{ scale: successScale }] }]}>
          ✅
        </Animated.Text>
        <Text style={styles.successTitle}>Video uploaded!</Text>
        <Text style={styles.successSub}>
          {submittedArtist} at {submittedFestival} is now live for everyone to enjoy.
        </Text>
        <Text style={styles.successNote}>
          Thanks for keeping your hands up and sharing the moment 💜
        </Text>

        {/* ── Ranking card ── */}
        <View style={styles.rankingCard}>
          <Text style={styles.rankingCardTitle}>Your ranking 🏆</Text>
          <View style={styles.rankingStatRow}>
            <Text style={styles.rankingStatValue}>{festivalClipCount}</Text>
            <Text style={styles.rankingStatLabel}>clips from {submittedFestival}</Text>
          </View>
          {isFestivalCrew ? (
            <Text style={styles.rankingMessage}>
              You've uploaded {festivalClipCount} clips from {submittedFestival} — you're a Festival Crew member! 🏆
            </Text>
          ) : (
            <Text style={styles.rankingMessage}>
              You're now on the {submittedFestival} leaderboard! 🎉 Upload {3 - festivalClipCount} more to join the Festival Crew.
            </Text>
          )}
        </View>

        {/* ── Share button ── */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
          <Text style={styles.shareBtnText}>📤 Share your upload</Text>
        </TouchableOpacity>

        {/* ── Post everywhere card ── */}
        <View style={styles.postEverywhereCard}>
          <Text style={styles.postEverywhereTitle}>Share your clip everywhere 🚀</Text>
          <Text style={styles.postEverywhereSub}>
            Use Hands Up as your source — then post everywhere else
          </Text>
          <View style={styles.postEverywhereButtons}>
            <TouchableOpacity
              style={styles.postBtn}
              onPress={() => {
                const url = 'https://www.tiktok.com/upload';
                Linking.canOpenURL('tiktok://').then((can) => {
                  Linking.openURL(can ? 'tiktok://' : url);
                });
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-tiktok" size={18} color="#fff" />
              <Text style={styles.postBtnText}>TikTok</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postBtn, styles.postBtnIG]}
              onPress={() => {
                Linking.canOpenURL('instagram://').then((can) => {
                  Linking.openURL(can ? 'instagram://' : 'https://www.instagram.com');
                });
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-instagram" size={18} color="#fff" />
              <Text style={styles.postBtnText}>Instagram</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.postEverywhereNote}>
            💡 Hands Up clip stays saved here. Share it anywhere.
          </Text>
        </View>

        {uploadsRemaining - 1 > 0 && (
          <View style={styles.remainingBadge}>
            <Text style={styles.remainingText}>
              {uploadsRemaining - 1} upload{uploadsRemaining - 1 !== 1 ? 's' : ''} remaining for {submittedFestival}
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.uploadAnother} onPress={handleReset}>
          <Text style={styles.uploadAnotherText}>Upload another</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Trim helpers ──────────────────────────────────────────
  const formatMs = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const trimDurationSecs = Math.round((trimEndMs - trimStartMs) / 1000);
  const totalDurationMs = (videoDuration ?? 0) * 1000;

  const handlePreviewTrim = async () => {
    if (!trimVideoRef.current) return;
    setIsPreviewing(true);
    await trimVideoRef.current.setPositionAsync(trimStartMs);
    await trimVideoRef.current.playAsync();
  };

  const handleTrimPlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (isPreviewing && status.positionMillis >= trimEndMs) {
      trimVideoRef.current?.pauseAsync();
      setIsPreviewing(false);
    }
  };

  const handleUseTrim = () => {
    setTrimApplied(true);
    setShowTrimmer(false);
  };

  // ── Trimmer Screen ────────────────────────────────────────
  const renderTrimmer = () => (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Trim your video ✂️</Text>
        <Text style={styles.subtitle}>
          Your video is {videoDuration}s — select a {MAX_VIDEO_DURATION_SECONDS}s segment to upload
        </Text>
      </View>

      {/* Video preview */}
      <View style={styles.trimVideoContainer}>
        <Video
          ref={trimVideoRef}
          source={{ uri: videoUri! }}
          style={styles.trimVideo}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isMuted={false}
          useNativeControls={false}
          onPlaybackStatusUpdate={handleTrimPlaybackStatus}
        />
      </View>

      {/* Trim range display */}
      <View style={styles.trimRangeRow}>
        <Text style={styles.trimRangeText}>
          {formatMs(trimStartMs)} → {formatMs(trimEndMs)}{' '}
          <Text style={styles.trimDurationBadge}>({trimDurationSecs}s)</Text>
        </Text>
      </View>

      {/* Start slider */}
      <Text style={styles.trimSliderLabel}>Start: {formatMs(trimStartMs)}</Text>
      <Slider
        style={styles.trimSlider}
        minimumValue={0}
        maximumValue={Math.max(totalDurationMs - 1000, 1000)}
        value={trimStartMs}
        step={500}
        minimumTrackTintColor="#8B5CF6"
        maximumTrackTintColor="#333"
        thumbTintColor="#8B5CF6"
        onValueChange={(val) => {
          const newStart = Math.min(val, trimEndMs - 1000);
          setTrimStartMs(newStart);
        }}
      />

      {/* End slider */}
      <Text style={styles.trimSliderLabel}>End: {formatMs(trimEndMs)}</Text>
      <Slider
        style={styles.trimSlider}
        minimumValue={Math.max(trimStartMs + 1000, 1000)}
        maximumValue={totalDurationMs}
        value={trimEndMs}
        step={500}
        minimumTrackTintColor="#8B5CF6"
        maximumTrackTintColor="#333"
        thumbTintColor="#a78bfa"
        onValueChange={(val) => {
          // Cap at start + 60s
          const maxEnd = trimStartMs + MAX_VIDEO_DURATION_SECONDS * 1000;
          setTrimEndMs(Math.min(val, maxEnd));
        }}
      />

      {/* Duration warning */}
      {trimDurationSecs > MAX_VIDEO_DURATION_SECONDS && (
        <Text style={styles.trimWarning}>
          ⚠️ Segment is {trimDurationSecs}s — must be {MAX_VIDEO_DURATION_SECONDS}s or less
        </Text>
      )}
      {trimDurationSecs <= MAX_VIDEO_DURATION_SECONDS && (
        <Text style={styles.trimOk}>
          ✅ {trimDurationSecs}s selected — within limit
        </Text>
      )}

      <Text style={styles.trimNote}>
        💡 Trim applied on upload. The full video is uploaded but only this segment will be displayed (server-side processing in production).
      </Text>

      <View style={styles.trimButtons}>
        <TouchableOpacity
          style={styles.trimPreviewBtn}
          onPress={handlePreviewTrim}
          activeOpacity={0.85}
        >
          <Text style={styles.trimPreviewBtnText}>
            {isPreviewing ? '⏸ Previewing...' : '▶ Preview trim'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.trimUseBtn,
            trimDurationSecs > MAX_VIDEO_DURATION_SECONDS && styles.submitBtnDisabled,
          ]}
          onPress={handleUseTrim}
          disabled={trimDurationSecs > MAX_VIDEO_DURATION_SECONDS}
          activeOpacity={0.85}
        >
          <Text style={styles.trimUseBtnText}>Use this trim →</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => {
          setVideoUri(null);
          setVideoDuration(null);
          setShowTrimmer(false);
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.backBtnText}>← Choose different video</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Step indicator ────────────────────────────────────────
  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorRow}>
      <Text style={styles.stepIndicatorText}>Step {step} of 2</Text>
      <View style={styles.stepDots}>
        <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
        <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
      </View>
    </View>
  );

  // ── Step 1: Video + Basic Info ────────────────────────────
  const renderStep1 = () => (
    <>
      {/* Video picker / preview area */}
      {videoUri ? (
        <View style={styles.videoPreviewContainer}>
          <Video
            source={{ uri: videoUri }}
            style={styles.videoPreview}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isMuted
            useNativeControls={false}
          />
          <View style={styles.videoPreviewOverlay}>
            {videoDuration !== null && (
              <View style={[styles.durationBadge, videoTooLong && styles.durationBadgeError]}>
                <Text style={[styles.durationText, videoTooLong && styles.durationTextError]}>
                  {videoTooLong
                    ? `⚠️ ${videoDuration}s — too long`
                    : `✅ ${videoDuration}s`}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.changeVideoBtn} onPress={handlePickVideo} activeOpacity={0.8}>
            <Text style={styles.changeVideoBtnText}>Change video</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
        {/* Incentive banner */}
        <View style={styles.incentiveBanner}>
          <Text style={styles.incentiveBannerText}>🔥 Top clip gets featured · updates every hour</Text>
        </View>

        <View style={styles.videoPickerGroup}>
          <TouchableOpacity
            style={[styles.videoPicker, videoTooLong && styles.videoPickerError]}
            activeOpacity={0.8}
            onPress={handlePickVideo}
          >
            <Text style={styles.videoPickerIcon}>📂</Text>
            <Text style={styles.videoPickerText}>Upload your best clip</Text>
            <Text style={styles.videoPickerSub}>Max {MAX_VIDEO_DURATION_SECONDS}s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.recordBtn}
            activeOpacity={0.8}
            onPress={handleRecordVideo}
          >
            <Text style={styles.recordBtnIcon}>🎥</Text>
            <Text style={styles.recordBtnText}>Film it live 🎥</Text>
            <Text style={styles.videoPickerSub}>Up to {MAX_VIDEO_DURATION_SECONDS}s</Text>
          </TouchableOpacity>
        </View>
        </>
      )}

      <View style={styles.form}>
        {/* Quick Mode toggle */}
        <View style={styles.quickModeRow}>
          <View style={styles.quickModeLeft}>
            <Text style={styles.quickModeLabel}>⚡ Fast upload</Text>
            <Text style={styles.quickModeSub}>{quickMode ? 'Only tag artist + event' : 'All fields shown'}</Text>
          </View>
          <Switch
            value={quickMode}
            onValueChange={setQuickMode}
            trackColor={{ false: '#333', true: '#8B5CF6' }}
            thumbColor={quickMode ? '#fff' : '#888'}
          />
        </View>

        <Text style={styles.label}>Artist *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Tame Impala"
          placeholderTextColor="#444"
          value={artist}
          onChangeText={setArtist}
        />

        <Text style={styles.label}>Festival / Event *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Laneway Festival"
          placeholderTextColor="#444"
          value={festival}
          onChangeText={setFestival}
        />

        {/* Pre-fill hint */}
        {prefilled && !prefillDismissed && (
          <View style={styles.prefillHint}>
            <Text style={styles.prefillHintText}>Using your last event</Text>
            <TouchableOpacity onPress={() => setPrefillDismissed(true)} activeOpacity={0.7}>
              <Text style={styles.prefillHintDismiss}>×</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Per-event upload limit indicator */}
        {festival.length > 0 && (
          <View style={[styles.eventLimitBar, atEventLimit && styles.eventLimitBarFull]}>
            <View style={styles.eventLimitLeft}>
              {checkingLimit ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <>
                  <Text style={styles.eventLimitLabel}>
                    {atEventLimit ? '🚫 Event limit reached' : '📤 Uploads for this event'}
                  </Text>
                  {!atEventLimit && (
                    <Text style={styles.eventLimitCount}>
                      {uploadsForEvent} / {MAX_UPLOADS_PER_EVENT} used · {uploadsRemaining} remaining
                    </Text>
                  )}
                  {atEventLimit && (
                    <Text style={styles.eventLimitFull}>
                      You've reached the {MAX_UPLOADS_PER_EVENT}-clip limit for {festival}
                    </Text>
                  )}
                </>
              )}
            </View>
            {!checkingLimit && (
              <View style={styles.eventLimitDots}>
                {Array.from({ length: MAX_UPLOADS_PER_EVENT }).map((_, i) => (
                  <View key={i} style={[styles.dot, i < uploadsForEvent && styles.dotFilled]} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Location & Date — hidden in Quick Mode */}
        {!quickMode && (
          <>
            <View style={styles.autoFillLabelRow}>
              <Text style={styles.label}>Location *</Text>
              {locationAutoFilled && <Text style={styles.autoFilledTag}>auto-filled</Text>}
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g. Melbourne"
              placeholderTextColor="#444"
              value={location}
              onChangeText={(t) => { setLocation(t); setLocationAutoFilled(false); }}
            />

            <View style={styles.autoFillLabelRow}>
              <Text style={styles.label}>Date *</Text>
              {dateAutoFilled && <Text style={styles.autoFilledTag}>auto-filled</Text>}
            </View>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => { setShowDatePicker(true); setDateAutoFilled(false); }}
              activeOpacity={0.8}
            >
              <Text style={styles.datePickerBtnText}>
                📅 {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(_event: any, selectedDate?: Date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) setDate(selectedDate);
                  if (Platform.OS !== 'ios') setShowDatePicker(false);
                }}
                themeVariant="dark"
                style={styles.datePicker}
              />
            )}
          </>
        )}

        {/* In quick mode, show a subtle note about auto-filled fields */}
        {quickMode && (
          <View style={styles.quickModeAutoNote}>
            <Text style={styles.quickModeAutoNoteText}>
              📅 Date: {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              {location ? `  ·  📍 ${location}` : ''}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (!videoUri || atEventLimit || videoTooLong) && styles.submitBtnDisabled]}
          onPress={handleNextStep}
          activeOpacity={0.85}
          disabled={!videoUri || atEventLimit}
        >
          <Text style={styles.submitText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const handleChangeCover = () => {
    Alert.alert(
      'Choose Cover Image',
      'How would you like to set the cover?',
      [
        {
          text: '🎬 Auto-generate',
          onPress: async () => {
            const thumbUri = await generateBestThumbnail(videoUri!);
            if (thumbUri) setThumbnailUri(thumbUri);
          },
        },
        {
          text: '🖼️ Choose from library',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [16, 9],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              setThumbnailUri(result.assets[0].uri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ── Step 2: Review + Description + Upload ─────────────────
  const renderStep2 = () => (
    <>
      {/* Thumbnail / video preview */}
      {videoUri && (
        <View style={styles.reviewPreviewContainer}>
          {/* Cover image with change button */}
          <TouchableOpacity
            style={styles.coverWrapper}
            onPress={handleChangeCover}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: thumbnailUri ?? videoUri }}
              style={styles.reviewThumbnail}
              resizeMode="cover"
            />
            <View style={styles.changeCoverOverlay}>
              <Ionicons name="camera-outline" size={18} color="#fff" />
              <Text style={styles.changeCoverText}>Change Cover</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.reviewPreviewMeta}>
            <Text style={styles.reviewPreviewArtist}>{artist}</Text>
            <Text style={styles.reviewPreviewSub}>{festival}</Text>
            <Text style={styles.reviewPreviewSub}>{location} · {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            {videoDuration != null && (
              <Text style={styles.reviewPreviewDuration}>{videoDuration}s</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.form}>
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What was the moment? The drop? The feeling?"
          placeholderTextColor="#444"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
        {/* Hashtag hint */}
        <Text style={styles.hashtagHint}>
          💡 Tip: Add #hashtags to help people find your clip
        </Text>
        {/* Live hashtag preview */}
        {description.includes('#') && (
          <View style={styles.hashtagPreview}>
            <Text style={styles.hashtagPreviewLabel}>Preview:</Text>
            <Text>
              {splitByHashtags(description).map((segment, i) =>
                segment.startsWith('#') ? (
                  <Text key={i} style={styles.hashtagPreviewTag}>{segment}</Text>
                ) : (
                  <Text key={i} style={styles.hashtagPreviewText}>{segment}</Text>
                )
              )}
            </Text>
          </View>
        )}

        {/* Track ID optional pre-fill */}
        <Text style={styles.trackIdSectionLabel}>Know the track? Add it.</Text>
        <TextInput
          style={styles.input}
          placeholder="Track ID (optional)"
          placeholderTextColor="#444"
          value={trackName}
          onChangeText={setTrackName}
        />
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          placeholder="Artist (optional)"
          placeholderTextColor="#444"
          value={trackArtist}
          onChangeText={setTrackArtist}
        />

        {/* ToS reminder */}
        <Text style={styles.tosNote}>
          By uploading, you confirm you personally filmed this footage and accept our{' '}
          <Text style={styles.tosLink}>Terms of Service</Text>.
          Clips containing copyrighted audio may be flagged or removed.
        </Text>

        {/* Upload progress bar */}
        {uploadStatus !== 'idle' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                {uploadStatus === 'uploading' ? `Uploading... ${uploadProgress}%`
                  : uploadStatus === 'processing' ? 'Processing...'
                  : uploadStatus === 'done' ? '✅ Upload complete!'
                  : '❌ Upload failed'}
              </Text>
              {uploadStatus === 'uploading' && (
                <TouchableOpacity onPress={handleCancelUpload} activeOpacity={0.8}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: `${uploadStatus === 'processing' ? 100 : uploadProgress}%` as any },
                  uploadStatus === 'processing' && styles.progressFillProcessing,
                  uploadStatus === 'done' && styles.progressFillDone,
                  uploadStatus === 'error' && styles.progressFillError,
                ]}
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (atEventLimit || videoTooLong || uploading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.submitText}>
                {'  '}{uploadStatus === 'processing' ? 'Processing...' : `Uploading... ${uploadProgress}%`}
              </Text>
            </View>
          ) : (
            <Text style={styles.submitText}>
              {atEventLimit ? '🚫  Event limit reached' : videoTooLong ? '⚠️  Clip too long' : '🙌  Upload & share'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setStep(1)}
          activeOpacity={0.8}
          disabled={uploading}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // ── Show trimmer screen ───────────────────────────────────
  if (showTrimmer && videoUri) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderTrimmer()}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Capture the moment</Text>
          <Text style={styles.subtitle}>
            Tag it so fans can find it. Your clip could be the best one there.
          </Text>
        </View>

        {renderStepIndicator()}

        {/* Trim applied badge */}
        {trimApplied && (
          <View style={styles.trimAppliedBadge}>
            <Text style={styles.trimAppliedText}>
              ✂️ Trim applied · {formatMs(trimStartMs)} → {formatMs(trimEndMs)} ({trimDurationSecs}s)
            </Text>
            <TouchableOpacity onPress={() => setShowTrimmer(true)}>
              <Text style={styles.trimEditLink}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 1 ? renderStep1() : renderStep2()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 6, lineHeight: 20 },

  // Step indicator
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stepIndicatorText: { color: '#8B5CF6', fontSize: 13, fontWeight: '700' },
  stepDots: { flexDirection: 'row', gap: 6 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  stepDotActive: { backgroundColor: '#8B5CF6' },

  // Incentive banner
  incentiveBanner: {
    backgroundColor: '#1a0a2e',
    borderColor: '#8B5CF6',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'center' as const,
    marginBottom: 16,
  },
  incentiveBannerText: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '700' as const,
  },

  // Video picker
  videoPickerGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  videoPicker: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
  },
  videoPickerError: { borderColor: '#EF4444' },
  videoPickerIcon: { fontSize: 28, marginBottom: 6 },
  videoPickerText: { color: '#8B5CF6', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  videoPickerSub: { color: '#555', fontSize: 11, marginTop: 4, textAlign: 'center' },

  // Record button
  recordBtn: {
    flex: 1,
    backgroundColor: '#1a1228',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#6D28D9',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
  },
  recordBtnIcon: { fontSize: 28, marginBottom: 6 },
  recordBtnText: { color: '#a78bfa', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // Hashtag hint and preview
  hashtagHint: {
    fontSize: 12,
    color: '#8B5CF6',
    marginTop: 4,
    marginBottom: 4,
    fontWeight: '500',
  },
  hashtagPreview: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#222',
  },
  hashtagPreviewLabel: {
    fontSize: 10,
    color: '#444',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  hashtagPreviewTag: { color: '#8B5CF6', fontWeight: '600', fontSize: 14 },
  hashtagPreviewText: { color: '#aaa', fontSize: 14 },

  // Video preview (step 1)
  videoPreviewContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#111',
    position: 'relative',
  },
  videoPreview: {
    width: '100%',
    height: 200,
  },
  videoPreviewOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  changeVideoBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  changeVideoBtnText: { color: '#8B5CF6', fontSize: 13, fontWeight: '600' },

  // Review thumbnail (step 2)
  reviewPreviewContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#111',
    flexDirection: 'row',
  },
  reviewThumbnail: {
    width: 110,
    height: 90,
  },
  reviewPreviewMeta: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 3,
  },
  reviewPreviewArtist: { color: '#fff', fontWeight: '800', fontSize: 15 },
  reviewPreviewSub: { color: '#8B5CF6', fontSize: 12 },
  reviewPreviewDuration: { color: '#555', fontSize: 11, marginTop: 2 },

  // Cover image picker
  coverWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  changeCoverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  changeCoverText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  durationBadge: {
    backgroundColor: '#1a3a1a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2d5a2d',
  },
  durationBadgeError: {
    backgroundColor: '#2a1010',
    borderColor: '#5a2d2d',
  },
  durationText: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  durationTextError: { color: '#EF4444' },

  // Date picker
  datePickerBtn: {
    backgroundColor: '#161616',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    marginBottom: 4,
  },
  datePickerBtnText: { color: '#fff', fontSize: 15 },
  datePicker: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 8,
  },

  form: { gap: 8 },
  label: { color: '#aaa', fontSize: 13, fontWeight: '600', marginTop: 8 },
  input: {
    backgroundColor: '#161616',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 4,
  },
  textArea: { height: 100, textAlignVertical: 'top' },

  // Quick mode toggle
  quickModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1228',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#8B5CF633',
  },
  quickModeLeft: { flex: 1 },
  quickModeLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  quickModeSub: { color: '#666', fontSize: 11, marginTop: 2 },
  quickModeAutoNote: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  quickModeAutoNoteText: { color: '#555', fontSize: 11 },

  // Auto-filled label row
  autoFillLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  autoFilledTag: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 1,
  },

  // Pre-fill hint
  prefillHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  prefillHintText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  prefillHintDismiss: {
    color: '#555',
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 20,
    paddingHorizontal: 4,
  },

  // Per-event limit bar
  eventLimitBar: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  eventLimitBarFull: { borderColor: '#EF444433', backgroundColor: '#1a0808' },
  eventLimitLeft: { marginBottom: 8 },
  eventLimitLabel: { color: '#aaa', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  eventLimitCount: { color: '#555', fontSize: 11 },
  eventLimitFull: { color: '#EF4444', fontSize: 11 },
  eventLimitDots: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2a2a2a' },
  dotFilled: { backgroundColor: '#8B5CF6' },

  // Progress bar
  progressContainer: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  cancelText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#222',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  progressFillProcessing: {
    backgroundColor: '#FBBF24',
  },
  progressFillDone: {
    backgroundColor: '#10B981',
  },
  progressFillError: {
    backgroundColor: '#EF4444',
  },

  // ToS
  tosNote: {
    fontSize: 11,
    color: '#444',
    lineHeight: 17,
    marginTop: 8,
    marginBottom: 4,
  },
  tosLink: { color: '#8B5CF6' },
  trackIdSectionLabel: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },

  // Buttons
  submitBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnDisabled: { backgroundColor: '#2a2a2a' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  uploadingRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  backBtnText: { color: '#666', fontSize: 15, fontWeight: '600' },

  // Trimmer
  trimVideoContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  trimVideo: { width: '100%', height: '100%' },
  trimRangeRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  trimRangeText: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: '700',
  },
  trimDurationBadge: {
    color: '#a78bfa',
    fontSize: 15,
    fontWeight: '600',
  },
  trimSliderLabel: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 4,
  },
  trimSlider: {
    width: '100%',
    height: 40,
    marginBottom: 4,
  },
  trimWarning: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
  },
  trimOk: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
  },
  trimNote: {
    fontSize: 11,
    color: '#555',
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  trimButtons: {
    gap: 10,
    marginBottom: 12,
  },
  trimPreviewBtn: {
    backgroundColor: '#1a1228',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  trimPreviewBtnText: {
    color: '#8B5CF6',
    fontSize: 15,
    fontWeight: '700',
  },
  trimUseBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  trimUseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  trimAppliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1228',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#8B5CF633',
  },
  trimAppliedText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  trimEditLink: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 10,
  },

  // Success
  successContainer: {
    backgroundColor: '#000000',
    alignItems: 'center',
    padding: 40,
    paddingTop: 80,
    paddingBottom: 60,
  },
  successEmoji: { fontSize: 72, marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center' },
  successSub: {
    fontSize: 15, color: '#8B5CF6', marginTop: 10,
    textAlign: 'center', lineHeight: 22,
  },
  successNote: {
    fontSize: 14, color: '#555', marginTop: 16,
    textAlign: 'center', lineHeight: 20,
  },
  rankingCard: {
    marginTop: 24,
    width: '100%',
    backgroundColor: '#0d0d1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#4C1D95',
    alignItems: 'center',
  },
  rankingCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  rankingStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  rankingStatValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#8B5CF6',
  },
  rankingStatLabel: {
    fontSize: 14,
    color: '#A78BFA',
    fontWeight: '600',
  },
  rankingMessage: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 20,
  },
  shareBtn: {
    marginTop: 16,
    width: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  remainingBadge: {
    marginTop: 16, backgroundColor: '#1a1228',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: '#8B5CF633',
  },
  remainingText: { color: '#8B5CF6', fontSize: 12, fontWeight: '600' },
  uploadAnother: {
    marginTop: 24, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#8B5CF6',
  },
  uploadAnotherText: { color: '#8B5CF6', fontWeight: '600', fontSize: 15 },

  // Post everywhere card
  postEverywhereCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 20,
    marginTop: 16,
    gap: 12,
    width: '100%',
  },
  postEverywhereTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  postEverywhereSub: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
  },
  postEverywhereButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  postBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  postBtnIG: {
    borderColor: '#E1306C33',
    backgroundColor: '#1a0a14',
  },
  postBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  postEverywhereNote: {
    fontSize: 12,
    color: '#444',
    textAlign: 'center',
  },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ActionSheetIOS,
  Linking,
  Animated,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import { FestivalEvent, SetTime } from '../data/eventsData';
import { Clip, Event as SupabaseEvent } from '../types';
import { getClipsByEvent, recordDownload } from '../services/clips';
import { getEventMemberCount } from '../services/events';
import { supabase } from '../services/supabase';
import { markAttended, unmarkAttended, hasAttended, getAttendeeCount } from '../services/attendance';
import * as Haptics from 'expo-haptics';
import { SkeletonCard } from '../components/SkeletonCard';
import {
  addSetAlert,
  removeSetAlert,
  hasSetAlert,
  getSetAlertMinutes,
} from '../services/setAlerts';
import { getEventLineup, LineupEntry } from '../services/lineups';
import { isModerator } from '../services/moderator';
import {
  getEventDiscussions,
  postEventDiscussion,
  getDiscussionReplies,
  EventDiscussion,
} from '../services/discussions';

// ── Constants ──────────────────────────────────────────────
const DOWNLOAD_ALL_CAP = 10;

// ── Compatibility shim ─────────────────────────────────────
// Normalise either a FestivalEvent (local) or a Supabase Event into the
// FestivalEvent shape that the rest of this screen uses.
function normaliseEvent(raw: FestivalEvent | SupabaseEvent): FestivalEvent {
  // If it already has the FestivalEvent shape (has `dates` or `genre` array), pass through
  if ('dates' in raw || ('genre' in raw && Array.isArray((raw as any).genre))) {
    return raw as FestivalEvent;
  }
  // Otherwise it's a Supabase Event — map to FestivalEvent
  const e = raw as SupabaseEvent;
  const start = e.start_date ?? '';
  const end = e.end_date ?? '';
  const dates = start && end ? `${start} – ${end}` : start;
  return {
    id: e.id,
    name: e.name,
    location: e.city ?? e.location ?? '',
    country: e.country ?? '',
    dates,
    description: e.description ?? '',
    genre: Array.isArray(e.genre_tags) ? e.genre_tags : [],
    clipCount: e.clip_count ?? 0,
    attendees: e.attendee_estimate ?? '',
    image: e.image_url ?? '',
    upcoming: (e as any).is_upcoming ?? false,
    is_partner: e.is_partner,
    is_private: e.is_private,
    invite_code: e.invite_code,
    created_by: e.created_by,
    // lat/lng not on Supabase Event yet — leave undefined
    lat: undefined,
    lng: undefined,
    lineup: undefined,
  };
}

export default function EventDetailScreen({ route, navigation }: any) {
  const rawEvent: FestivalEvent | SupabaseEvent = route.params?.event;
  const event: FestivalEvent = normaliseEvent(rawEvent);
  const [activeTab, setActiveTab] = useState<'clips' | 'lineup' | 'info' | 'about' | 'discussion'>('clips');

  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [weather, setWeather] = useState<string | null>(null);
  const [attended, setAttended] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Lineup tab state
  const [activeLineupStage, setActiveLineupStage] = useState<string | null>(null);
  // Map of "eventId_artist" -> minutesBefore (null = no alert)
  const [alertMap, setAlertMap] = useState<Record<string, number | null>>({});
  // Supabase lineup
  const [supabaseLineup, setSupabaseLineup] = useState<LineupEntry[]>([]);
  const [lineupLoading, setLineupLoading] = useState(false);
  // Mod state
  const [isMod, setIsMod] = useState(false);

  // Discussion state
  const [eventDiscussions, setEventDiscussions] = useState<EventDiscussion[]>([]);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [newDiscPost, setNewDiscPost] = useState('');
  const [discPosting, setDiscPosting] = useState(false);
  const [discUsername, setDiscUsername] = useState('user');
  const [expandedDiscPost, setExpandedDiscPost] = useState<string | null>(null);
  const [discReplies, setDiscReplies] = useState<Record<string, EventDiscussion[]>>({});
  const [discReplyText, setDiscReplyText] = useState<Record<string, string>>({});
  const [discReplyPosting, setDiscReplyPosting] = useState<Record<string, boolean>>({});

  // Pulsing green dot for "live now"
  const greenPulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing red dot animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Pulsing green dot animation (live now in lineup)
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(greenPulseAnim, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(greenPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [greenPulseAnim]);

  const loadClips = useCallback(async () => {
    try {
      setError(null);
      const data = await getClipsByEvent(event.id);
      setClips(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load clips');
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  // Fetch weather on info tab
  const loadWeather = useCallback(async () => {
    if (weather !== null) return; // already loaded
    setWeatherLoading(true);
    try {
      const city = (event.location ?? '').split(',')[0].trim();
      if (!city) return;
      const resp = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=3`);
      const text = await resp.text();
      setWeather(text.trim());
    } catch {
      setWeather('Weather unavailable');
    } finally {
      setWeatherLoading(false);
    }
  }, [event.location, weather]);

  useEffect(() => {
    loadClips();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
    if (event.is_private) {
      getEventMemberCount(event.id).then(setMemberCount).catch(() => {});
    }
    // Load attendance state
    Promise.all([
      hasAttended(event.id).catch(() => false),
      getAttendeeCount(event.id).catch(() => 0),
    ]).then(([attendedState, count]) => {
      setAttended(attendedState);
      setAttendeeCount(count);
    });
    // Load mod state
    isModerator().then(setIsMod).catch(() => {});
    // Load current user's username for discussions
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.username) setDiscUsername(profile.username);
      } catch {}
    })();
  }, [loadClips, event.id, event.is_private]);

  const eventIdStr = String(event.id);

  const loadEventDiscussions = useCallback(async () => {
    setDiscussionLoading(true);
    try {
      const data = await getEventDiscussions(eventIdStr);
      setEventDiscussions(data);
    } catch {}
    finally { setDiscussionLoading(false); }
  }, [eventIdStr]);

  useEffect(() => {
    if (activeTab === 'discussion') loadEventDiscussions();
  }, [activeTab, loadEventDiscussions]);

  const handlePostEventDiscussion = async () => {
    if (!newDiscPost.trim()) return;
    setDiscPosting(true);
    try {
      const post = await postEventDiscussion({
        event_id: eventIdStr,
        body: newDiscPost.trim(),
        username: discUsername,
      });
      setEventDiscussions((prev) => [post, ...prev]);
      setNewDiscPost('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not post.');
    } finally {
      setDiscPosting(false);
    }
  };

  const handleToggleDiscReplies = async (postId: string) => {
    if (expandedDiscPost === postId) {
      setExpandedDiscPost(null);
      return;
    }
    setExpandedDiscPost(postId);
    if (!discReplies[postId]) {
      try {
        const data = await getDiscussionReplies(postId);
        // getDiscussionReplies returns ArtistDiscussion, we cast here since shape is identical
        setDiscReplies((prev) => ({ ...prev, [postId]: data as unknown as EventDiscussion[] }));
      } catch {}
    }
  };

  const handlePostDiscReply = async (parentId: string) => {
    const text = discReplyText[parentId]?.trim();
    if (!text) return;
    setDiscReplyPosting((prev) => ({ ...prev, [parentId]: true }));
    try {
      const reply = await postEventDiscussion({
        event_id: eventIdStr,
        body: text,
        username: discUsername,
        parent_id: parentId,
      });
      setDiscReplies((prev) => ({ ...prev, [parentId]: [...(prev[parentId] ?? []), reply] }));
      setDiscReplyText((prev) => ({ ...prev, [parentId]: '' }));
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not post reply.');
    } finally {
      setDiscReplyPosting((prev) => ({ ...prev, [parentId]: false }));
    }
  };

  const handleAttendanceToggle = async () => {
    setAttendanceLoading(true);
    const nowAttended = !attended;
    setAttended(nowAttended);
    setAttendeeCount((prev) => nowAttended ? prev + 1 : Math.max(0, prev - 1));
    try {
      if (nowAttended) {
        await markAttended(event.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await unmarkAttended(event.id);
      }
    } catch {
      setAttended(!nowAttended);
      setAttendeeCount((prev) => nowAttended ? Math.max(0, prev - 1) : prev + 1);
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'info') {
      loadWeather();
    }
  }, [activeTab, loadWeather]);

  // Load alert states whenever lineup tab opens
  useEffect(() => {
    if (activeTab !== 'lineup') return;
    if (!event.lineup || event.lineup.length === 0) return;
    const loadAlerts = async () => {
      const newMap: Record<string, number | null> = {};
      for (const set of event.lineup!) {
        const mins = await getSetAlertMinutes(event.id, set.artist);
        newMap[`${event.id}_${set.artist}`] = mins;
      }
      setAlertMap(newMap);
    };
    loadAlerts();
  }, [activeTab, event.id, event.lineup]);

  // Load Supabase lineup when lineup tab opens
  useEffect(() => {
    if (activeTab !== 'lineup') return;
    setLineupLoading(true);
    getEventLineup(event.id)
      .then(setSupabaseLineup)
      .catch(() => {})
      .finally(() => setLineupLoading(false));
  }, [activeTab, event.id]);

  // Initialise the first stage when lineup available
  useEffect(() => {
    if (event.lineup && event.lineup.length > 0 && activeLineupStage === null) {
      const firstStage = event.lineup[0].stage;
      setActiveLineupStage(firstStage);
    }
  }, [event.lineup, activeLineupStage]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClips();
    setRefreshing(false);
  };

  // ── Festival Crew: top-3 uploaders ─────────────────────
  const festivalCrew = useMemo(() => {
    if (clips.length === 0) return [];
    const counts: Record<string, { uploader_id: string; username: string; count: number }> = {};
    for (const clip of clips) {
      if (!clip.uploader_id) continue;
      const uid = clip.uploader_id;
      if (!counts[uid]) {
        counts[uid] = {
          uploader_id: uid,
          username: clip.uploader?.username ?? uid.slice(0, 8),
          count: 0,
        };
      }
      counts[uid].count += 1;
    }
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [clips]);

  // ── Live right now: clips uploaded in last 24h ──────────
  const liveClips = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return clips.filter((c) => new Date(c.created_at).getTime() > cutoff);
  }, [clips]);

  // ── Activity counter: clips uploaded in last 1 hour ─────
  const recentHourCount = useMemo(() => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    return clips.filter((c) => new Date(c.created_at).getTime() > cutoff).length;
  }, [clips]);

  // ── Lineup helpers ───────────────────────────────────────
  const lineupStages = useMemo(() => {
    if (!event.lineup) return [];
    return Array.from(new Set(event.lineup.map((s) => s.stage)));
  }, [event.lineup]);

  const lineupForStage = useMemo(() => {
    if (!event.lineup || !activeLineupStage) return [];
    return event.lineup
      .filter((s) => s.stage === activeLineupStage)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [event.lineup, activeLineupStage]);

  const getSetStatus = (set: SetTime): 'past' | 'live' | 'soon' | 'upcoming' => {
    const now = Date.now();
    const start = new Date(set.startTime).getTime();
    const end = new Date(set.endTime).getTime();
    if (now >= start && now <= end) return 'live';
    if (now > end) return 'past';
    if (start - now <= 2 * 60 * 60 * 1000) return 'soon';
    return 'upcoming';
  };

  const formatSetTime = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')}${ampm}`;
  };

  const alertKey = (artist: string) => `${event.id}_${artist}`;

  const handleSetAlertPress = (set: SetTime) => {
    const key = alertKey(set.artist);
    const currentMins = alertMap[key] ?? null;
    const hasAlert = currentMins !== null;

    const options = [
      'Notify me 5 min before',
      'Notify me 15 min before',
      'Notify me 30 min before',
      ...(hasAlert ? ['Remove alert'] : []),
      'Cancel',
    ];

    const handleSelection = async (index: number) => {
      if (options[index] === 'Cancel') return;
      if (options[index] === 'Remove alert') {
        await removeSetAlert(event.id, set.artist);
        setAlertMap((prev) => ({ ...prev, [key]: null }));
        return;
      }
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Notifications blocked', 'Enable notifications in Settings to get set alerts.');
        return;
      }
      const mins = index === 0 ? 5 : index === 1 ? 15 : 30;
      await addSetAlert(event.id, set, mins);
      setAlertMap((prev) => ({ ...prev, [key]: mins }));
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: hasAlert ? options.length - 2 : undefined,
          title: `🔔 Alert for ${set.artist}`,
        },
        (idx) => { handleSelection(idx); },
      );
    } else {
      const alertOptions = options
        .filter((o) => o !== 'Cancel')
        .map((o, i) => ({
          text: o,
          style: (o === 'Remove alert' ? 'destructive' : 'default') as 'destructive' | 'default',
          onPress: () => { handleSelection(i); },
        }));
      alertOptions.push({ text: 'Cancel', style: 'default', onPress: () => {} });
      Alert.alert(`🔔 ${set.artist}`, 'Set alert options', alertOptions);
    }
  };

  const handleSetAlertsForAll = async () => {
    if (!event.lineup) return;
    const now = new Date();
    const upcomingSets = event.lineup.filter((s) => new Date(s.startTime) > now);
    if (upcomingSets.length === 0) {
      Alert.alert('No upcoming sets', 'All sets have already started or ended.');
      return;
    }

    const options = ['5 min before', '15 min before', '30 min before', 'Cancel'];

    const applyAll = async (mins: number) => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Notifications blocked', 'Enable notifications in Settings to get set alerts.');
        return;
      }
      const newMap = { ...alertMap };
      for (const set of upcomingSets) {
        await addSetAlert(event.id, set, mins);
        newMap[alertKey(set.artist)] = mins;
      }
      setAlertMap(newMap);
      Alert.alert('✅ Alerts set', `You'll be notified ${mins} min before all ${upcomingSets.length} upcoming sets.`);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3, title: '🔔 Alert for all upcoming sets' },
        (idx) => {
          if (idx === 3) return;
          const mins = [5, 15, 30][idx];
          applyAll(mins);
        },
      );
    } else {
      Alert.alert('🔔 Alert all upcoming sets', 'Notify how many minutes before?', [
        { text: '5 min', onPress: () => applyAll(5) },
        { text: '15 min', onPress: () => applyAll(15) },
        { text: '30 min', onPress: () => applyAll(30) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  // ── Top sets: artists ranked by clip count ───────────────
  const topSets = useMemo(() => {
    if (clips.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const clip of clips) {
      if (!clip.artist) continue;
      counts[clip.artist] = (counts[clip.artist] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([artist, count]) => ({ artist, count }));
  }, [clips]);

  // ── Event Stats aggregation ──────────────────────────────
  const eventStats = useMemo(() => {
    if (clips.length === 0) return null;
    const totalViews = clips.reduce((sum, c) => sum + (c.view_count ?? 0), 0);
    const totalDownloads = clips.reduce((sum, c) => sum + (c.download_count ?? 0), 0);
    // Most uploaded artist
    const artistCounts: Record<string, number> = {};
    for (const clip of clips) {
      if (!clip.artist) continue;
      artistCounts[clip.artist] = (artistCounts[clip.artist] ?? 0) + 1;
    }
    const topArtist = Object.entries(artistCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—';
    // Top uploader
    const uploaderCounts: Record<string, { username: string; count: number }> = {};
    for (const clip of clips) {
      if (!clip.uploader_id) continue;
      const uid = clip.uploader_id;
      if (!uploaderCounts[uid]) {
        uploaderCounts[uid] = { username: clip.uploader?.username ?? uid.slice(0, 8), count: 0 };
      }
      uploaderCounts[uid].count += 1;
    }
    const topUploader = Object.values(uploaderCounts).sort((a, b) => b.count - a.count)[0]?.username ?? '—';
    return { totalViews, totalDownloads, topArtist, topUploader };
  }, [clips]);

  // ── Download All (capped at DOWNLOAD_ALL_CAP) ──────────
  const handleDownloadAll = () => {
    if (clips.length === 0) return;
    const sorted = [...clips].sort((a, b) => (b.download_count ?? 0) - (a.download_count ?? 0));
    const batch = sorted.slice(0, DOWNLOAD_ALL_CAP);
    const cappedToTen = clips.length > DOWNLOAD_ALL_CAP;
    const confirmMsg = cappedToTen
      ? `Download the top ${DOWNLOAD_ALL_CAP} clips from ${event.name}? (sorted by popularity)`
      : `Download all ${clips.length} clip${clips.length !== 1 ? 's' : ''} from ${event.name}?`;
    Alert.alert(
      cappedToTen ? `Download Top ${DOWNLOAD_ALL_CAP}` : `Download All (${clips.length})`,
      confirmMsg,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            setDownloading(true);
            try {
              for (let i = 0; i < batch.length; i++) {
                const clip = batch[i];
                setDownloadProgress(`Downloading ${i + 1} of ${batch.length}…`);
                await recordDownload(clip.id).catch(() => {});
                if (clip.video_url) {
                  await Linking.openURL(clip.video_url).catch(() => {});
                }
              }
              const completionMsg = cappedToTen
                ? `Downloaded top ${DOWNLOAD_ALL_CAP} clips from ${event.name}. Visit each clip to download more.`
                : `All ${batch.length} clips saved! Check your downloads.`;
              Alert.alert('Done! 🙌', completionMsg);
            } catch {
              Alert.alert('Error', 'Some clips could not be downloaded.');
            } finally {
              setDownloading(false);
              setDownloadProgress(null);
            }
          },
        },
      ]
    );
  };

  const handleGetDirections = () => {
    const address = `${event.location}, ${event.country}`;
    const encoded = encodeURIComponent(address);
    const url =
      `maps://maps.apple.com/?q=${encoded}` ||
      `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    Linking.openURL(`maps://maps.apple.com/?q=${encoded}`).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`).catch(() => {});
    });
  };

  const goToClip = (video: Clip) => navigation.navigate('VerticalFeed', { initialClip: video, clips });

  const renderClipCard = (video: Clip) => (
    <TouchableOpacity
      key={video.id}
      style={styles.clipCard}
      onPress={() => goToClip(video)}
      activeOpacity={0.85}
    >
      {video.thumbnail_url ? (
        <Image source={{ uri: video.thumbnail_url }} style={styles.clipThumb} />
      ) : (
        <View style={[styles.clipThumb, styles.clipThumbPlaceholder]}>
          <Ionicons name="musical-notes-outline" size={24} color="#333" />
        </View>
      )}
      <View style={styles.clipInfo}>
        <Text style={styles.clipArtist}>{video.artist}</Text>
        <Text style={styles.clipMeta}>{video.location} · {video.clip_date}</Text>
        {video.description ? (
          <Text style={styles.clipDesc} numberOfLines={2}>{video.description}</Text>
        ) : null}
        <View style={styles.clipStats}>
          <Text style={styles.clipStat}>▶ {(video.view_count ?? 0).toLocaleString()}</Text>
          <Text style={styles.clipStat}>⬇ {(video.download_count ?? 0).toLocaleString()}</Text>
          {video.duration_seconds != null && (
            <Text style={styles.clipStat}>⏱ {video.duration_seconds}s</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Map coordinates
  const mapCoord = event.lat != null && event.lng != null
    ? { latitude: event.lat, longitude: event.lng }
    : null;

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
        {/* Hero image */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: event.image }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          {event.upcoming && (
            <View style={styles.upcomingBadge}>
              <Text style={styles.upcomingText}>UPCOMING</Text>
            </View>
          )}
          {(event as any).isPartner && (
            <View style={styles.partnerBadge}>
              <Text style={styles.partnerText}>✓ Partner</Text>
            </View>
          )}
          <View style={styles.heroContent}>
            <Text style={styles.heroName}>{event.name}</Text>
            <Text style={styles.heroMeta}>📍 {event.location ?? ''}{event.country ? `, ${event.country}` : ''}  ·  📅 {event.dates ?? ''}</Text>
            <TouchableOpacity
              style={[styles.attendBtn, attended && styles.attendBtnActive]}
              onPress={handleAttendanceToggle}
              disabled={attendanceLoading}
              activeOpacity={0.85}
            >
              {attendanceLoading ? (
                <ActivityIndicator size="small" color={attended ? '#fff' : '#8B5CF6'} />
              ) : (
                <>
                  <Text style={styles.attendBtnEmoji}>{attended ? '✅' : '🙋'}</Text>
                  <Text style={[styles.attendBtnText, attended && styles.attendBtnTextActive]}>
                    {attended ? 'I Was There!' : 'I Was There'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {attendeeCount > 0 && (
              <Text style={styles.attendeeCount}>{attendeeCount.toLocaleString()} attended</Text>
            )}
            <TouchableOpacity
              style={styles.crewBtn}
              onPress={() => navigation.navigate('CrewFinder', { eventId: event.id, eventName: event.name })}
              activeOpacity={0.85}
            >
              <Ionicons name="people-outline" size={16} color="#fff" />
              <Text style={styles.crewBtnText}>🤝 Find Crew</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Private Event Banner (shown to creator) */}
        {event.is_private && event.created_by === currentUserId && (
          <View style={styles.privateBanner}>
            <Text style={styles.privateBannerTitle}>🔒 Private Event</Text>
            <Text style={styles.privateBannerLabel}>Invite Code</Text>
            <TouchableOpacity
              style={styles.inviteCodeRow}
              onPress={() => {
                if (event.invite_code) {
                  Clipboard.setStringAsync(event.invite_code);
                  Alert.alert('Copied!', 'Invite code copied to clipboard.');
                }
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.inviteCodeText}>{event.invite_code ?? '—'}</Text>
              <Ionicons name="copy-outline" size={16} color="#8B5CF6" />
            </TouchableOpacity>
            {memberCount !== null && (
              <Text style={styles.memberCountText}>👥 {memberCount} member{memberCount !== 1 ? 's' : ''}</Text>
            )}
          </View>
        )}

        {/* Partner banner */}
        {event.is_partner && (
          <LinearGradient
            colors={['#3B0764', '#4C1D95', '#1E0B36']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.partnerBannerGradient}
          >
            <Text style={styles.partnerBannerText}>🤝 Official Festival Partner</Text>
            <TouchableOpacity
              style={styles.mediaAccessBtn}
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert(
                  'Media Access',
                  'Feature coming soon for festival partners. Stay tuned!',
                  [{ text: 'OK' }]
                )
              }
            >
              <Text style={styles.mediaAccessBtnText}>Request Media Access</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {loading ? '—' : clips.length > 0 ? clips.length : event.clipCount}
            </Text>
            <Text style={styles.statLabel}>Clips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{event.attendees}</Text>
            <Text style={styles.statLabel}>Attendees</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{event.genre.length}</Text>
            <Text style={styles.statLabel}>Genres</Text>
          </View>
        </View>

        {/* Find Your Crew */}
        <TouchableOpacity
          style={styles.findCrewBtn}
          onPress={() => navigation.navigate('FindYourCrew', {
            eventId: event.id,
            eventName: event.name,
          })}
          activeOpacity={0.85}
        >
          <Text style={styles.findCrewBtnEmoji}>🤝</Text>
          <View style={styles.findCrewBtnInfo}>
            <Text style={styles.findCrewBtnTitle}>Find Your Crew</Text>
            <Text style={styles.findCrewBtnSub}>Connect with solo attendees</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8B5CF6" />
        </TouchableOpacity>

        {/* Download All button */}
        {!loading && clips.length > 0 && (
          <View style={styles.downloadAllWrap}>
            {downloadProgress ? (
              <View style={styles.downloadProgressRow}>
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text style={styles.downloadProgressText}>{downloadProgress}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.downloadAllBtn, downloading && styles.downloadAllBtnDisabled]}
                onPress={handleDownloadAll}
                disabled={downloading}
                activeOpacity={0.85}
              >
                <Ionicons name="download-outline" size={16} color="#fff" />
                <Text style={styles.downloadAllBtnText}>
                  {clips.length > DOWNLOAD_ALL_CAP
                    ? `⬇ Download Top ${DOWNLOAD_ALL_CAP}`
                    : `⬇ Download All (${clips.length})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Genre tags */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreRow}
        >
          {event.genre.map((g) => (
            <View key={g} style={styles.genreChip}>
              <Text style={styles.genreText}>{g}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Tab toggle */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'clips' && styles.tabActive]}
            onPress={() => setActiveTab('clips')}
          >
            <Text style={[styles.tabText, activeTab === 'clips' && styles.tabTextActive]}>
              🎥 Clips
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'lineup' && styles.tabActive]}
            onPress={() => setActiveTab('lineup')}
          >
            <Text style={[styles.tabText, activeTab === 'lineup' && styles.tabTextActive]}>
              🎤 Lineup
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.tabActive]}
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
              ℹ️ Info
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.tabActive]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>
              🎪 About
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'discussion' && styles.tabActive]}
            onPress={() => setActiveTab('discussion')}
          >
            <Text style={[styles.tabText, activeTab === 'discussion' && styles.tabTextActive]}>
              💬 Chat
            </Text>
          </TouchableOpacity>
        </View>

        {/* ══════════════ CLIPS TAB ══════════════ */}
        {activeTab === 'clips' && (
          <View style={styles.clipsSection}>
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : error ? (
              <View style={styles.empty}>
                <Ionicons name="warning-outline" size={32} color="#555" />
                <Text style={styles.emptyTitle}>Failed to load clips</Text>
                <Text style={styles.emptyBody}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadClips}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : clips.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🎪</Text>
                <Text style={styles.emptyTitle}>No clips yet</Text>
                <Text style={styles.emptyBody}>
                  Be the first to upload footage from {event.name}!
                </Text>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => navigation.navigate('Upload')}
                >
                  <Text style={styles.uploadBtnText}>🙌 Upload a clip</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* 📤 Live activity counter */}
                <View style={styles.activityCounter}>
                  {recentHourCount === 0 ? (
                    <Text style={styles.activityCounterText}>Be the first to upload today</Text>
                  ) : recentHourCount > 10 ? (
                    <Text style={styles.activityCounterTextHot}>🔥 {recentHourCount} clips uploaded in the last hour</Text>
                  ) : (
                    <Text style={styles.activityCounterText}>📤 {recentHourCount} clip{recentHourCount !== 1 ? 's' : ''} uploaded in the last hour</Text>
                  )}
                </View>

                {/* 🔥 Live right now */}
                <View style={styles.liveSection}>
                  {liveClips.length > 0 ? (
                    <>
                      <View style={styles.liveTitleRow}>
                        <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
                        <Text style={styles.liveTitle}>🔥 Live right now</Text>
                        <Text style={styles.liveCount}>{liveClips.length} new</Text>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.liveScrollContent}
                      >
                        {liveClips.map((clip) => (
                          <TouchableOpacity
                            key={clip.id}
                            style={styles.liveCard}
                            onPress={() => goToClip(clip)}
                            activeOpacity={0.85}
                          >
                            {clip.thumbnail_url ? (
                              <Image source={{ uri: clip.thumbnail_url }} style={styles.liveThumb} />
                            ) : (
                              <View style={[styles.liveThumb, styles.liveThumbPlaceholder]}>
                                <Ionicons name="musical-notes" size={22} color="#555" />
                              </View>
                            )}
                            <View style={styles.liveCardOverlay}>
                              <Text style={styles.liveArtist} numberOfLines={1}>{clip.artist}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  ) : (
                    <View style={styles.liveEmpty}>
                      <Text style={styles.liveEmptyText}>Be the first to upload from this event today 📸</Text>
                    </View>
                  )}
                </View>

                {/* 🎤 Top sets at this event */}
                {topSets.length > 0 && (
                  <View style={styles.topSetsSection}>
                    <Text style={styles.topSetsTitle}>🎤 Top sets at this event</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.topSetsScrollContent}
                    >
                      {topSets.map(({ artist, count }) => (
                        <TouchableOpacity
                          key={artist}
                          style={styles.artistChip}
                          onPress={() => navigation.navigate('Artist', { artist })}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.artistChipName}>{artist}</Text>
                          <View style={styles.artistChipBadge}>
                            <Text style={styles.artistChipCount}>{count}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* ── Festival Crew ── */}
                {festivalCrew.length > 0 && (
                  <View style={styles.crewSection}>
                    <Text style={styles.crewTitle}>🏆 Festival Crew</Text>
                    <Text style={styles.crewSubtitle}>Top contributors to this event</Text>
                    <View style={styles.crewRow}>
                      {festivalCrew.map((member, index) => (
                        <TouchableOpacity
                          key={member.uploader_id}
                          style={styles.crewCard}
                          onPress={() =>
                            navigation.navigate('UserProfile', { username: member.username })
                          }
                          activeOpacity={0.8}
                        >
                          <View style={styles.crewRankBadge}>
                            <Text style={styles.crewRankText}>
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </Text>
                          </View>
                          <View style={styles.crewAvatar}>
                            <Text style={styles.crewAvatarText}>
                              {member.username.slice(0, 2).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.crewUsername} numberOfLines={1}>
                            @{member.username}
                          </Text>
                          <View style={styles.crewClipBadge}>
                            <Text style={styles.crewClipCount}>{member.count}</Text>
                            <Text style={styles.crewClipLabel}>clips</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* See all clips */}
                <TouchableOpacity
                  style={styles.seeAllBtn}
                  onPress={() => navigation.navigate('EventFeed', {
                    eventId: event.id,
                    festivalName: event.name,
                    eventName: event.name,
                  })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.seeAllText}>See all clips</Text>
                  <Ionicons name="chevron-forward" size={14} color="#8B5CF6" />
                </TouchableOpacity>

                {/* Clips list */}
                {clips.map(renderClipCard)}
              </>
            )}
          </View>
        )}

        {/* ══════════════ LINEUP TAB ══════════════ */}
        {activeTab === 'lineup' && (
          <View style={styles.lineupSection}>
            {/* Mod: Add Artists button */}
            {isMod && (
              <TouchableOpacity
                style={styles.addLineupBtn}
                onPress={() => navigation.navigate('LineupAdmin', { eventId: event.id, eventName: event.name })}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={16} color="#8B5CF6" />
                <Text style={styles.addLineupBtnText}>Add Artists to Lineup</Text>
              </TouchableOpacity>
            )}

            {/* Supabase lineup (if available) */}
            {supabaseLineup.length > 0 ? (
              <View style={styles.supabaseLineup}>
                {Array.from(new Set(supabaseLineup.map((e) => e.day_label ?? 'Lineup'))).map((day) => (
                  <View key={day} style={styles.lineupDay}>
                    <Text style={styles.lineupDayLabel}>{day}</Text>
                    {supabaseLineup
                      .filter((e) => (e.day_label ?? 'Lineup') === day)
                      .map((entry) => (
                        <TouchableOpacity
                          key={entry.id}
                          style={styles.lineupArtistRow}
                          onPress={() => navigation.navigate('Artist', { artist: entry.artist_name })}
                          activeOpacity={0.8}
                        >
                          <View style={styles.lineupArtistInfo}>
                            <Text style={styles.lineupArtistName}>{entry.artist_name}</Text>
                            {entry.stage && (
                              <Text style={styles.lineupStage}>{entry.stage}</Text>
                            )}
                          </View>
                          <View style={styles.lineupArtistRight}>
                            {entry.set_time && (
                              <Text style={styles.lineupTime}>
                                {new Date(entry.set_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </Text>
                            )}
                            <Ionicons name="chevron-forward" size={16} color="#555" />
                          </View>
                        </TouchableOpacity>
                      ))
                    }
                  </View>
                ))}
              </View>
            ) : lineupLoading ? (
              <ActivityIndicator color="#8B5CF6" style={{ marginTop: 40 }} />
            ) : !event.lineup || event.lineup.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🎵</Text>
                <Text style={styles.emptyTitle}>Lineup coming soon</Text>
                <Text style={styles.emptyBody}>
                  Set times will be published closer to the event.
                </Text>
              </View>
            ) : (
              <>
                {/* 🔔 Set alerts for all */}
                <TouchableOpacity
                  style={styles.alertAllBtn}
                  onPress={handleSetAlertsForAll}
                  activeOpacity={0.85}
                >
                  <Text style={styles.alertAllBtnText}>🔔 Set alerts for all upcoming sets</Text>
                </TouchableOpacity>

                {/* Stage pill tabs */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.stagePillsRow}
                >
                  {lineupStages.map((stage) => (
                    <TouchableOpacity
                      key={stage}
                      style={[
                        styles.stagePill,
                        activeLineupStage === stage && styles.stagePillActive,
                      ]}
                      onPress={() => setActiveLineupStage(stage)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.stagePillText,
                          activeLineupStage === stage && styles.stagePillTextActive,
                        ]}
                      >
                        {stage}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Set rows */}
                {lineupForStage.map((set) => {
                  const status = getSetStatus(set);
                  const key = alertKey(set.artist);
                  const alertMins = alertMap[key] ?? null;
                  const hasAl = alertMins !== null;

                  return (
                    <View
                      key={`${set.artist}-${set.startTime}`}
                      style={[
                        styles.setRow,
                        status === 'past' && styles.setRowPast,
                        status === 'live' && styles.setRowLive,
                      ]}
                    >
                      {/* Time column */}
                      <View style={styles.setTimeCol}>
                        <Text style={styles.setTimeText}>
                          {formatSetTime(set.startTime)}
                        </Text>
                        <Text style={styles.setTimeEndText}>
                          {formatSetTime(set.endTime)}
                        </Text>
                      </View>

                      {/* Artist info */}
                      <View style={styles.setArtistCol}>
                        <View style={styles.setArtistRow}>
                          {status === 'live' && (
                            <Animated.View
                              style={[
                                styles.liveGreenDot,
                                { transform: [{ scale: greenPulseAnim }] },
                              ]}
                            />
                          )}
                          <Text style={[styles.setArtistName, status === 'past' && styles.setArtistNameDim]}>
                            {set.artist}
                          </Text>
                        </View>
                        <View style={styles.setMetaRow}>
                          {status === 'live' && (
                            <View style={styles.liveNowBadge}>
                              <Text style={styles.liveNowText}>LIVE NOW</Text>
                            </View>
                          )}
                          {status === 'soon' && (
                            <View style={styles.comingUpBadge}>
                              <Text style={styles.comingUpText}>COMING UP</Text>
                            </View>
                          )}
                          {set.genre ? (
                            <View style={styles.genreChipSmall}>
                              <Text style={styles.genreChipSmallText}>{set.genre}</Text>
                            </View>
                          ) : null}
                        </View>
                        {hasAl && (
                          <Text style={styles.alertSetLabel}>⏰ {alertMins} min</Text>
                        )}
                      </View>

                      {/* Alert button */}
                      <TouchableOpacity
                        style={styles.setAlertBtn}
                        onPress={() => handleSetAlertPress(set)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={hasAl ? 'notifications' : 'notifications-outline'}
                          size={22}
                          color={hasAl ? '#8B5CF6' : '#444'}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}


        {/* ══════════════ INFO TAB ══════════════ */}
        {activeTab === 'info' && (
          <View style={styles.infoSection}>

            {/* Lineup */}
            <Text style={styles.infoLabel}>🎵 Lineup</Text>
            {event.genre && event.genre.length > 0 ? (
              <View style={styles.lineupPlaceholder}>
                <Ionicons name="people-outline" size={20} color="#8B5CF6" style={{ marginBottom: 6 }} />
                <Text style={styles.lineupPlaceholderTitle}>Lineup coming soon</Text>
                <Text style={styles.lineupPlaceholderBody}>
                  Festivals can add their lineup via the partner portal
                </Text>
              </View>
            ) : null}

            {/* Set Times */}
            <Text style={styles.infoLabel}>🕐 Set Times</Text>
            <View style={styles.placeholderCard}>
              <Ionicons name="time-outline" size={20} color="#8B5CF6" style={{ marginRight: 10 }} />
              <Text style={styles.placeholderCardText}>Set times will be added by the festival</Text>
            </View>

            {/* Map */}
            <Text style={styles.infoLabel}>🗺️ Venue</Text>
            {mapCoord ? (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.mapView}
                  pointerEvents="none"
                  initialRegion={{
                    latitude: mapCoord.latitude,
                    longitude: mapCoord.longitude,
                    latitudeDelta: 0.04,
                    longitudeDelta: 0.04,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                >
                  <Marker
                    coordinate={mapCoord}
                    title={event.name}
                  />
                </MapView>
                <View style={styles.mapLabel}>
                  <Text style={styles.mapLabelText}>📍 {event.location}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderCard}>
                <Ionicons name="location-outline" size={20} color="#8B5CF6" style={{ marginRight: 10 }} />
                <Text style={styles.placeholderCardText}>{event.location}, {event.country}</Text>
              </View>
            )}

            {/* Weather */}
            <Text style={styles.infoLabel}>🌤️ Weather on event day</Text>
            <View style={styles.weatherCard}>
              {weatherLoading ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <>
                  <Ionicons name="partly-sunny-outline" size={22} color="#8B5CF6" style={{ marginRight: 10 }} />
                  <Text style={styles.weatherText}>{weather ?? 'Loading weather…'}</Text>
                </>
              )}
            </View>

            {/* Getting there */}
            <Text style={styles.infoLabel}>🚌 Getting there</Text>
            <View style={styles.transportCard}>
              <Text style={styles.transportAddress}>📍 {event.location}, {event.country}</Text>
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={handleGetDirections}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.directionsBtnText}>Get Directions</Text>
              </TouchableOpacity>
            </View>

            {/* Partner link for non-partner events */}
            {!event.is_partner && (
              <TouchableOpacity
                style={styles.partnerLinkRow}
                onPress={() => navigation.navigate('Partnership')}
                activeOpacity={0.75}
              >
                <Text style={styles.partnerLinkText}>Is this your festival? Become a partner →</Text>
              </TouchableOpacity>
            )}

            {/* ── Event Stats ── */}
            <Text style={styles.infoLabel}>📊 Event Stats</Text>
            {loading ? (
              <ActivityIndicator size="small" color="#8B5CF6" style={{ marginVertical: 12 }} />
            ) : eventStats === null ? (
              <Text style={styles.infoBody}>No clip data yet</Text>
            ) : (
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>{clips.length}</Text>
                  <Text style={styles.statCardLabel}>Total Clips</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>{eventStats.totalDownloads.toLocaleString()}</Text>
                  <Text style={styles.statCardLabel}>Downloads</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>{eventStats.totalViews.toLocaleString()}</Text>
                  <Text style={styles.statCardLabel}>Total Views</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue} numberOfLines={1}>{eventStats.topArtist}</Text>
                  <Text style={styles.statCardLabel}>Top Artist</Text>
                </View>
                <View style={[styles.statCard, styles.statCardFull]}>
                  <Text style={styles.statCardValue}>@{eventStats.topUploader}</Text>
                  <Text style={styles.statCardLabel}>Top Uploader</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ══════════════ ABOUT TAB ══════════════ */}
        {activeTab === 'about' && (
          <View style={styles.aboutSection}>
            {event.is_partner && (
              <LinearGradient
                colors={['#3B0764', '#4C1D95']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.aboutPartnerBadge}
              >
                <Ionicons name="checkmark-circle" size={16} color="#C4B5FD" style={{ marginRight: 6 }} />
                <Text style={styles.aboutPartnerBadgeText}>Official Handsup Festival Partner</Text>
              </LinearGradient>
            )}

            <Text style={styles.infoLabel}>About</Text>
            <Text style={styles.infoBody}>{event.description}</Text>

            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoBody}>📍 {event.location}, {event.country}</Text>

            <Text style={styles.infoLabel}>Dates</Text>
            <Text style={styles.infoBody}>📅 {event.dates ?? ''}</Text>

            <Text style={styles.infoLabel}>Expected Attendance</Text>
            <Text style={styles.infoBody}>👥 {event.attendees}</Text>

            <Text style={styles.infoLabel}>Genres</Text>
            <View style={styles.genreTagsRow}>
              {event.genre.map((g) => (
                <View key={g} style={styles.genreChip}>
                  <Text style={styles.genreText}>{g}</Text>
                </View>
              ))}
            </View>

            {event.upcoming && (
              <TouchableOpacity style={styles.ticketBtn} activeOpacity={0.85}>
                <Text style={styles.ticketBtnText}>🎟 Get tickets</Text>
              </TouchableOpacity>
            )}

            {!event.is_partner && (
              <TouchableOpacity
                style={styles.partnerLinkRow}
                onPress={() => navigation.navigate('Partnership')}
                activeOpacity={0.75}
              >
                <Text style={styles.partnerLinkText}>Is this your festival? Become a partner →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {/* ══════════════ DISCUSSION TAB ══════════════ */}
        {activeTab === 'discussion' && (
          <View style={styles.discussionSection}>
            {discussionLoading ? (
              <ActivityIndicator color="#8B5CF6" style={{ marginTop: 24 }} />
            ) : eventDiscussions.length === 0 ? (
              <View style={styles.discEmpty}>
                <Text style={styles.discEmptyEmoji}>💬</Text>
                <Text style={styles.discEmptyText}>No discussions yet. Start the conversation! 💬</Text>
              </View>
            ) : (
              eventDiscussions.map((post) => (
                <View key={post.id} style={styles.discPostCard}>
                  <View style={styles.discPostHeader}>
                    <Text style={styles.discPostUsername}>@{post.username}</Text>
                    <Text style={styles.discPostTime}>{formatDiscTimeAgo(post.created_at)}</Text>
                  </View>
                  <Text style={styles.discPostBody}>{post.body}</Text>
                  <TouchableOpacity
                    style={styles.discReplyToggle}
                    onPress={() => handleToggleDiscReplies(post.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chatbubble-outline" size={13} color="#666" />
                    <Text style={styles.discReplyToggleText}>
                      {expandedDiscPost === post.id ? 'Hide replies' : 'Reply'}
                    </Text>
                  </TouchableOpacity>
                  {expandedDiscPost === post.id && (
                    <View style={styles.discRepliesWrap}>
                      {(discReplies[post.id] ?? []).map((reply) => (
                        <View key={reply.id} style={styles.discReplyCard}>
                          <Text style={styles.discReplyUsername}>@{reply.username}</Text>
                          <Text style={styles.discReplyBody}>{reply.body}</Text>
                        </View>
                      ))}
                      <View style={styles.discReplyInputRow}>
                        <TextInput
                          style={styles.discReplyInput}
                          placeholder="Write a reply..."
                          placeholderTextColor="#555"
                          value={discReplyText[post.id] ?? ''}
                          onChangeText={(t) => setDiscReplyText((prev) => ({ ...prev, [post.id]: t }))}
                          multiline
                        />
                        <TouchableOpacity
                          style={styles.discSendBtn}
                          onPress={() => handlePostDiscReply(post.id)}
                          disabled={discReplyPosting[post.id]}
                          activeOpacity={0.85}
                        >
                          {discReplyPosting[post.id] ? (
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
            <View style={styles.discNewPostRow}>
              <TextInput
                style={styles.discNewPostInput}
                placeholder="Start a discussion..."
                placeholderTextColor="#555"
                value={newDiscPost}
                onChangeText={setNewDiscPost}
                multiline
              />
              <TouchableOpacity
                style={styles.discNewPostBtn}
                onPress={handlePostEventDiscussion}
                disabled={discPosting}
                activeOpacity={0.85}
              >
                {discPosting ? (
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

function formatDiscTimeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  heroWrap: { position: 'relative', height: 220 },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  upcomingBadge: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: '#8B5CF6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  upcomingText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  partnerBadge: {
    position: 'absolute', top: 14, left: 14,
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: '#8B5CF6',
  },
  partnerText: { color: '#8B5CF6', fontSize: 11, fontWeight: '700' },
  partnerBannerGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  partnerBannerText: {
    flex: 1,
    color: '#E9D5FF',
    fontSize: 13,
    fontWeight: '700',
  },
  mediaAccessBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  mediaAccessBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  heroContent: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
  },
  attendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  attendBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  attendBtnEmoji: { fontSize: 16 },
  attendBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  attendBtnTextActive: { color: '#fff' },
  attendeeCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  heroName: { fontSize: 24, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  heroMeta: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161616', borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: '#555', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#2a2a2a' },
  genreRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  genreChip: {
    backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  genreText: { color: '#A78BFA', fontSize: 13, fontWeight: '600' },
  tabs: {
    flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: '#1a1a1a', backgroundColor: '#111',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#8B5CF6' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#555' },
  tabTextActive: { color: '#fff' },

  // Clips tab
  clipsSection: { padding: 16, gap: 10 },
  empty: { alignItems: 'center', padding: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: '#8B5CF6',
  },
  retryBtnText: { color: '#8B5CF6', fontWeight: '700' },
  uploadBtn: {
    marginTop: 20, backgroundColor: '#8B5CF6', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  clipCard: {
    flexDirection: 'row', backgroundColor: '#161616', borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: '#222', marginBottom: 10,
  },
  clipThumb: { width: 110, height: 82, backgroundColor: '#1a1a1a' },
  clipThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  clipInfo: { flex: 1, padding: 12 },
  clipArtist: { fontSize: 14, fontWeight: '700', color: '#fff' },
  clipMeta: { fontSize: 11, color: '#555', marginTop: 2 },
  clipDesc: { fontSize: 12, color: '#888', marginTop: 4, lineHeight: 17 },
  clipStats: { flexDirection: 'row', gap: 10, marginTop: 6 },
  clipStat: { fontSize: 11, color: '#444' },

  // Live right now
  liveSection: {
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
    marginBottom: 14,
  },
  liveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
  },
  liveCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveScrollContent: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  liveCard: {
    width: 120,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  liveThumb: { width: '100%', height: '100%' },
  liveThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  liveCardOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  liveArtist: { color: '#fff', fontSize: 10, fontWeight: '700' },
  liveEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  liveEmptyText: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Top sets
  topSetsSection: {
    marginBottom: 14,
  },
  topSetsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
  },
  topSetsScrollContent: { gap: 8 },
  artistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1228',
    borderWidth: 1,
    borderColor: '#4C1D95',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  artistChipName: {
    color: '#C4B5FD',
    fontSize: 13,
    fontWeight: '700',
  },
  artistChipBadge: {
    backgroundColor: '#4C1D95',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  artistChipCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },

  // Activity counter (top of clips tab)
  activityCounter: {
    backgroundColor: '#0a0a1a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 4,
    alignItems: 'center',
  },
  activityCounterText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  activityCounterTextHot: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '700',
  },

  // Lineup tab
  lineupSection: { padding: 16, gap: 8 },
  addLineupBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#1a1228', borderRadius: 10,
    borderWidth: 1, borderColor: '#8B5CF633',
    alignSelf: 'flex-start', margin: 0, marginBottom: 8,
  },
  addLineupBtnText: { color: '#8B5CF6', fontWeight: '600', fontSize: 13 },
  supabaseLineup: { paddingBottom: 40 },
  lineupDay: { marginBottom: 20 },
  lineupDayLabel: {
    fontSize: 12, fontWeight: '800', color: '#8B5CF6',
    letterSpacing: 2, textTransform: 'uppercase',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#111',
  },
  lineupArtistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0d0d0d',
  },
  lineupArtistInfo: { flex: 1 },
  lineupArtistName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  lineupStage: { fontSize: 12, color: '#555', marginTop: 2 },
  lineupArtistRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineupTime: { fontSize: 13, color: '#8B5CF6', fontWeight: '600' },
  alertAllBtn: {
    backgroundColor: '#1a1228',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF633',
    marginBottom: 8,
  },
  alertAllBtnText: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '700',
  },
  stagePillsRow: {
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  stagePill: {
    backgroundColor: '#161616',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  stagePillActive: {
    backgroundColor: '#4C1D95',
    borderColor: '#7C3AED',
  },
  stagePillText: { color: '#555', fontSize: 13, fontWeight: '600' },
  stagePillTextActive: { color: '#fff' },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 6,
  },
  setRowPast: { opacity: 0.4 },
  setRowLive: {
    borderColor: '#22c55e44',
    backgroundColor: '#0a1a0a',
  },
  setTimeCol: {
    width: 58,
    alignItems: 'flex-start',
    marginRight: 12,
  },
  setTimeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  setTimeEndText: {
    color: '#555',
    fontSize: 11,
    marginTop: 2,
  },
  setArtistCol: {
    flex: 1,
    gap: 4,
  },
  setArtistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  setArtistName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  setArtistNameDim: { color: '#888' },
  setMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  liveNowBadge: {
    backgroundColor: '#22c55e',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  liveNowText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  comingUpBadge: {
    backgroundColor: '#F97316',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  comingUpText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  genreChipSmall: {
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  genreChipSmallText: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '600',
  },
  alertSetLabel: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  setAlertBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Info tab
  infoSection: { padding: 20, gap: 4 },
  infoLabel: { fontSize: 12, fontWeight: '700', color: '#8B5CF6', letterSpacing: 1, textTransform: 'uppercase', marginTop: 20, marginBottom: 8 },
  infoBody: { fontSize: 15, color: '#aaa', lineHeight: 22 },

  lineupPlaceholder: {
    backgroundColor: '#0d0d1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1040',
  },
  lineupPlaceholderTitle: {
    color: '#A78BFA',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  lineupPlaceholderBody: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  placeholderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  placeholderCardText: {
    color: '#666',
    fontSize: 13,
    fontStyle: 'italic',
  },

  mapContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
    height: 160,
    position: 'relative',
  },
  mapView: {
    width: '100%',
    height: '100%',
  },
  mapLabel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a1a2e',
    minHeight: 56,
  },
  weatherText: {
    color: '#C4B5FD',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  transportCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    gap: 12,
  },
  transportAddress: {
    color: '#aaa',
    fontSize: 14,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 11,
  },
  directionsBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  partnerLinkRow: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  partnerLinkText: {
    color: '#555',
    fontSize: 13,
    textDecorationLine: 'underline',
  },

  // Event Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    alignItems: 'center',
  },
  statCardFull: {
    width: '100%',
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // About tab
  aboutSection: { padding: 20, gap: 4 },
  aboutPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  aboutPartnerBadgeText: {
    color: '#C4B5FD',
    fontSize: 13,
    fontWeight: '700',
  },
  genreTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  ticketBtn: {
    marginTop: 24, backgroundColor: '#8B5CF6', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  ticketBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Crew button (in hero)
  crewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1228',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B5CF644',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  crewBtnText: { color: '#A78BFA', fontWeight: '700', fontSize: 14 },

  // Find Your Crew button
  findCrewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0718',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#4C1D9533',
    gap: 12,
  },
  findCrewBtnEmoji: { fontSize: 22 },
  findCrewBtnInfo: { flex: 1 },
  findCrewBtnTitle: { color: '#C4B5FD', fontWeight: '800', fontSize: 15 },
  findCrewBtnSub: { color: '#666', fontSize: 12, marginTop: 1 },

  // Download All
  downloadAllWrap: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  downloadAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, backgroundColor: '#6D28D9', borderRadius: 10,
    paddingVertical: 11, paddingHorizontal: 16,
  },
  downloadAllBtnDisabled: { backgroundColor: '#3a1e6a', opacity: 0.7 },
  downloadAllBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  downloadProgressRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 11,
  },
  downloadProgressText: { color: '#A78BFA', fontWeight: '600', fontSize: 14 },

  // Private Event Banner
  privateBanner: {
    backgroundColor: '#0d0d1a', borderBottomWidth: 1, borderBottomColor: '#1e1040', padding: 16,
  },
  privateBannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 10 },
  privateBannerLabel: { fontSize: 11, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  inviteCodeRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#2a2a2a', gap: 8, marginBottom: 8,
  },
  inviteCodeText: { flex: 1, color: '#C4B5FD', fontFamily: 'monospace', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  memberCountText: { fontSize: 13, color: '#666', marginTop: 4 },

  // See All Clips
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },

  // Festival Crew
  crewSection: {
    backgroundColor: '#0d0d1a', borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#1e1040',
  },
  crewTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2, letterSpacing: -0.3 },
  crewSubtitle: { fontSize: 12, color: '#666', marginBottom: 14 },
  crewRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-around' },
  crewCard: {
    flex: 1, alignItems: 'center', backgroundColor: '#111', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 6, borderWidth: 1, borderColor: '#1e1e1e', position: 'relative',
  },
  crewRankBadge: { position: 'absolute', top: -4, right: -4 },
  crewRankText: { fontSize: 14 },
  crewAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#4C1D95',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    borderWidth: 2, borderColor: '#7C3AED',
  },
  crewAvatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  crewUsername: { color: '#ccc', fontSize: 11, fontWeight: '600', marginBottom: 6, maxWidth: 80, textAlign: 'center' },
  crewClipBadge: {
    backgroundColor: '#1e0b36', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    alignItems: 'center', borderWidth: 1, borderColor: '#4C1D95',
  },
  crewClipCount: { color: '#A78BFA', fontWeight: '800', fontSize: 13, lineHeight: 16 },
  crewClipLabel: { color: '#666', fontSize: 10, fontWeight: '600' },

  // Discussion tab
  discussionSection: { padding: 16, paddingBottom: 60 },
  discEmpty: { padding: 36, alignItems: 'center', gap: 8 },
  discEmptyEmoji: { fontSize: 40 },
  discEmptyText: { color: '#555', fontSize: 15, textAlign: 'center', fontWeight: '600' },
  discPostCard: {
    backgroundColor: '#111', borderRadius: 12, borderWidth: 1,
    borderColor: '#222', padding: 14, marginBottom: 10,
  },
  discPostHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  discPostUsername: { color: '#8B5CF6', fontWeight: '700', fontSize: 13 },
  discPostTime: { color: '#444', fontSize: 11 },
  discPostBody: { color: '#ddd', fontSize: 14, lineHeight: 20 },
  discReplyToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  discReplyToggleText: { color: '#666', fontSize: 12 },
  discRepliesWrap: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#222' },
  discReplyCard: { backgroundColor: '#161616', borderRadius: 8, padding: 10, marginBottom: 6 },
  discReplyUsername: { color: '#8B5CF6', fontWeight: '600', fontSize: 12, marginBottom: 3 },
  discReplyBody: { color: '#bbb', fontSize: 13 },
  discReplyInputRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-end' },
  discReplyInput: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 8, borderWidth: 1,
    borderColor: '#333', color: '#fff', paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, maxHeight: 80,
  },
  discSendBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#8B5CF6',
    alignItems: 'center', justifyContent: 'center',
  },
  discNewPostRow: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'flex-end' },
  discNewPostInput: {
    flex: 1, backgroundColor: '#111', borderRadius: 12, borderWidth: 1,
    borderColor: '#333', color: '#fff', paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, maxHeight: 100,
  },
  discNewPostBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#8B5CF6',
    alignItems: 'center', justifyContent: 'center',
  },
});

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LazyImage } from '../components/LazyImage';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Clip, Profile, Event } from '../types';
import { searchClips, getTrendingArtists } from '../services/clips';
import { searchProfiles, getSuggestedUsers } from '../services/profiles';
import { searchArtists, Artist, getAllArtists } from '../services/artists';
import { isFollowing, followUser, unfollowUser } from '../services/follows';
import { SkeletonSearchRow } from '../components/SkeletonCard';
import { trackEvent } from '../services/analytics';
import { getEvents } from '../services/events';
import { getCachedLocation, haversineDistance } from '../services/location';
import { deduplicateLocations } from '../utils/location';
import { supabase } from '../services/supabase';

const RECENT_SEARCHES_KEY = 'handsup_recent_searches';
const MAX_RECENT = 5;

async function loadRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveRecentSearch(query: string): Promise<void> {
  try {
    const existing = await loadRecentSearches();
    const deduped = [query, ...existing.filter((q) => q !== query)].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(deduped));
  } catch {}
}

async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {}
}

type Category = 'All' | 'Festivals' | 'Artists' | 'Locations' | 'Users';
const CATEGORIES: Category[] = ['All', 'Festivals', 'Artists', 'Locations', 'Users'];

const CATEGORY_ICONS: Record<Category, React.ComponentProps<typeof Ionicons>['name']> = {
  All: 'grid-outline',
  Festivals: 'calendar-outline',
  Artists: 'mic-outline',
  Locations: 'location-outline',
  Users: 'person-outline',
};

type DurationFilter = 'any' | 'under30' | '30to60';
const DURATION_OPTIONS: { label: string; value: DurationFilter }[] = [
  { label: 'Any length', value: 'any' },
  { label: 'Under 30s', value: 'under30' },
  { label: '30–60s', value: '30to60' },
];

// ── User card component ────────────────────────────────────

function UserCard({
  profile,
  onPress,
}: {
  profile: Profile;
  onPress: () => void;
}) {
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(true);

  useEffect(() => {
    isFollowing(profile.id)
      .then(setFollowing)
      .catch(() => {})
      .finally(() => setFollowLoading(false));
  }, [profile.id]);

  const initials = (profile.display_name ?? profile.username ?? '?')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(profile.id);
        setFollowing(false);
      } else {
        await followUser(profile.id);
        setFollowing(true);
      }
    } catch (_e) {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <TouchableOpacity style={userStyles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Avatar */}
      <View style={userStyles.avatar}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={userStyles.avatarImg} />
        ) : (
          <Text style={userStyles.avatarText}>{initials}</Text>
        )}
      </View>

      {/* Info */}
      <View style={userStyles.info}>
        <Text style={userStyles.displayName}>{profile.display_name ?? profile.username}</Text>
        <Text style={userStyles.username}>@{profile.username}</Text>
        <Text style={userStyles.followers}>{profile.total_uploads ?? 0} uploads</Text>
      </View>

      {/* Follow button */}
      <TouchableOpacity
        style={[userStyles.followBtn, following && userStyles.followingBtn]}
        onPress={handleFollow}
        disabled={followLoading}
        activeOpacity={0.85}
      >
        {followLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={userStyles.followBtnText}>{following ? 'Following' : 'Follow'}</Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const userStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    padding: 12,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  displayName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  username: { color: '#555', fontSize: 12, marginTop: 1 },
  followers: { color: '#8B5CF6', fontSize: 11, marginTop: 2 },
  followBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 74,
    alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  followBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});

// ── Suggested User Card ────────────────────────────────────

function SuggestedUserCard({
  profile,
  isFollowing,
  isLoading,
  onFollow,
}: {
  profile: Profile;
  isFollowing: boolean;
  isLoading: boolean;
  onFollow: () => void;
}) {
  const initials = (profile.display_name?.[0] ?? profile.username?.[0] ?? '?').toUpperCase();
  return (
    <View style={suggestStyles.card}>
      <View style={suggestStyles.avatar}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={suggestStyles.avatarImage} />
        ) : (
          <Text style={suggestStyles.avatarText}>{initials}</Text>
        )}
      </View>
      <View style={suggestStyles.info}>
        <Text style={suggestStyles.name} numberOfLines={1}>
          {profile.display_name ?? profile.username}
        </Text>
        <Text style={suggestStyles.username} numberOfLines={1}>@{profile.username}</Text>
        <Text style={suggestStyles.stat}>{profile.total_uploads} clips</Text>
      </View>
      <TouchableOpacity
        style={[suggestStyles.followBtn, isFollowing && suggestStyles.followBtnActive]}
        onPress={onFollow}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isFollowing ? '#fff' : '#8B5CF6'} />
        ) : (
          <Text style={[suggestStyles.followBtnText, isFollowing && suggestStyles.followBtnTextActive]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const suggestStyles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#8B5CF633',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#8B5CF6', fontWeight: '800', fontSize: 18 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#fff' },
  username: { fontSize: 12, color: '#555', marginTop: 1 },
  stat: { fontSize: 11, color: '#444', marginTop: 2 },
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
  followBtnText: { fontSize: 13, fontWeight: '700', color: '#8B5CF6' },
  followBtnTextActive: { color: '#fff' },
});

// ── Main Screen ────────────────────────────────────────────

export default function SearchScreen({ navigation, route }: any) {
  const [query, setQuery] = useState(route?.params?.initialQuery ?? '');
  const [results, setResults] = useState<Clip[]>([]);
  const [userResults, setUserResults] = useState<Profile[]>([]);
  const [artistResults, setArtistResults] = useState<Artist[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<Category>('All');
  const [trendingArtists, setTrendingArtists] = useState<{ artist: string; count: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('any');
  const [autocompleteResults, setAutocompleteResults] = useState<{ type: 'artist' | 'festival'; text: string }[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followLoadingMap, setFollowLoadingMap] = useState<Record<string, boolean>>({});
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [allArtists, setAllArtists] = useState<Artist[]>([]);
  const [allArtistsLoading, setAllArtistsLoading] = useState(false);
  const [allLocations, setAllLocations] = useState<string[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Load cached location for distance sorting
    getCachedLocation().then((loc) => {
      if (loc) {
        setUserLat(loc.latitude);
        setUserLng(loc.longitude);
      }
    }).catch(() => {});

    getTrendingArtists(5)
      .then(setTrendingArtists)
      .catch(() => {});
    loadRecentSearches().then(setRecentSearches);
    getSuggestedUsers().then(setSuggestedUsers).catch(() => {});
    // Load events from Supabase
    getEvents().then(setAllEvents).catch(() => {});
    // Load all artists
    setAllArtistsLoading(true);
    getAllArtists().then(setAllArtists).catch(() => {}).finally(() => setAllArtistsLoading(false));
    // Load distinct locations from clips with deduplication
    supabase.from('clips').select('location').not('location', 'is', null).then(({ data }) => {
      if (data) {
        const rawLocs = (data as any[]).map((r) => r.location as string).filter(Boolean);
        const locs = deduplicateLocations(rawLocs);
        setAllLocations(locs);
      }
    });
    // If initialQuery was passed (e.g. from hashtag tap), run search immediately
    if (route?.params?.initialQuery) {
      doSearch(route.params.initialQuery, category);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildSearchParams = (text: string, cat: Category) => {
    const trimmed = text.trim();
    // Hashtag search: search description field
    if (trimmed.startsWith('#')) {
      return { description: trimmed };
    }
    switch (cat) {
      case 'Artists':
        return { artist: trimmed };
      case 'Festivals':
        return { festival: trimmed };
      case 'Locations':
        return { location: trimmed };
      default:
        return { query: trimmed };
    }
  };

  const doSearch = useCallback(
    (text: string, cat: Category, saveHistory = false) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (text.trim().length < 2) {
        setResults([]);
        setUserResults([]);
        setSearched(false);
        setError(null);
        return;
      }
      debounceTimer.current = setTimeout(async () => {
        setLoading(true);
        setSearched(true);
        setError(null);
        if (saveHistory) {
          await saveRecentSearch(text.trim());
          setRecentSearches(await loadRecentSearches());
          trackEvent('search_query', { query: text.trim() }).catch(() => {});
        }
        try {
          if (cat === 'Users') {
            const users = await searchProfiles(text.trim());
            setUserResults(users);
            setResults([]);
            setArtistResults([]);
          } else if (cat === 'Artists') {
            // Search artist profiles first
            const artists = await searchArtists(text.trim());
            setArtistResults(artists);
            // If no artist profiles found, fall back to clips grouped by artist
            if (artists.length === 0) {
              const data = await searchClips(buildSearchParams(text, cat));
              setResults(data);
            } else {
              setResults([]);
            }
            setUserResults([]);
          } else {
            const data = await searchClips(buildSearchParams(text, cat));
            setResults(data);
            setUserResults([]);
            setArtistResults([]);
          }
        } catch (e: any) {
          setResults([]);
          setUserResults([]);
          setArtistResults([]);
          setError(e?.message ?? 'Search failed');
        } finally {
          setLoading(false);
        }
      }, 400);
    },
    []
  );

  const filterByDuration = (items: Clip[]): Clip[] => {
    if (durationFilter === 'any') return items;
    const dur = durationFilter;
    return items.filter((item) => {
      const d = item.duration_seconds;
      if (d == null) return false;
      if (dur === 'under30') return d < 30;
      if (dur === '30to60') return d >= 30 && d <= 60;
      return true;
    });
  };

  const fetchAutocomplete = (text: string) => {
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
    if (text.trim().length < 2) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }
    autocompleteTimer.current = setTimeout(async () => {
      try {
        const { supabase: sb } = await import('../services/supabase');
        const [artistRes, festRes] = await Promise.all([
          sb.from('clips').select('artist').ilike('artist', `${text.trim()}%`).limit(5),
          sb.from('clips').select('festival_name').ilike('festival_name', `${text.trim()}%`).limit(3),
        ]);
        const artists: { type: 'artist'; text: string }[] = (artistRes.data ?? [])
          .map((r: any) => r.artist as string)
          .filter((v: string, i: number, arr: string[]) => v && arr.indexOf(v) === i)
          .map((v: string) => ({ type: 'artist' as const, text: v }));
        const fests: { type: 'festival'; text: string }[] = (festRes.data ?? [])
          .map((r: any) => r.festival_name as string)
          .filter((v: string, i: number, arr: string[]) => v && arr.indexOf(v) === i)
          .map((v: string) => ({ type: 'festival' as const, text: v }));
        const combined = [...artists, ...fests].slice(0, 8);
        setAutocompleteResults(combined);
        setShowAutocomplete(combined.length > 0);
      } catch {
        setAutocompleteResults([]);
        setShowAutocomplete(false);
      }
    }, 300);
  };

  const handleSearch = (text: string) => {
    setQuery(text);
    doSearch(text, category);
    fetchAutocomplete(text);
  };

  const handleSearchSubmit = () => {
    if (query.trim().length >= 2) {
      setShowAutocomplete(false);
      doSearch(query, category, true);
    }
  };

  const handleAutocompleteTap = (item: { type: 'artist' | 'festival'; text: string }) => {
    setShowAutocomplete(false);
    setQuery(item.text);
    const cat: Category = item.type === 'artist' ? 'Artists' : 'Festivals';
    setCategory(cat);
    doSearch(item.text, cat, true);
  };

  const handleRecentTap = (q: string) => {
    setQuery(q);
    setShowAutocomplete(false);
    doSearch(q, category, false);
  };

  const handleClearHistory = async () => {
    await clearRecentSearches();
    setRecentSearches([]);
  };

  const handleCategory = (cat: Category) => {
    setCategory(cat);
    doSearch(query, cat);
  };

  const handleArtistChip = (artist: string) => {
    setQuery(artist);
    setCategory('Artists');
    doSearch(artist, 'Artists');
  };

  const handleFollowSuggested = async (userId: string) => {
    setFollowLoadingMap((prev) => ({ ...prev, [userId]: true }));
    const isNowFollowing = !followingMap[userId];
    setFollowingMap((prev) => ({ ...prev, [userId]: isNowFollowing }));
    try {
      if (isNowFollowing) {
        await followUser(userId);
      } else {
        await unfollowUser(userId);
      }
    } catch {
      // revert
      setFollowingMap((prev) => ({ ...prev, [userId]: !isNowFollowing }));
    } finally {
      setFollowLoadingMap((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const renderClipItem = useCallback(({ item }: { item: Clip }) => {
    const isPartnerFestival = partnerFestivalNames.has(
      (item.festival_name ?? '').toLowerCase()
    );
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('VerticalFeed', { initialClip: item })}
        activeOpacity={0.85}
      >
        {item.thumbnail_url ? (
          <LazyImage uri={item.thumbnail_url} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumb]} />
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.artist}>{item.artist}</Text>
          <View style={styles.festivalRow}>
            {isPartnerFestival && <View style={styles.partnerDot} />}
            <Text style={styles.festival}>{item.festival_name}</Text>
          </View>
          {item.uploader?.username ? (
            <Text style={styles.uploader}>@{item.uploader.username}</Text>
          ) : null}
          <Text style={styles.meta}>
            {item.location} · {item.clip_date}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  const isSearching = query.trim().length >= 2;
  const filteredResults = category !== 'Users' && category !== 'Artists' ? filterByDuration(results) : results;
  const totalResults = category === 'Users' ? userResults.length : category === 'Artists' ? artistResults.length : filteredResults.length;

  // Partner festival names for badge display in search results
  const partnerFestivalNames = React.useMemo(
    () => new Set(allEvents.filter((e) => e.is_partner).map((e) => e.name.toLowerCase())),
    [allEvents]
  );

  // Festivals sorted by distance (shown when Festivals category selected, before searching)
  // Note: lat/lng columns not yet added to Supabase events — sort by partner status for now
  const sortedFestivals = React.useMemo(() => {
    return [...allEvents].sort((a, b) => {
      if (a.is_partner && !b.is_partner) return -1;
      if (!a.is_partner && b.is_partner) return 1;
      return 0;
    });
  }, [allEvents]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      {/* Header + search bar */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Search</Text>
          <TouchableOpacity
            style={styles.eventsBtn}
            onPress={() => navigation.navigate('Events')}
            activeOpacity={0.85}
          >
            <Text style={styles.eventsBtnText}>🎪 Events</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchInputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Try: Tame Impala • Melbourne • Laneway"
            placeholderTextColor="#555"
            value={query}
            onChangeText={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              // Small delay so tap on autocomplete registers
              setTimeout(() => setShowAutocomplete(false), 150);
            }}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCorrect={false}
          />
          {/* Autocomplete dropdown */}
          {showAutocomplete && autocompleteResults.length > 0 && (
            <View style={styles.autocompleteDropdown}>
              {autocompleteResults.map((item, idx) => (
                <TouchableOpacity
                  key={`${item.type}-${item.text}-${idx}`}
                  style={[
                    styles.autocompleteItem,
                    idx < autocompleteResults.length - 1 && styles.autocompleteItemBorder,
                  ]}
                  onPress={() => handleAutocompleteTap(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.autocompleteIcon}>
                    {item.type === 'artist' ? '🎤' : '🎪'}
                  </Text>
                  <Text style={styles.autocompleteText}>{item.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Suggested chips — shown when focused and not yet typing */}
        {isFocused && query.length === 0 && (
          <View style={styles.suggestedRow}>
            <Text style={styles.suggestedLabel}>🔥 Trending:</Text>
            {['Laneway', 'Fred Again', 'Boiler Room', 'Melbourne'].map((chip) => (
              <TouchableOpacity
                key={chip}
                style={styles.suggestedChip}
                onPress={() => {
                  setQuery(chip);
                  doSearch(chip, category, false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.suggestedChipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryPill, category === cat && styles.categoryPillActive]}
              onPress={() => handleCategory(cat)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={CATEGORY_ICONS[cat]}
                size={13}
                color={category === cat ? '#fff' : '#666'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.categoryPillText, category === cat && styles.categoryPillTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Duration filter — shown when searching clips (not users) */}
        {(category === 'All' || isSearching) && category !== 'Users' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.durationRow}
          >
            {DURATION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.durationPill, durationFilter === opt.value && styles.durationPillActive]}
                onPress={() => setDurationFilter(opt.value)}
                activeOpacity={0.85}
              >
                <Text style={[styles.durationPillText, durationFilter === opt.value && styles.durationPillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Recent Searches — shown when focused and not yet typing */}
      {isFocused && !isSearching && recentSearches.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={handleClearHistory} activeOpacity={0.75}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((q) => (
            <TouchableOpacity
              key={q}
              style={styles.recentRow}
              onPress={() => handleRecentTap(q)}
              activeOpacity={0.8}
            >
              <Ionicons name="time-outline" size={16} color="#555" />
              <Text style={styles.recentQuery}>{q}</Text>
              <Ionicons name="chevron-forward" size={14} color="#333" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Browse View - default non-searching state */}
      {!isSearching && !loading && (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Artists Grid */}
          {(category === 'All' || category === 'Artists') && (
            <View>
              <View style={styles.browseSectionHeader}>
                <Text style={styles.browseSectionTitle}>Artists</Text>
              </View>
              {allArtistsLoading ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                </View>
              ) : (
                <FlatList
                  data={allArtists}
                  keyExtractor={(item) => item.id}
                  numColumns={3}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.artistGridCard}
                      onPress={() => navigation.navigate('ArtistScreen', { artist: item.name })}
                      activeOpacity={0.8}
                    >
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.artistGridImage} />
                      ) : (
                        <View style={[styles.artistGridImage, styles.artistGridPlaceholder]}>
                          <Ionicons name="person-outline" size={28} color="#555" />
                        </View>
                      )}
                      <Text style={styles.artistGridName} numberOfLines={2}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                  scrollEnabled={false}
                  contentContainerStyle={styles.artistGrid}
                />
              )}
            </View>
          )}

          {/* Festivals List */}
          {(category === 'All' || category === 'Festivals') && sortedFestivals.length > 0 && (
            <View>
              <View style={styles.browseSectionHeader}>
                <Text style={styles.browseSectionTitle}>Festivals</Text>
              </View>
              <View style={festivalStyles.listContainer}>
                {sortedFestivals.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={festivalStyles.card}
                    onPress={() => navigation.navigate('EventDetail', { event: item })}
                    activeOpacity={0.85}
                  >
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={festivalStyles.image} />
                    ) : (
                      <View style={[festivalStyles.image, { backgroundColor: '#1a1a2e' }]} />
                    )}
                    {item.is_private && (
                      <View style={festivalStyles.privateBadge}>
                        <Text style={festivalStyles.privateBadgeText}>🔒</Text>
                      </View>
                    )}
                    <View style={festivalStyles.info}>
                      <Text style={festivalStyles.name}>{item.name}</Text>
                      <Text style={festivalStyles.location}>📍 {item.city}, {item.country}</Text>
                    </View>
                    <View style={festivalStyles.clips}>
                      <Text style={festivalStyles.clipsCount}>{item.clip_count}</Text>
                      <Text style={festivalStyles.clipsLabel}>clips</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Locations section */}
          {(category === 'All' || category === 'Locations') && allLocations.length > 0 && (
            <View>
              <View style={styles.browseSectionHeader}>
                <Text style={styles.browseSectionTitle}>Locations</Text>
              </View>
              {allLocations.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={styles.locationRow}
                  onPress={() => { setQuery(loc); setCategory('Locations'); doSearch(loc, 'Locations'); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="location-outline" size={18} color="#8B5CF6" />
                  <Text style={styles.locationRowText}>{loc}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#444" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {loading && (
        <View style={styles.skeletonList}>
          <SkeletonSearchRow />
          <SkeletonSearchRow />
          <SkeletonSearchRow />
          <SkeletonSearchRow />
        </View>
      )}



      {!loading && searched && error && (
        <View style={styles.hint}>
          <Ionicons name="warning-outline" size={36} color="#555" />
          <Text style={styles.hintText}>⚠️ {error}</Text>
          <TouchableOpacity
            style={styles.retryInlineBtn}
            onPress={() => doSearch(query, category)}
            activeOpacity={0.85}
          >
            <Text style={styles.retryInlineText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && searched && !error && totalResults === 0 && (
        <View style={styles.hint}>
          <Ionicons name="search-outline" size={36} color="#333" />
          <Text style={styles.hintText}>No results for "{query}"</Text>
          {category !== 'Users' && (
            <TouchableOpacity
              style={styles.addEventBtn}
              onPress={() => navigation.navigate('AddEvent')}
              activeOpacity={0.85}
            >
              <Text style={styles.addEventText}>+ Add Event</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Artist results */}
      {!loading && category === 'Artists' && artistResults.length > 0 && (
        <FlatList
          data={artistResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.artistCard}
              onPress={() => navigation.navigate('ArtistScreen', { artist: item.name })}
              activeOpacity={0.85}
            >
              <View style={styles.artistImage}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.artistImageImg} />
                ) : (
                  <Ionicons name="person-outline" size={32} color="#8B5CF6" />
                )}
              </View>
              <View style={styles.artistInfo}>
                <Text style={styles.artistName} numberOfLines={1}>{item.name}</Text>
                {item.genre_tags && item.genre_tags.length > 0 && (
                  <Text style={styles.artistGenre} numberOfLines={1}>
                    {item.genre_tags.join(', ')}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#555" />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
        />
      )}

      {/* User results */}
      {!loading && category === 'Users' && userResults.length > 0 && (
        <FlatList
          data={userResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UserCard
              profile={item}
              onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
        />
      )}

      {!loading && category !== 'Users' && category !== 'Artists' && filteredResults.length > 0 && (
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => item.id}
          renderItem={renderClipItem}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
          getItemLayout={(_, index) => ({ length: 87, offset: 87 * index, index })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  eventsBtn: {
    backgroundColor: '#161616',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  eventsBtnText: { color: '#8B5CF6', fontWeight: '700', fontSize: 13 },
  input: {
    backgroundColor: '#161616',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
  categoryRow: { gap: 8, paddingBottom: 4 },
  searchInputWrapper: { position: 'relative', marginBottom: 12, zIndex: 10 },
  autocompleteDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    zIndex: 100,
    overflow: 'hidden',
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  autocompleteItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  autocompleteIcon: { fontSize: 16 },
  autocompleteText: { color: '#ddd', fontSize: 14, fontWeight: '500', flex: 1 },
  durationRow: { gap: 8, paddingBottom: 4, paddingTop: 8 },
  durationPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#161616',
  },
  durationPillActive: {
    backgroundColor: '#8B5CF6',
  },
  durationPillText: { color: '#666', fontSize: 12, fontWeight: '600' },
  durationPillTextActive: { color: '#fff' },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#161616',
  },
  categoryPillActive: {
    backgroundColor: '#8B5CF6',
  },
  categoryPillText: { color: '#666', fontSize: 13, fontWeight: '600' },
  categoryPillTextActive: { color: '#fff' },
  // Suggested chips
  suggestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
    paddingTop: 4,
  },
  suggestedLabel: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
    marginRight: 2,
  },
  suggestedChip: {
    backgroundColor: '#222',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  suggestedChipText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },

  trendSection: { paddingVertical: 16, paddingHorizontal: 20 },
  trendTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  trendTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  addArtistBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  addArtistBtnText: { color: '#8B5CF6', fontWeight: '700', fontSize: 12 },
  trendRow: { gap: 8 },
  artistChip: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a55',
  },
  artistChipText: { color: '#8B5CF6', fontSize: 13, fontWeight: '600' },
  skeletonList: { padding: 16, gap: 12 },
  hint: { padding: 24, alignItems: 'center', gap: 8 },
  hintText: { color: '#555', fontSize: 14, textAlign: 'center' },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: { width: 100, height: 80, backgroundColor: '#161616' },
  placeholderThumb: { backgroundColor: '#2a2a2a' },
  cardInfo: { flex: 1, padding: 12 },
  artist: { fontSize: 15, fontWeight: '700', color: '#fff' },
  festivalRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  partnerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#8B5CF6',
  },
  festival: { fontSize: 12, color: '#8B5CF6' },
  uploader: { fontSize: 11, color: '#555', marginTop: 2 },
  meta: { fontSize: 11, color: '#555', marginTop: 3 },
  addEventBtn: {
    marginTop: 8,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addEventText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  retryInlineBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  retryInlineText: { color: '#8B5CF6', fontWeight: '700' },
  // Festival list (Festivals category, not yet searching)
  // Recent searches
  recentSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recentTitle: { fontSize: 13, fontWeight: '700', color: '#777' },
  clearText: { fontSize: 13, color: '#8B5CF6', fontWeight: '600' },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  recentQuery: { flex: 1, color: '#ccc', fontSize: 14 },
  // Artist cards
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  artistImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artistImageImg: { width: '100%', height: '100%' },
  artistInfo: { flex: 1 },
  artistName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  artistGenre: { fontSize: 12, color: '#8B5CF6', marginTop: 2 },
  // Browse view (default non-searching state)
  browseSectionHeader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  browseSectionTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  artistGridCard: { flex: 1, alignItems: 'center', padding: 8, maxWidth: '33.3%' },
  artistGridImage: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a1a1a', marginBottom: 6, overflow: 'hidden' as const },
  artistGridPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  artistGridName: { fontSize: 11, color: '#ccc', textAlign: 'center', fontWeight: '600' },
  artistGrid: { paddingHorizontal: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', gap: 12 },
  locationRowText: { flex: 1, fontSize: 14, color: '#ddd', fontWeight: '500' },
});

const festivalStyles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  image: { width: 90, height: 70, backgroundColor: '#161616' },
  privateBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  privateBadgeText: { fontSize: 11 },
  info: { flex: 1, padding: 10 },
  name: { fontSize: 14, fontWeight: '700', color: '#fff' },
  location: { fontSize: 11, color: '#666', marginTop: 2 },
  distance: { fontSize: 11, color: '#888', marginTop: 3, fontWeight: '600' },
  clips: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  clipsCount: { fontSize: 16, fontWeight: '800', color: '#8B5CF6' },
  clipsLabel: { fontSize: 10, color: '#555' },
});

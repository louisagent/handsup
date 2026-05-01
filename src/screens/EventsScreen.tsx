import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { FestivalEvent } from '../data/eventsData';
import { getCachedLocation, haversineDistance } from '../services/location';
import { getEvents, joinPrivateEvent, getMyEventMemberships } from '../services/events';
import { Event } from '../types';

// Map Supabase Event → FestivalEvent shape used by this screen
function mapEvent(e: Event): FestivalEvent {
  return {
    id: e.id,
    name: e.name,
    location: e.city,
    country: e.country,
    dates: e.start_date ? new Date(e.start_date).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }) : '',
    description: e.description ?? '',
    genre: e.genre_tags ?? [],
    clipCount: e.clip_count ?? 0,
    attendees: e.attendee_estimate ?? '',
    image: e.image_url ?? `https://picsum.photos/seed/${e.slug}/600/300`,
    upcoming: e.is_upcoming ?? false,
    is_partner: e.is_partner ?? false,
    is_private: e.is_private ?? false,
    invite_code: e.invite_code,
    created_by: e.created_by,
  };
}

const timeFilters = ['All', 'Upcoming', 'Past'];
const locationFilters = ['All', 'Australia', 'International'];

function PartnerBadge() {
  return (
    <View style={styles.partnerBadge}>
      <Text style={styles.partnerBadgeText}>🤝 Official Partner</Text>
    </View>
  );
}

function FeaturedCard({ item, onPress }: { item: FestivalEvent; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.88}>
      <Image source={{ uri: item.image }} style={styles.featuredImage} />
      <View style={styles.featuredOverlay} />
      {item.upcoming && (
        <View style={styles.upcomingBadge}>
          <Text style={styles.upcomingText}>UPCOMING</Text>
        </View>
      )}
      <View style={styles.featuredPartnerBadge}>
        <Text style={styles.featuredPartnerBadgeText}>🤝 Official Partner</Text>
      </View>
      <View style={styles.featuredContent}>
        <Text style={styles.featuredName}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location" size={12} color="#8B5CF6" />
            <Text style={styles.featuredMeta}>{item.location}</Text>
          </View>
          <Text style={styles.featuredMeta}>·</Text>
          <Text style={styles.featuredMeta}>{item.dates}</Text>
        </View>
        <View style={styles.featuredClipsBadge}>
          <Text style={styles.featuredClipsCount}>{item.clipCount.toLocaleString()}</Text>
          <Text style={styles.featuredClipsLabel}> clips</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function EventsScreen({ navigation }: any) {
  const goToEvent = (event: FestivalEvent) =>
    navigation.navigate('EventDetail', { event });
  const [festivals, setFestivals] = useState<FestivalEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTimeFilter, setActiveTimeFilter] = useState('All');
  const [nearMeActive, setNearMeActive] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [eventDistances, setEventDistances] = useState<Record<string, number>>({});

  // Private event join modal
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  // Current user id for private event filtering
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [memberEventIds, setMemberEventIds] = useState<string[]>([]);

  useEffect(() => {
    // Load events from Supabase
    getEvents().then((events) => {
      setFestivals(events.map(mapEvent));
    }).catch(() => {}).finally(() => setEventsLoading(false));

    // Load user location
    getCachedLocation().then((loc) => {
      if (loc) {
        setUserLat(loc.latitude);
        setUserLng(loc.longitude);
      }
    });

    // Load current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        getMyEventMemberships().then(setMemberEventIds).catch(() => {});
      }
    });
  }, []);

  const handleJoinPrivateEvent = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoinLoading(true);
    try {
      // First, look up the event locally (mock data) by invite_code
      const localMatch = festivals.find(
        (f) => f.is_private && f.invite_code?.toUpperCase() === code
      );

      if (localMatch) {
        // Found in local mock data — navigate directly
        setJoinModalVisible(false);
        setJoinCode('');
        navigation.navigate('EventDetail', { event: localMatch });
        return;
      }

      // Not found locally — try Supabase (records membership + navigates)
      await joinPrivateEvent(code);

      // After joining, refresh memberships so the event appears in the list
      getMyEventMemberships().then(setMemberEventIds).catch(() => {});

      Alert.alert('Success!', 'You\'ve joined the private event.', [
        {
          text: 'View Event', onPress: () => {
            setJoinModalVisible(false);
            setJoinCode('');
          }
        },
        {
          text: 'OK', onPress: () => {
            setJoinModalVisible(false);
            setJoinCode('');
          }
        }
      ]);
    } catch (e: any) {
      Alert.alert('Invalid Code', e?.message ?? 'No event found with that invite code. Double-check and try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  const getDistance = (item: FestivalEvent): number | null => {
    const d = eventDistances[item.id];
    return d !== undefined ? d : null;
  };

  const filtered = festivals
    .filter((f) => {
      // Filter out private events the user doesn't have access to
      if (f.is_private && f.created_by !== currentUserId && !memberEventIds.includes(f.id)) {
        return false;
      }
      return true;
    })
    .filter((f) => {
      if (activeFilter === 'Australia') return f.country === 'Australia';
      if (activeFilter === 'International') return f.country !== 'Australia';
      return true;
    })
    .filter((f) => {
      if (activeTimeFilter === 'Upcoming') return f.upcoming;
      if (activeTimeFilter === 'Past') return !f.upcoming;
      return true;
    })
    .filter((f) => {
      if (nearMeActive) {
        const d = getDistance(f);
        return d !== null && d < 500;
      }
      return true;
    })
    .sort((a, b) => {
      // If near me is active, sort by distance
      if (nearMeActive || (userLat !== null && userLng !== null)) {
        const da = getDistance(a);
        const db = getDistance(b);
        if (da !== null && db !== null) return da - db;
        if (da !== null) return -1;
        if (db !== null) return 1;
      }
      // Default: partner first, then by clipCount
      if (a.is_partner && !b.is_partner) return -1;
      if (!a.is_partner && b.is_partner) return 1;
      return b.clipCount - a.clipCount;
    });

  const partnerEvents = festivals.filter((f) => f.is_partner);

  const renderEvent = ({ item }: { item: FestivalEvent }) => {
    const dist = getDistance(item);
    const showDist = dist !== null && dist < 500;
    return (
      <TouchableOpacity style={styles.card} onPress={() => goToEvent(item)}>
        <Image source={{ uri: item.image }} style={styles.image} />
        {item.upcoming && (
          <View style={styles.upcomingBadge}>
            <Text style={styles.upcomingText}>UPCOMING</Text>
          </View>
        )}
        {item.is_partner && (
          <View style={styles.cardPartnerBadge}>
            <Text style={styles.cardPartnerBadgeText}>✓ Official</Text>
          </View>
        )}
        {item.is_private && (
          <View style={styles.privateBadge}>
            <Text style={styles.privateBadgeText}>🔒</Text>
          </View>
        )}
        {/* Live activity indicator on image */}
        <View style={styles.liveActivityBadge}>
          {item.clipCount > 0 ? (
            <Text style={styles.liveActivityText}>{item.clipCount.toLocaleString()} clips</Text>
          ) : (
            <Text style={styles.liveActivityTextEmpty}>Be first to upload</Text>
          )}
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{item.name}</Text>
              </View>
              <Text style={styles.location}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="location" size={11} color="#666" />
                  <Text style={{ color: '#666', fontSize: 11 }}>{item.location}, {item.country}</Text>
                </View>
              </Text>
              {showDist && (
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceText}>{Math.round(dist)}km away</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.footer}>
            <View style={styles.tags}>
              {item.genre.slice(0, 3).map((g) => (
                <View key={g} style={styles.tag}>
                  <Text style={styles.tagText}>{g}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.dates}>{item.dates}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
        <Text style={styles.subtitle}>Browse clips by festival</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Map button + Join Private */}
            <View style={styles.mapButtonRow}>
              <TouchableOpacity
                style={[styles.mapButton, { flex: 1 }]}
                onPress={() => navigation.navigate('Map')}
                activeOpacity={0.85}
              >
                <Text style={styles.mapButtonText}>🗺️  Festival Map</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.joinPrivateBtn}
                onPress={() => setJoinModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.joinPrivateBtnText}>🔒</Text>
              </TouchableOpacity>
            </View>

            {/* Featured partner events horizontal scroll */}
            {partnerEvents.length > 0 && (
              <View style={styles.featuredSection}>
                <Text style={styles.featuredTitle}>⭐ Featured Partners</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredList}
                >
                  {partnerEvents.map((event) => (
                    <FeaturedCard
                      key={event.id}
                      item={event}
                      onPress={() => goToEvent(event)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Time filter pills + Near Me */}
            <View style={styles.filterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                {timeFilters.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filter, activeTimeFilter === f && styles.filterActive]}
                    onPress={() => setActiveTimeFilter(f)}
                  >
                    <Text style={[styles.filterText, activeTimeFilter === f && styles.filterTextActive]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.filterDivider} />
                {locationFilters.filter(f => f !== 'All').map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filter, activeFilter === f && styles.filterActive]}
                    onPress={() => setActiveFilter(activeFilter === f ? 'All' : f)}
                  >
                    <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
                {(userLat !== null) && (
                  <>
                    <View style={styles.filterDivider} />
                    <TouchableOpacity
                      style={[styles.filter, nearMeActive && styles.filterActive]}
                      onPress={() => setNearMeActive(!nearMeActive)}
                    >
                      <Text style={[styles.filterText, nearMeActive && styles.filterTextActive]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="location" size={12} color="#8B5CF6" />
                          <Text>Near me</Text>
                        </View>
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>

            {/* All events header */}
            <View style={styles.allEventsHeader}>
              <Text style={styles.allEventsTitle}>All Events</Text>
            </View>
          </>
        }
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.partnerWithUsRow}
            onPress={() => navigation.navigate('Partnership')}
            activeOpacity={0.75}
          >
            <Text style={styles.partnerWithUsText}>🤝 Partner with us →</Text>
          </TouchableOpacity>
        }
      />

      {/* Join Private Event Modal */}
      <Modal
        visible={joinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🔒 Join Private Event</Text>
            <Text style={styles.modalSubtitle}>Enter the invite code shared with you</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter invite code..."
              placeholderTextColor="#555"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setJoinModalVisible(false); setJoinCode(''); }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalJoinBtn, joinLoading && { opacity: 0.6 }]}
                onPress={handleJoinPrivateEvent}
                disabled={joinLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.modalJoinText}>{joinLoading ? 'Joining...' : 'Join'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 3 },

  // Map button
  mapButtonRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    gap: 8,
  },
  mapButton: {
    backgroundColor: '#1a1228',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF633',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  mapButtonText: {
    color: '#8B5CF6',
    fontWeight: '700',
    fontSize: 15,
  },
  joinPrivateBtn: {
    backgroundColor: '#1a1228',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF633',
  },
  joinPrivateBtnText: {
    fontSize: 18,
  },

  // Filter row
  filterRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 12,
    paddingTop: 4,
  },
  filters: { paddingHorizontal: 16, gap: 8 },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  filterActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterText: { color: '#666', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#2a2a2a',
    alignSelf: 'center',
    marginHorizontal: 4,
  },

  // Featured section
  featuredSection: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  featuredList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  featuredCard: {
    width: 260,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  featuredContent: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  featuredName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 3,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  featuredMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  featuredClipsBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  featuredClipsCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C4B5FD',
  },
  featuredClipsLabel: {
    fontSize: 11,
    color: '#A78BFA',
    fontWeight: '600',
  },
  featuredPartnerBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredPartnerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // All events header
  allEventsHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  allEventsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // List
  list: { paddingBottom: 40 },

  // Event card
  card: {
    backgroundColor: '#161616',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  image: { width: '100%', height: 160, backgroundColor: '#1a1a1a' },
  upcomingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  upcomingText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  // Partner badge on list card (overlays the image) — now shows "✓ Official"
  cardPartnerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardPartnerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Live activity badge bottom-right of image
  liveActivityBadge: {
    position: 'absolute',
    bottom: 160 - 30,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
  },
  liveActivityText: {
    color: '#C4B5FD',
    fontSize: 11,
    fontWeight: '700',
  },
  liveActivityTextEmpty: {
    color: '#555',
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Private badge
  privateBadge: {
    position: 'absolute',
    top: 44,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  privateBadgeText: {
    fontSize: 12,
  },

  // Distance badge
  distanceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  distanceText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },

  // Inline partner badge (pill inside card body)
  partnerBadge: {
    backgroundColor: '#3B0764',
    borderWidth: 1,
    borderColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  partnerBadgeText: {
    color: '#C4B5FD',
    fontSize: 11,
    fontWeight: '700',
  },

  cardBody: { padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  name: { fontSize: 18, fontWeight: '700', color: '#fff' },
  location: { fontSize: 12, color: '#666', marginTop: 3 },
  clipsBadge: { alignItems: 'center', minWidth: 50 },
  clipsCount: { fontSize: 18, fontWeight: '800', color: '#8B5CF6' },
  clipsLabel: { fontSize: 10, color: '#555' },
  description: { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tags: { flexDirection: 'row', gap: 6 },
  tag: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: { color: '#8B5CF6', fontSize: 11, fontWeight: '600' },
  dates: { color: '#555', fontSize: 12 },

  partnerWithUsRow: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  partnerWithUsText: {
    color: '#555',
    fontSize: 14,
    textDecorationLine: 'underline',
  },

  // Join Private Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  modalCancelText: { color: '#888', fontWeight: '700', fontSize: 15 },
  modalJoinBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  modalJoinText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

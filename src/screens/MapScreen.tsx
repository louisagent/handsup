// ============================================================
// Handsup — Festival Map Screen
// Shows festival events on a dark-styled map with custom markers
// NOTE: For lat/lng to be dynamic, add `latitude` and `longitude`
// columns to the `events` table in Supabase. For MVP, coordinates
// are hardcoded for the seeded events.
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  TextInput,
} from 'react-native';
import MapView, { Marker, Region, MapStyleElement } from 'react-native-maps';
import { FestivalEvent, festivals } from '../data/eventsData';
import { getEvents } from '../services/events';
import { Event } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Hardcoded coordinates for all known events ───────────────
// Bridge until the `events` Supabase table gains lat/lng columns.
// Keys match `name` field from eventsData.ts / Supabase events.name
const FESTIVAL_COORDS: Record<string, { latitude: number; longitude: number }> = {
  'Laneway Festival':          { latitude: -37.8007, longitude: 144.9507 },
  'Splendour in the Grass':    { latitude: -28.5167, longitude: 153.4333 },
  'Glastonbury':                { latitude: 51.1536,  longitude: -2.5906  },
  'Coachella':                  { latitude: 33.6831,  longitude: -116.2370 },
  'Field Day':                  { latitude: -33.8688, longitude: 151.2093 },
  'Meredith Music Festival':    { latitude: -37.8494, longitude: 144.0736 },
  'Beyond the Valley':          { latitude: -38.5000, longitude: 146.6500 },
  'Strawberry Fields':          { latitude: -35.8333, longitude: 145.5667 },
  'Falls Festival':             { latitude: -38.5407, longitude: 143.9800 },
  'Falls Festival (Lorne)':     { latitude: -38.5407, longitude: 143.9800 },
  'Spilt Milk Festival':        { latitude: -35.2809, longitude: 149.1300 },
  'Wildlands Festival':         { latitude: -27.4698, longitude: 153.0251 },
  // Legacy local data coords
  'Southbound Festival':        { latitude: -31.9505, longitude: 115.8605 },
  'Secret Garden Sessions':     { latitude: -37.7991, longitude: 144.9784 },
  'Rooftop After-Dark':         { latitude: -33.8855, longitude: 151.2094 },
};

// ── Dark map style (Uber/TikTok-inspired) ─────────────────────
const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry',        stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#555' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
  { featureType: 'administrative',   elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#111' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#222' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#3a3a3a' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#444' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

// ── Types ──────────────────────────────────────────────────────
interface MapEvent {
  id: string;
  name: string;
  location: string;
  dates: string;
  clipCount: number;
  is_partner?: boolean;
  is_private?: boolean;
  invite_code?: string;
  created_by?: string;
  // Original event for navigation
  originalEvent: FestivalEvent | null;
  supabaseEvent: Event | null;
  latitude: number;
  longitude: number;
}

// ── Helpers ───────────────────────────────────────────────────
function supabaseEventToMapEvent(e: Event): MapEvent | null {
  const coords = FESTIVAL_COORDS[e.name];
  if (!coords) return null;
  return {
    id: e.id,
    name: e.name,
    location: e.city ?? e.location,
    dates: e.start_date ? e.start_date.substring(0, 7) : '',
    clipCount: e.clip_count ?? 0,
    is_partner: e.is_partner,
    is_private: e.is_private,
    invite_code: e.invite_code,
    created_by: e.created_by,
    originalEvent: festivals.find((f) => f.name === e.name) ?? null,
    supabaseEvent: e,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

function localEventToMapEvent(f: FestivalEvent): MapEvent | null {
  const coords = FESTIVAL_COORDS[f.name];
  if (!coords) return null;
  return {
    id: f.id,
    name: f.name,
    location: f.location,
    dates: f.dates,
    clipCount: f.clipCount,
    is_partner: f.is_partner,
    is_private: f.is_private,
    invite_code: f.invite_code,
    created_by: f.created_by,
    originalEvent: f,
    supabaseEvent: null,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

// ── Custom Marker ─────────────────────────────────────────────
function FestivalMarker({
  event,
  isSelected,
  dimmed,
}: {
  event: MapEvent;
  isSelected: boolean;
  dimmed: boolean;
}) {
  const size = event.is_partner ? 52 : 40;
  return (
    <View style={[markerStyles.container, { width: size + 20 }, dimmed && markerStyles.dimmed]}>
      <View style={[
        markerStyles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        isSelected && markerStyles.circleSelected,
        event.is_partner && markerStyles.circlePartner,
      ]}>
        {event.is_partner ? (
          <Text style={markerStyles.emoji}>🤝</Text>
        ) : (
          <Text style={markerStyles.pin}>📍</Text>
        )}
      </View>
      <Text style={[markerStyles.label, isSelected && markerStyles.labelSelected]} numberOfLines={1}>
        {event.name}
      </Text>
    </View>
  );
}

const markerStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  dimmed: { opacity: 0.3 },
  circle: {
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  circleSelected: {
    backgroundColor: '#5B21B6',
    borderColor: '#C4B5FD',
    borderWidth: 3,
  },
  circlePartner: {
    backgroundColor: '#4C1D95',
    borderColor: '#A78BFA',
  },
  emoji: { fontSize: 22 },
  pin: { fontSize: 18 },
  label: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labelSelected: { color: '#C4B5FD' },
});

// ── Info Card ─────────────────────────────────────────────────
function EventInfoCard({ event, onViewEvent, onClose }: {
  event: MapEvent;
  onViewEvent: () => void;
  onClose: () => void;
}) {
  return (
    <View style={cardStyles.container}>
      <TouchableOpacity style={cardStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
        <Text style={cardStyles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <View style={cardStyles.row}>
        <View style={cardStyles.left}>
          <View style={cardStyles.titleRow}>
            <Text style={cardStyles.name}>{event.name}</Text>
            {event.is_partner && (
              <View style={cardStyles.partnerBadge}>
                <Text style={cardStyles.partnerText}>🤝 Partner</Text>
              </View>
            )}
          </View>
          <Text style={cardStyles.date}>📅 {event.dates}</Text>
          <Text style={cardStyles.location}>📍 {event.location}</Text>
          <Text style={cardStyles.clips}>🎬 {event.clipCount.toLocaleString()} clips</Text>
        </View>
        <TouchableOpacity style={cardStyles.viewBtn} onPress={onViewEvent} activeOpacity={0.85}>
          <Text style={cardStyles.viewBtnText}>View Event</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    padding: 4,
  },
  closeBtnText: { color: '#555', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  left: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  name: { fontSize: 17, fontWeight: '800', color: '#fff' },
  partnerBadge: {
    backgroundColor: '#3B0764',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  partnerText: { color: '#C4B5FD', fontSize: 10, fontWeight: '700' },
  date: { color: '#888', fontSize: 12, marginBottom: 3 },
  location: { color: '#666', fontSize: 12, marginBottom: 3 },
  clips: { color: '#8B5CF6', fontSize: 12, fontWeight: '600' },
  viewBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 90,
  },
  viewBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

// ── Main Screen ───────────────────────────────────────────────
export default function MapScreen({ navigation }: any) {
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allEvents, setAllEvents] = useState<MapEvent[]>([]);
  const mapRef = useRef<MapView>(null);

  // Load events from Supabase, fall back to local data for missing coords
  useEffect(() => {
    (async () => {
      try {
        const supabaseEvents = await getEvents();
        const mapped = supabaseEvents
          .map(supabaseEventToMapEvent)
          .filter((e): e is MapEvent => e !== null);

        if (mapped.length > 0) {
          setAllEvents(mapped);
        } else {
          // Fallback: use local data if Supabase returned nothing
          const local = festivals
            .map(localEventToMapEvent)
            .filter((e): e is MapEvent => e !== null);
          setAllEvents(local);
        }
      } catch {
        // Fallback to local data on error
        const local = festivals
          .map(localEventToMapEvent)
          .filter((e): e is MapEvent => e !== null);
        setAllEvents(local);
      }
    })();
  }, []);

  // Compute which events match the current query
  const matchingIds: Set<string> = searchQuery.trim()
    ? new Set(
        allEvents
          .filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((e) => e.id)
      )
    : new Set(allEvents.map((e) => e.id)); // all match when no query

  const matchingEvents = allEvents.filter((e) => matchingIds.has(e.id));

  // Camera animation: fly to single match
  useEffect(() => {
    if (searchQuery.trim() && matchingEvents.length === 1) {
      const target = matchingEvents[0];
      mapRef.current?.animateToRegion(
        {
          latitude: target.latitude,
          longitude: target.longitude,
          latitudeDelta: 2,
          longitudeDelta: 2,
        },
        600,
      );
    }
  }, [searchQuery]);

  const initialRegion: Region = {
    latitude: -25,
    longitude: 133,
    latitudeDelta: 80,
    longitudeDelta: 80,
  };

  const handleMarkerPress = (event: MapEvent) => {
    setSelectedEvent(event);
  };

  const handleViewEvent = () => {
    if (!selectedEvent) return;
    // Prefer Supabase event, fall back to local FestivalEvent, fall back to shape from MapEvent
    const eventData = selectedEvent.supabaseEvent
      ?? selectedEvent.originalEvent
      ?? {
          id: selectedEvent.id,
          name: selectedEvent.name,
          location: selectedEvent.location,
          country: '',
          dates: selectedEvent.dates,
          description: '',
          genre: [],
          clipCount: selectedEvent.clipCount,
          attendees: '',
          image: '',
          upcoming: false,
          is_partner: selectedEvent.is_partner,
          is_private: selectedEvent.is_private,
          invite_code: selectedEvent.invite_code,
          created_by: selectedEvent.created_by,
        };
    navigation.navigate('EventDetail', { event: eventData });
    setSelectedEvent(null);
  };

  const visibleCount = matchingEvents.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        mapType="standard"
        customMapStyle={DARK_MAP_STYLE}
        onPress={() => setSelectedEvent(null)}
        showsUserLocation={false}
        showsCompass={false}
        showsScale={false}
      >
        {allEvents.map((event) => {
          const isMatch = matchingIds.has(event.id);
          const dimmed = searchQuery.trim().length > 0 && !isMatch;
          return (
            <Marker
              key={event.id}
              coordinate={{ latitude: event.latitude, longitude: event.longitude }}
              onPress={() => !dimmed && handleMarkerPress(event)}
              tracksViewChanges={false}
            >
              <FestivalMarker
                event={event}
                isSelected={selectedEvent?.id === event.id}
                dimmed={dimmed}
              />
            </Marker>
          );
        })}
      </MapView>

      {/* Header overlay */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Festival Map</Text>
          <Text style={styles.headerSub}>{visibleCount} events mapped</Text>
        </View>
      </View>

      {/* Floating search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search festivals..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.searchClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.searchClearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Event info card */}
      {selectedEvent && (
        <EventInfoCard
          event={selectedEvent}
          onViewEvent={handleViewEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  map: { flex: 1 },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8B5CF633',
  },
  backButtonText: { color: '#8B5CF6', fontWeight: '700', fontSize: 14 },
  headerContent: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#666', fontSize: 12, marginTop: 1 },

  // ── Search bar ──
  searchBar: {
    position: 'absolute',
    top: 130,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(20,20,20,0.88)',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    color: '#f0f0f0',
    fontSize: 15,
    fontWeight: '500',
  },
  searchClear: {
    paddingLeft: 8,
  },
  searchClearText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '700',
  },
});

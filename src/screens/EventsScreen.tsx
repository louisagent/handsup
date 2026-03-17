import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { festivals, FestivalEvent } from '../data/eventsData';

const filters = ['All', 'Upcoming', 'Australia', 'International'];

export default function EventsScreen({ navigation }: any) {
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = festivals.filter((f) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Upcoming') return f.upcoming;
    if (activeFilter === 'Australia') return f.country === 'Australia';
    if (activeFilter === 'International') return f.country !== 'Australia';
    return true;
  });

  const renderEvent = ({ item }: { item: FestivalEvent }) => (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      {item.upcoming && (
        <View style={styles.upcomingBadge}>
          <Text style={styles.upcomingText}>UPCOMING</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.location}>
              📍 {item.location}, {item.country}
            </Text>
          </View>
          <View style={styles.clipsBadge}>
            <Text style={styles.clipsCount}>{item.clipCount.toLocaleString()}</Text>
            <Text style={styles.clipsLabel}>clips</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
        <Text style={styles.subtitle}>Browse clips by festival</Text>
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filter, activeFilter === f && styles.filterActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 3 },
  filterRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 12,
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
  list: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#161616',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
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
  cardBody: { padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
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
});

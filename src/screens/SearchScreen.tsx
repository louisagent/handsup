import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { mockVideos, VideoClip } from '../data/mockData';

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoClip[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const q = text.toLowerCase();
    const filtered = mockVideos.filter(
      (v) =>
        v.artist.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q) ||
        v.festival.toLowerCase().includes(q) ||
        v.date.includes(q)
    );
    setResults(filtered);
    setSearched(true);
  };

  const renderItem = ({ item }: { item: VideoClip }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('VideoDetail', { video: item })}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      <View style={styles.cardInfo}>
        <Text style={styles.artist}>{item.artist}</Text>
        <Text style={styles.festival}>{item.festival}</Text>
        <Text style={styles.meta}>
          {item.location} · {item.date}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <TextInput
          style={styles.input}
          placeholder="Artist, festival, location or date..."
          placeholderTextColor="#555"
          value={query}
          onChangeText={handleSearch}
          autoCorrect={false}
        />
      </View>

      {!searched && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>🔍 Try "Tame Impala", "Melbourne", or "Glastonbury"</Text>
        </View>
      )}

      {searched && results.length === 0 && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>No clips found. Be the first to upload one! 🙌</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 12 },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  hint: { padding: 24 },
  hintText: { color: '#555', fontSize: 14, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  thumbnail: { width: 100, height: 75, backgroundColor: '#1a1a1a' },
  cardInfo: { flex: 1, padding: 12 },
  artist: { fontSize: 15, fontWeight: '700', color: '#fff' },
  festival: { fontSize: 12, color: '#8B5CF6', marginTop: 2 },
  meta: { fontSize: 11, color: '#555', marginTop: 3 },
});

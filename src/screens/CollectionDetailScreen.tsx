import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCollectionClips, removeClipFromCollection } from '../services/collections';
import { Clip } from '../types';

export default function CollectionDetailScreen({ route, navigation }: any) {
  const { collectionId, collectionName } = route.params;
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClips();
  }, [collectionId]);

  const loadClips = async () => {
    try {
      const clipList = await getCollectionClips(collectionId);
      setClips(clipList);
    } catch (err) {
      console.error('Error loading collection clips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClip = async (clipId: string) => {
    Alert.alert(
      'Remove from Collection',
      'Remove this clip from the collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeClipFromCollection(collectionId, clipId);
              setClips(prev => prev.filter(c => c.id !== clipId));
            } catch (err) {
              Alert.alert('Error', 'Could not remove clip');
            }
          },
        },
      ]
    );
  };

  const renderClip = ({ item }: { item: Clip }) => (
    <TouchableOpacity
      style={styles.clipCard}
      onPress={() => navigation.navigate('VideoDetail', { video: item })}
      onLongPress={() => handleRemoveClip(item.id)}
      activeOpacity={0.8}
      delayLongPress={400}
    >
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.placeholderThumb]}>
          <Ionicons name="play-circle-outline" size={32} color="#555" />
        </View>
      )}
      <View style={styles.clipInfo}>
        <Text style={styles.artist} numberOfLines={1}>{item.artist}</Text>
        <Text style={styles.festival} numberOfLines={1}>{item.festival_name}</Text>
        <View style={styles.meta}>
          <Ionicons name="location-outline" size={11} color="#555" />
          <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{collectionName}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : clips.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={64} color="#333" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No Clips Yet</Text>
          <Text style={styles.emptyText}>
            Add clips by tapping Save on any clip and choosing this collection
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.hint}>Long press to remove</Text>
          <FlatList
            data={clips}
            renderItem={renderClip}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 12,
  },
  list: {
    padding: 16,
  },
  clipCard: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  thumbnail: {
    width: 120,
    height: 90,
    backgroundColor: '#161616',
  },
  placeholderThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  artist: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  festival: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#666',
  },
});

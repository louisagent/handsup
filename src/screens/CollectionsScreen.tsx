import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyCollections, getCollectionClips, Collection } from '../services/collections';
import { Clip } from '../types';

export default function CollectionsScreen({ navigation }: any) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCollections = async () => {
    try {
      const cols = await getMyCollections();
      
      // Load clip counts for each collection
      const collectionsWithCounts = await Promise.all(
        cols.map(async (col) => {
          const clips = await getCollectionClips(col.id);
          return { ...col, clip_count: clips.length };
        })
      );
      
      setCollections(collectionsWithCounts);
    } catch (err) {
      console.error('Error loading collections:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCollections();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadCollections();
  };

  const renderCollection = ({ item }: { item: Collection & { clip_count?: number } }) => (
    <TouchableOpacity
      style={styles.collectionCard}
      onPress={() => navigation.navigate('CollectionDetail', { collectionId: item.id, collectionName: item.name })}
      activeOpacity={0.8}
    >
      <View style={styles.collectionIcon}>
        {item.name === 'Watch Later' ? (
          <Ionicons name="time" size={28} color="#F59E0B" />
        ) : (
          <Ionicons name="bookmark" size={28} color="#8B5CF6" />
        )}
      </View>
      <View style={styles.collectionInfo}>
        <Text style={styles.collectionName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.collectionDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        <Text style={styles.collectionCount}>
          {item.clip_count || 0} clip{item.clip_count !== 1 ? 's' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Collections</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateCollection')}
          style={styles.addButton}
        >
          <Ionicons name="add-circle" size={24} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : collections.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={64} color="#333" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No Collections Yet</Text>
          <Text style={styles.emptyText}>
            Collections help you organize clips by festival, artist, or vibe
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateCollection')}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.createButtonText}>Create Collection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={collections}
          renderItem={renderCollection}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#8B5CF6"
            />
          }
        />
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  addButton: {
    padding: 4,
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
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  list: {
    padding: 16,
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  collectionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  collectionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  collectionCount: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPlaylists, createPlaylist } from '../services/playlists';
import type { Playlist } from '../types';

interface Props {
  navigation: any;
}

export default function PlaylistScreen({ navigation }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlaylists = async () => {
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error('Load playlists error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  const handleCreatePlaylist = () => {
    Alert.prompt(
      'New Playlist',
      'Give your playlist a name',
      async (name) => {
        if (!name || !name.trim()) return;
        try {
          await createPlaylist(name.trim());
          loadPlaylists();
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to create playlist');
        }
      }
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPlaylists();
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Playlists</Text>
        <TouchableOpacity onPress={handleCreatePlaylist} style={styles.addBtn}>
          <Ionicons name="add-circle-outline" size={28} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8B5CF6"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.playlistCard}
            onPress={() => navigation.navigate('PlaylistDetail', { playlist: item })}
          >
            {item.thumbnail_url ? (
              <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
                <Ionicons name="musical-notes" size={32} color="#666" />
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.playlistName}>{item.name}</Text>
              <Text style={styles.playlistMeta}>
                {item.clip_count || 0} clips
                {item.is_collaborative && ' • Collaborative'}
              </Text>
              {item.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>No playlists yet</Text>
            <Text style={styles.emptyHint}>
              Create a playlist to organize your favorite clips
            </Text>
            <TouchableOpacity style={styles.createBtn} onPress={handleCreatePlaylist}>
              <Text style={styles.createBtnText}>Create Playlist</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={playlists.length === 0 ? styles.emptyContainer : undefined}
      />
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  backBtn: {},
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginLeft: 16,
  },
  addBtn: {},
  loading: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    gap: 16,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
  },
  placeholderThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  playlistName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  playlistMeta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
  },
  emptyContainer: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

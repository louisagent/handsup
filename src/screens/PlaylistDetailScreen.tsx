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
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getPlaylistClips,
  deletePlaylist,
  updatePlaylist,
  addCollaborator,
  removeClipFromPlaylist,
} from '../services/playlists';
import type { Playlist, Clip } from '../types';

interface Props {
  route: {
    params: {
      playlist: Playlist;
    };
  };
  navigation: any;
}

export default function PlaylistDetailScreen({ route, navigation }: Props) {
  const { playlist: initialPlaylist } = route.params;
  const [playlist, setPlaylist] = useState(initialPlaylist);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClips = async () => {
    try {
      const data = await getPlaylistClips(playlist.id);
      setClips(data);
    } catch (error) {
      console.error('Load playlist clips error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClips();
  }, [playlist.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadClips();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlaylist(playlist.id);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete playlist');
            }
          },
        },
      ]
    );
  };

  const handleToggleCollaborative = async () => {
    try {
      const updated = await updatePlaylist(playlist.id, {
        is_collaborative: !playlist.is_collaborative,
      });
      setPlaylist(updated);
      Alert.alert(
        'Success',
        playlist.is_collaborative
          ? 'Playlist is now private'
          : 'Playlist is now collaborative! You can invite others to add clips.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update playlist');
    }
  };

  const handleAddCollaborator = () => {
    Alert.prompt('Add Collaborator', 'Enter username', async (username) => {
      if (!username || !username.trim()) return;
      try {
        await addCollaborator(playlist.id, username.trim());
        Alert.alert('Success', `Added @${username} as collaborator`);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to add collaborator');
      }
    });
  };

  const handleRemoveClip = (clipId: string) => {
    Alert.alert('Remove Clip', 'Remove this clip from the playlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeClipFromPlaylist(playlist.id, clipId);
            setClips((prev) => prev.filter((c) => c.id !== clipId));
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to remove clip');
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my "${playlist.name}" playlist on Handsup! 🙌\n\nhandsuplive.com/playlist/${playlist.id}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
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
        <Text style={styles.title}>{playlist.name}</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={24} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={handleToggleCollaborative}
        >
          <Ionicons
            name={playlist.is_collaborative ? 'people' : 'person'}
            size={20}
            color="#8B5CF6"
          />
          <Text style={styles.controlBtnText}>
            {playlist.is_collaborative ? 'Collaborative' : 'Private'}
          </Text>
        </TouchableOpacity>

        {playlist.is_collaborative && (
          <TouchableOpacity style={styles.controlBtn} onPress={handleAddCollaborator}>
            <Ionicons name="person-add-outline" size={20} color="#8B5CF6" />
            <Text style={styles.controlBtnText}>Add Collaborator</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.controlBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          <Text style={[styles.controlBtnText, { color: '#FF3B30' }]}>Delete</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={clips}
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
            style={styles.clipCard}
            onPress={() => navigation.navigate('VideoDetail', { video: item })}
            onLongPress={() => handleRemoveClip(item.id)}
          >
            <Image source={{ uri: item.thumbnail_url || item.video_url }} style={styles.thumbnail} />
            <View style={styles.clipInfo}>
              <Text style={styles.artist}>{item.artist}</Text>
              <Text style={styles.festival}>{item.festival}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>No clips in this playlist yet</Text>
            <Text style={styles.emptyHint}>
              Browse clips and tap "Add to Playlist" to start building your collection
            </Text>
          </View>
        }
        contentContainerStyle={clips.length === 0 ? styles.emptyContainer : undefined}
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
  shareBtn: {},
  controls: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
  },
  controlBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  loading: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    gap: 16,
  },
  thumbnail: {
    width: 60,
    height: 106,
    borderRadius: 6,
    backgroundColor: '#1C1C1E',
  },
  clipInfo: {
    flex: 1,
  },
  artist: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  festival: {
    fontSize: 14,
    color: '#666',
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
  },
});

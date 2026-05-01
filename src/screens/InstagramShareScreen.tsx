import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shareToInstagramStory, shareToInstagramFeed } from '../services/instagram';
import type { Clip } from '../types';

interface Props {
  route: {
    params: {
      clip: Clip;
    };
  };
  navigation: any;
}

export default function InstagramShareScreen({ route, navigation }: Props) {
  const { clip } = route.params;
  const [loading, setLoading] = useState(false);

  const handleShareToStory = async () => {
    setLoading(true);
    try {
      await shareToInstagramStory(clip);
      Alert.alert('Success', 'Shared to Instagram Story!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share to Instagram');
    } finally {
      setLoading(false);
    }
  };

  const handleShareToFeed = async () => {
    setLoading(true);
    try {
      await shareToInstagramFeed(clip);
      Alert.alert('Success', 'Shared to Instagram Feed!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share to Instagram');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Share to Instagram</Text>
      </View>

      <View style={styles.preview}>
        <Image source={{ uri: clip.thumbnail_url || clip.video_url }} style={styles.thumbnail} />
        <Text style={styles.clipInfo}>{clip.artist} • {clip.festival}</Text>
      </View>

      <View style={styles.options}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareToStory}
          disabled={loading}
        >
          <Ionicons name="logo-instagram" size={32} color="#fff" />
          <Text style={styles.shareButtonText}>Share to Story</Text>
          {loading && <ActivityIndicator color="#fff" style={styles.loader} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareToFeed}
          disabled={loading}
        >
          <Ionicons name="images-outline" size={32} color="#fff" />
          <Text style={styles.shareButtonText}>Share to Feed</Text>
          {loading && <ActivityIndicator color="#fff" style={styles.loader} />}
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Sharing to Instagram helps spread the word about Handsup! 🙌
      </Text>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  closeBtn: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  preview: {
    alignItems: 'center',
    padding: 32,
  },
  thumbnail: {
    width: 200,
    height: 356,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
  },
  clipInfo: {
    marginTop: 16,
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
  },
  options: {
    paddingHorizontal: 20,
    gap: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  shareButtonText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  loader: {
    marginLeft: 8,
  },
  hint: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 32,
  },
});

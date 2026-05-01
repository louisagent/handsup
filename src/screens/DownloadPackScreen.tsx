import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  downloadGroupPack,
  downloadEventPack,
  downloadPlaylistPack,
} from '../services/downloads';

interface Props {
  route: {
    params: {
      type: 'group' | 'event' | 'playlist';
      id: string;
      name: string;
      clipCount: number;
    };
  };
  navigation: any;
}

export default function DownloadPackScreen({ route, navigation }: Props) {
  const { type, id, name, clipCount } = route.params;
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentClip, setCurrentClip] = useState(0);

  const handleDownload = async () => {
    setDownloading(true);
    setProgress(0);
    setCurrentClip(0);

    try {
      const onProgress = (current: number, total: number) => {
        setCurrentClip(current);
        setProgress((current / total) * 100);
      };

      if (type === 'group') {
        await downloadGroupPack(id, name);
      } else if (type === 'event') {
        await downloadEventPack(id, name);
      } else if (type === 'playlist') {
        await downloadPlaylistPack(id, name);
      }

      Alert.alert('Success', 'Download pack complete!', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to download pack');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Download Pack</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.icon}>
          <Ionicons name="download-outline" size={64} color="#8B5CF6" />
        </View>

        <Text style={styles.packName}>{name}</Text>
        <Text style={styles.packInfo}>{clipCount} clips</Text>

        {downloading ? (
          <View style={styles.progressContainer}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBar, { width: `${progress}%` }]}
            />
            <Text style={styles.progressText}>
              {currentClip} / {clipCount}
            </Text>
            <ActivityIndicator color="#8B5CF6" size="large" style={styles.spinner} />
            <Text style={styles.hint}>Downloading clips to your camera roll...</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={handleDownload}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBtn}
              >
                <Ionicons name="download" size={24} color="#fff" />
                <Text style={styles.downloadBtnText}>Download All</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.hint}>
              All clips will be saved to your camera roll
            </Text>
          </View>
        )}
      </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: {
    marginBottom: 24,
  },
  packName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  packInfo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 48,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  spinner: {
    marginBottom: 16,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  downloadBtn: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  downloadBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

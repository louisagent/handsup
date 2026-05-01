// ============================================================
// Voice Comment Player Component
// Play audio comments inline in comment thread
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { playVoiceComment, formatDuration } from '../services/voiceComments';

interface VoiceCommentPlayerProps {
  audioUrl: string;
  username?: string;
  avatarUrl?: string;
  createdAt: string;
  compact?: boolean;
}

export default function VoiceCommentPlayer({
  audioUrl,
  username = 'Anonymous',
  createdAt,
  compact = false,
}: VoiceCommentPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handlePlayPause = async () => {
    try {
      if (sound) {
        // Already loaded - toggle play/pause
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        // Load and play
        setLoading(true);
        const newSound = await playVoiceComment(audioUrl);
        if (!newSound) {
          setLoading(false);
          return;
        }

        setSound(newSound);
        setIsPlaying(true);
        setLoading(false);

        // Listen for playback status updates
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setDuration(status.durationMillis ?? 0);
            setPosition(status.positionMillis ?? 0);

            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
            }
          }
        });
      }
    } catch (error) {
      console.error('[VoiceCommentPlayer] Playback error:', error);
      setLoading(false);
      setIsPlaying(false);
    }
  };

  const progress = duration > 0 ? position / duration : 0;
  const timeRemaining = duration - position;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <TouchableOpacity
        style={styles.playButton}
        onPress={handlePlayPause}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#8B5CF6" />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={compact ? 18 : 24}
            color="#8B5CF6"
          />
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.username}>🎙️ {username}</Text>
          {!compact && (
            <Text style={styles.timestamp}>
              {new Date(createdAt).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          )}
        </View>

        {/* Waveform / progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.timeText}>
            {isPlaying || position > 0
              ? formatDuration(timeRemaining)
              : formatDuration(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1419',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#8B5CF622',
    gap: 12,
  },
  containerCompact: {
    padding: 8,
    gap: 8,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1228',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  username: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  timestamp: {
    fontSize: 11,
    color: '#555',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  timeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
});

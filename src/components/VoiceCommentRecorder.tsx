// ============================================================
// Voice Comment Recorder Component
// Record and upload audio comments on clips
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import {
  startRecording,
  stopRecording,
  uploadVoiceComment,
  getRecordingStatus,
  formatDuration,
} from '../services/voiceComments';

interface VoiceCommentRecorderProps {
  clipId: string;
  onRecordingComplete?: (commentId: string, audioUrl: string) => void;
  onCancel?: () => void;
}

const MAX_DURATION_MS = 30000; // 30 seconds

export default function VoiceCommentRecorder({
  clipId,
  onRecordingComplete,
  onCancel,
}: VoiceCommentRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveformAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(waveformAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        })
      ).start();
    } else {
      pulseAnim.setValue(1);
      waveformAnim.setValue(0);
    }
  }, [isRecording]);

  // Update duration while recording
  useEffect(() => {
    if (!recording || !isRecording) return;

    const interval = setInterval(async () => {
      const status = await getRecordingStatus(recording);
      if (status) {
        setDuration(status.durationMs);

        // Auto-stop at max duration
        if (status.durationMs >= MAX_DURATION_MS) {
          handleStopRecording();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [recording, isRecording]);

  const handleStartRecording = async () => {
    try {
      const rec = await startRecording();
      if (!rec) {
        Alert.alert('Permission required', 'Please allow microphone access to record voice comments.');
        return;
      }

      setRecording(rec);
      setIsRecording(true);
      setDuration(0);
    } catch (error) {
      console.error('[VoiceComment] Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const handleStopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      const result = await stopRecording(recording);

      if (!result) {
        Alert.alert('Error', 'Failed to save recording.');
        setRecording(null);
        setDuration(0);
        return;
      }

      // Show preview with option to upload or re-record
      Alert.alert(
        'Voice Comment Ready',
        `Duration: ${formatDuration(result.duration)}\n\nUpload this voice comment?`,
        [
          {
            text: 'Re-record',
            onPress: () => {
              setRecording(null);
              setDuration(0);
            },
            style: 'cancel',
          },
          {
            text: 'Upload',
            onPress: () => handleUpload(result.uri, result.duration),
          },
        ]
      );
    } catch (error) {
      console.error('[VoiceComment] Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process recording.');
      setRecording(null);
      setDuration(0);
    }
  };

  const handleUpload = async (audioUri: string, durationMs: number) => {
    try {
      setUploading(true);
      const result = await uploadVoiceComment(clipId, audioUri, durationMs);

      if (result.success && result.commentId && result.audioUrl) {
        Alert.alert('Success!', 'Your voice comment has been posted.');
        onRecordingComplete?.(result.commentId, result.audioUrl);
        setRecording(null);
        setDuration(0);
      } else {
        Alert.alert('Error', 'Failed to upload voice comment. Please try again.');
      }
    } catch (error) {
      console.error('[VoiceComment] Upload failed:', error);
      Alert.alert('Error', 'Failed to upload voice comment.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (recording && isRecording) {
      stopRecording(recording);
    }
    setRecording(null);
    setDuration(0);
    setIsRecording(false);
    onCancel?.();
  };

  const progress = duration / MAX_DURATION_MS;
  const remainingMs = MAX_DURATION_MS - duration;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎙️ Voice Comment</Text>
        <TouchableOpacity onPress={handleCancel} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {!isRecording && !recording ? (
          // Initial state - press to record
          <View style={styles.initialState}>
            <TouchableOpacity
              style={styles.recordButton}
              onPress={handleStartRecording}
              activeOpacity={0.8}
              disabled={uploading}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Ionicons name="mic" size={48} color="#fff" />
              </Animated.View>
            </TouchableOpacity>
            <Text style={styles.instruction}>Press & hold to record</Text>
            <Text style={styles.instructionSub}>Max 30 seconds</Text>
          </View>
        ) : isRecording ? (
          // Recording state
          <View style={styles.recordingState}>
            <Animated.View
              style={[
                styles.recordingIndicator,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.redDot} />
            </Animated.View>

            <Text style={styles.durationText}>{formatDuration(duration)}</Text>

            {/* Waveform visualization (simplified) */}
            <View style={styles.waveformContainer}>
              {[...Array(20)].map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveformBar,
                    {
                      height: waveformAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [4, 20 + Math.random() * 20],
                      }),
                    },
                  ]}
                />
              ))}
            </View>

            <Text style={styles.remainingText}>
              {formatDuration(remainingMs)} remaining
            </Text>

            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopRecording}
              activeOpacity={0.8}
            >
              <Ionicons name="stop" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          // Processing/uploading state
          <View style={styles.processingState}>
            <Text style={styles.processingText}>
              {uploading ? 'Uploading...' : 'Processing...'}
            </Text>
          </View>
        )}

        {/* Progress bar */}
        {isRecording && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        )}
      </View>

      <Text style={styles.hint}>
        💡 Voice comments are a fun way to react to clips
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  content: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  initialState: {
    alignItems: 'center',
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  instruction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  instructionSub: {
    fontSize: 13,
    color: '#666',
  },
  recordingState: {
    alignItems: 'center',
    width: '100%',
  },
  recordingIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a0808',
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  redDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
  },
  durationText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 40,
    marginBottom: 12,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  remainingText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingState: {
    paddingVertical: 40,
  },
  processingText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  hint: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginTop: 12,
  },
});

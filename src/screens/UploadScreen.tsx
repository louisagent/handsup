import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

// ─── Platform limits ──────────────────────────────────────────────────────────
export const MAX_VIDEO_DURATION_SECONDS = 60;   // 1 minute cap
export const MAX_UPLOADS_PER_EVENT = 10;        // per user per event

// Mock: how many clips the current user has uploaded to the selected event
// In production this would be a Supabase query: SELECT count(*) WHERE uploader_id = me AND event = festival
function getMockUploadsForEvent(_festival: string): number {
  // Simulates a user who has already uploaded 3 clips to Laneway
  return _festival.toLowerCase().includes('laneway') ? 3 : 0;
}

export default function UploadScreen() {
  const [artist, setArtist] = useState('');
  const [festival, setFestival] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Mock selected video duration in seconds (in production: read from media picker metadata)
  const [mockVideoDuration] = useState<number | null>(45); // 45 second mock clip

  const uploadsForEvent = festival ? getMockUploadsForEvent(festival) : 0;
  const uploadsRemaining = MAX_UPLOADS_PER_EVENT - uploadsForEvent;
  const atEventLimit = uploadsForEvent >= MAX_UPLOADS_PER_EVENT;
  const videoTooLong = mockVideoDuration !== null && mockVideoDuration > MAX_VIDEO_DURATION_SECONDS;

  const handleSubmit = () => {
    if (!artist || !festival || !location || !date) {
      Alert.alert('Missing info', 'Please fill in artist, festival, location and date.');
      return;
    }
    if (atEventLimit) {
      Alert.alert(
        'Upload limit reached',
        `You've already uploaded ${MAX_UPLOADS_PER_EVENT} clips from ${festival}. This limit helps keep the feed high quality for everyone.`
      );
      return;
    }
    if (videoTooLong) {
      Alert.alert(
        'Video too long',
        `Clips must be ${MAX_VIDEO_DURATION_SECONDS} seconds or less. Please trim your video and try again.`
      );
      return;
    }
    setSubmitted(true);
  };

  const handleReset = () => {
    setArtist('');
    setFestival('');
    setLocation('');
    setDate('');
    setDescription('');
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🙌</Text>
        <Text style={styles.successTitle}>Video uploaded!</Text>
        <Text style={styles.successSub}>
          {artist} at {festival} is now live for everyone to enjoy.
        </Text>
        <Text style={styles.successNote}>
          Thanks for keeping your hands up and sharing the moment 💜
        </Text>
        {uploadsRemaining - 1 > 0 && (
          <View style={styles.remainingBadge}>
            <Text style={styles.remainingText}>
              {uploadsRemaining - 1} upload{uploadsRemaining - 1 !== 1 ? 's' : ''} remaining for {festival}
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.uploadAnother} onPress={handleReset}>
          <Text style={styles.uploadAnotherText}>Upload another</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Upload a clip</Text>
          <Text style={styles.subtitle}>
            Tag your video so others can find it by artist, location & date
          </Text>
        </View>

        {/* Video picker */}
        <TouchableOpacity
          style={[styles.videoPicker, videoTooLong && styles.videoPickerError]}
          activeOpacity={0.8}
        >
          <Text style={styles.videoPickerIcon}>🎥</Text>
          <Text style={styles.videoPickerText}>Choose video from library</Text>
          <Text style={styles.videoPickerSub}>or record a new one</Text>
          {mockVideoDuration !== null && (
            <View style={[styles.durationBadge, videoTooLong && styles.durationBadgeError]}>
              <Text style={[styles.durationText, videoTooLong && styles.durationTextError]}>
                {videoTooLong
                  ? `⚠️ ${mockVideoDuration}s — exceeds ${MAX_VIDEO_DURATION_SECONDS}s limit`
                  : `✅ ${mockVideoDuration}s — within ${MAX_VIDEO_DURATION_SECONDS}s limit`}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Duration limit notice */}
        <View style={styles.limitNotice}>
          <Text style={styles.limitNoticeIcon}>⏱</Text>
          <Text style={styles.limitNoticeText}>
            Max clip length: <Text style={styles.limitNoticeHighlight}>{MAX_VIDEO_DURATION_SECONDS} seconds</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Artist *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Tame Impala"
            placeholderTextColor="#444"
            value={artist}
            onChangeText={setArtist}
          />

          <Text style={styles.label}>Festival / Event *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Laneway Festival"
            placeholderTextColor="#444"
            value={festival}
            onChangeText={setFestival}
          />

          {/* Per-event upload limit indicator */}
          {festival.length > 0 && (
            <View style={[styles.eventLimitBar, atEventLimit && styles.eventLimitBarFull]}>
              <View style={styles.eventLimitLeft}>
                <Text style={styles.eventLimitLabel}>
                  {atEventLimit ? '🚫 Event limit reached' : `📤 Uploads for this event`}
                </Text>
                {!atEventLimit && (
                  <Text style={styles.eventLimitCount}>
                    {uploadsForEvent} / {MAX_UPLOADS_PER_EVENT} used · {uploadsRemaining} remaining
                  </Text>
                )}
                {atEventLimit && (
                  <Text style={styles.eventLimitFull}>
                    You've reached the {MAX_UPLOADS_PER_EVENT}-clip limit for {festival}
                  </Text>
                )}
              </View>
              {/* Progress dots */}
              <View style={styles.eventLimitDots}>
                {Array.from({ length: MAX_UPLOADS_PER_EVENT }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i < uploadsForEvent && styles.dotFilled,
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Melbourne"
            placeholderTextColor="#444"
            value={location}
            onChangeText={setLocation}
          />

          <Text style={styles.label}>Date *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2025-02-01"
            placeholderTextColor="#444"
            value={date}
            onChangeText={setDate}
          />

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What was the moment? The drop? The feeling?"
            placeholderTextColor="#444"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* ToS reminder */}
          <Text style={styles.tosNote}>
            By uploading, you confirm you personally filmed this footage and accept our{' '}
            <Text style={styles.tosLink}>Terms of Service</Text>.
            Clips containing copyrighted audio may be flagged or removed.
          </Text>

          <TouchableOpacity
            style={[styles.submitBtn, (atEventLimit || videoTooLong) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Text style={styles.submitText}>
              {atEventLimit ? '🚫  Event limit reached' : videoTooLong ? '⚠️  Clip too long' : '🙌  Upload & share'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 6, lineHeight: 20 },

  videoPicker: {
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  videoPickerError: { borderColor: '#EF4444' },
  videoPickerIcon: { fontSize: 32, marginBottom: 8 },
  videoPickerText: { color: '#8B5CF6', fontSize: 15, fontWeight: '600' },
  videoPickerSub: { color: '#555', fontSize: 12, marginTop: 4 },
  durationBadge: {
    marginTop: 10,
    backgroundColor: '#1a3a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#2d5a2d',
  },
  durationBadgeError: {
    backgroundColor: '#2a1010',
    borderColor: '#5a2d2d',
  },
  durationText: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  durationTextError: { color: '#EF4444' },

  limitNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  limitNoticeIcon: { fontSize: 13 },
  limitNoticeText: { fontSize: 12, color: '#555' },
  limitNoticeHighlight: { color: '#8B5CF6', fontWeight: '700' },

  form: { gap: 8 },
  label: { color: '#aaa', fontSize: 13, fontWeight: '600', marginTop: 8 },
  input: {
    backgroundColor: '#161616',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 4,
  },
  textArea: { height: 80, textAlignVertical: 'top' },

  // Per-event limit bar
  eventLimitBar: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  eventLimitBarFull: { borderColor: '#EF444433', backgroundColor: '#1a0808' },
  eventLimitLeft: { marginBottom: 8 },
  eventLimitLabel: { color: '#aaa', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  eventLimitCount: { color: '#555', fontSize: 11 },
  eventLimitFull: { color: '#EF4444', fontSize: 11 },
  eventLimitDots: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#2a2a2a',
  },
  dotFilled: { backgroundColor: '#8B5CF6' },

  tosNote: {
    fontSize: 11,
    color: '#444',
    lineHeight: 17,
    marginTop: 8,
    marginBottom: 4,
  },
  tosLink: { color: '#8B5CF6' },

  submitBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnDisabled: { backgroundColor: '#2a2a2a' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  successContainer: {
    flex: 1, backgroundColor: '#0D0D0D',
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  successEmoji: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center' },
  successSub: {
    fontSize: 15, color: '#8B5CF6', marginTop: 10,
    textAlign: 'center', lineHeight: 22,
  },
  successNote: {
    fontSize: 14, color: '#555', marginTop: 16,
    textAlign: 'center', lineHeight: 20,
  },
  remainingBadge: {
    marginTop: 16, backgroundColor: '#1a1228',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: '#8B5CF633',
  },
  remainingText: { color: '#8B5CF6', fontSize: 12, fontWeight: '600' },
  uploadAnother: {
    marginTop: 24, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#8B5CF6',
  },
  uploadAnotherText: { color: '#8B5CF6', fontWeight: '600', fontSize: 15 },
});

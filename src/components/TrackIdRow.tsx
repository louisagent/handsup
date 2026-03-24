import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Clip } from '../types';
import {
  TrackIdSuggestion,
  getTrackIdSuggestions,
  submitTrackIdSuggestion,
  voteForSuggestion,
  confirmTrackId,
} from '../services/trackId';

interface TrackIdRowProps {
  clip: Clip;
  isUploader: boolean;
  onUpdate?: () => void;
}

function getStreamingLabel(url: string): string {
  if (url.includes('spotify')) return 'Open in Spotify';
  if (url.includes('soundcloud')) return 'Open in SoundCloud';
  if (url.includes('apple')) return 'Open in Apple Music';
  return 'Open link';
}

// ── Suggestion Modal ───────────────────────────────────────

interface SuggestModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (trackName: string, trackArtist: string, remixNote?: string, streamingUrl?: string) => Promise<void>;
}

function SuggestModal({ visible, onClose, onSubmit }: SuggestModalProps) {
  const [trackName, setTrackName] = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const [remixNote, setRemixNote] = useState('');
  const [streamingUrl, setStreamingUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!trackName.trim() || !trackArtist.trim()) {
      Alert.alert('Required', 'Please enter both track name and artist.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(
        trackName.trim(),
        trackArtist.trim(),
        remixNote.trim() || undefined,
        streamingUrl.trim() || undefined
      );
      setTrackName('');
      setTrackArtist('');
      setRemixNote('');
      setStreamingUrl('');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not submit suggestion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>What's the track ID?</Text>

          <Text style={styles.fieldLabel}>Track Name *</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. Losing It"
            placeholderTextColor="#444"
            value={trackName}
            onChangeText={setTrackName}
            autoFocus
          />

          <Text style={styles.fieldLabel}>Artist *</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. FISHER"
            placeholderTextColor="#444"
            value={trackArtist}
            onChangeText={setTrackArtist}
          />

          <Text style={styles.fieldLabel}>Remix / Edit note (optional)</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. VIP Mix, Extended Edit, ID Remix"
            placeholderTextColor="#444"
            value={remixNote}
            onChangeText={setRemixNote}
          />

          <Text style={styles.fieldLabel}>Streaming link (optional)</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="Spotify / SoundCloud / Apple Music URL"
            placeholderTextColor="#444"
            value={streamingUrl}
            onChangeText={setStreamingUrl}
            autoCapitalize="none"
            keyboardType="url"
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Track ID</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Suggestions List Modal ─────────────────────────────────

interface SuggestionsModalProps {
  visible: boolean;
  onClose: () => void;
  clipId: string;
  isUploader: boolean;
  onConfirm: (suggestionId: string) => Promise<void>;
  onVote: (suggestionId: string) => Promise<void>;
}

function SuggestionsModal({ visible, onClose, clipId, isUploader, onConfirm, onVote }: SuggestionsModalProps) {
  const [suggestions, setSuggestions] = useState<TrackIdSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTrackIdSuggestions(clipId);
      setSuggestions(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [clipId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const handleVote = async (suggestionId: string) => {
    setVotingId(suggestionId);
    try {
      await onVote(suggestionId);
      // Optimistic update
      setSuggestions((prev) =>
        prev.map((s) => s.id === suggestionId ? { ...s, votes: s.votes + 1 } : s)
      );
    } catch {
      // silently fail
    } finally {
      setVotingId(null);
    }
  };

  const handleConfirm = async (suggestionId: string) => {
    Alert.alert(
      'Confirm Track ID?',
      'This will update the clip with this track info.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setConfirmingId(suggestionId);
            try {
              await onConfirm(suggestionId);
              onClose();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not confirm.');
            } finally {
              setConfirmingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.modalSheet, styles.suggestionsSheet]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Track ID suggestions</Text>

          {loading ? (
            <ActivityIndicator color="#8B5CF6" style={{ marginVertical: 24 }} />
          ) : suggestions.length === 0 ? (
            <Text style={styles.noSuggestionsText}>No suggestions yet.</Text>
          ) : (
            <ScrollView style={styles.suggestionsList} showsVerticalScrollIndicator={false}>
              {suggestions.map((s) => (
                <View key={s.id} style={styles.suggestionRow}>
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionTrack}>
                      {s.track_artist} – {s.track_name}
                      {s.remix_note ? ` (${s.remix_note})` : ''}
                    </Text>
                    {s.user?.username ? (
                      <Text style={styles.suggestionBy}>by @{s.user.username}</Text>
                    ) : null}
                  </View>
                  <View style={styles.suggestionActions}>
                    <TouchableOpacity
                      style={styles.voteBtn}
                      onPress={() => handleVote(s.id)}
                      disabled={votingId === s.id}
                      activeOpacity={0.75}
                    >
                      {votingId === s.id ? (
                        <ActivityIndicator size="small" color="#8B5CF6" />
                      ) : (
                        <>
                          <Text style={styles.voteEmoji}>👍</Text>
                          <Text style={styles.voteCount}>{s.votes}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    {isUploader && (
                      <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={() => handleConfirm(s.id)}
                        disabled={confirmingId === s.id}
                        activeOpacity={0.8}
                      >
                        {confirmingId === s.id ? (
                          <ActivityIndicator size="small" color="#4ade80" />
                        ) : (
                          <Text style={styles.confirmBtnText}>✓ Confirm</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main TrackIdRow ────────────────────────────────────────

export default function TrackIdRow({ clip, isUploader, onUpdate }: TrackIdRowProps) {
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);

  const status = clip.track_id_status ?? 'unknown';
  const hasTrackInfo = clip.track_name && clip.track_artist;

  const handleSubmitSuggestion = async (
    trackName: string,
    trackArtist: string,
    remixNote?: string,
    streamingUrl?: string
  ) => {
    await submitTrackIdSuggestion(clip.id, trackName, trackArtist, remixNote, streamingUrl);
    onUpdate?.();
  };

  const handleVote = async (suggestionId: string) => {
    await voteForSuggestion(suggestionId);
  };

  const handleConfirm = async (suggestionId: string) => {
    await confirmTrackId(clip.id, suggestionId);
    onUpdate?.();
  };

  const renderContent = () => {
    // Confirmed / community picked with track info
    if ((status === 'confirmed' || status === 'community_picked') && hasTrackInfo) {
      const trackLabel = `${clip.track_artist} – ${clip.track_name}`;
      return (
        <View style={styles.row}>
          <Ionicons name="musical-notes-outline" size={14} color="#555" style={styles.icon} />
          <Text style={styles.trackInfo} numberOfLines={1}>{trackLabel}</Text>
          {clip.track_streaming_url ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(clip.track_streaming_url!)}
              activeOpacity={0.75}
            >
              <Text style={styles.streamingLink}>
                {getStreamingLabel(clip.track_streaming_url)}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }

    // Suggested
    if (status === 'suggested') {
      return (
        <View style={styles.row}>
          <Ionicons name="musical-notes-outline" size={14} color="#555" style={styles.icon} />
          <Text style={styles.label}>Track ID: </Text>
          <Text style={styles.valueSubtle}>Suggested by community</Text>
          <TouchableOpacity onPress={() => setShowSuggestionsModal(true)} activeOpacity={0.75}>
            <Text style={styles.actionLink}> View →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Unknown (default)
    return (
      <View style={styles.row}>
        <Ionicons name="musical-notes-outline" size={14} color="#555" style={styles.icon} />
        <Text style={styles.label}>Track ID: </Text>
        <Text style={styles.valueUnknown}>Unknown</Text>
        <TouchableOpacity onPress={() => setShowSuggestModal(true)} activeOpacity={0.75}>
          <Text style={styles.actionLink}> Suggest →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <View style={styles.container}>
        {renderContent()}
      </View>

      <SuggestModal
        visible={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
        onSubmit={handleSubmitSuggestion}
      />

      <SuggestionsModal
        visible={showSuggestionsModal}
        onClose={() => setShowSuggestionsModal(false)}
        clipId={clip.id}
        isUploader={isUploader}
        onConfirm={handleConfirm}
        onVote={handleVote}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    color: '#666',
  },
  valueUnknown: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
  },
  valueSubtle: {
    fontSize: 13,
    color: '#666',
  },
  trackInfo: {
    fontSize: 13,
    color: '#aaa',
    flex: 1,
    marginRight: 8,
  },
  streamingLink: {
    fontSize: 13,
    color: '#8B5CF6',
    textDecorationLine: 'underline',
  },
  actionLink: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  suggestionsSheet: {
    maxHeight: '70%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#fff',
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    backgroundColor: '#4a3070',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },

  // Suggestions list
  noSuggestionsText: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
    gap: 10,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTrack: {
    color: '#ddd',
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionBy: {
    color: '#555',
    fontSize: 12,
    marginTop: 2,
  },
  suggestionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 52,
    justifyContent: 'center',
  },
  voteEmoji: {
    fontSize: 14,
  },
  voteCount: {
    color: '#888',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: '#0f1e0f',
    borderWidth: 1,
    borderColor: '#4ade8033',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confirmBtnText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '700',
  },
});

// ============================================================
// Handsup — Report Screen
// Report a clip for rule violations
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportClip } from '../services/clips';

const REPORT_REASONS = [
  { id: 'copyright', label: 'Copyright / music rights issue', emoji: '🎵' },
  { id: 'inappropriate', label: 'Inappropriate content', emoji: '🚫' },
  { id: 'duplicate', label: 'Duplicate clip', emoji: '🔁' },
  { id: 'spam', label: 'Spam or misleading', emoji: '💬' },
  { id: 'poor_quality', label: 'Poor quality', emoji: '📉' },
  { id: 'wrong_info', label: 'Wrong info (wrong artist/festival)', emoji: '🏷' },
  { id: 'other', label: 'Other', emoji: '⚠️' },
] as const;

type ReasonId = typeof REPORT_REASONS[number]['id'];

export default function ReportScreen({ route, navigation }: any) {
  const { clipId } = route.params as { clipId: string };

  const [selectedReason, setSelectedReason] = useState<ReasonId | null>(null);
  const [detail, setDetail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select a reason', 'Please select a reason for reporting this clip.');
      return;
    }
    setLoading(true);
    try {
      const reason = REPORT_REASONS.find((r) => r.id === selectedReason)?.label ?? selectedReason;
      await reportClip(clipId, reason, detail.trim() || undefined);
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={56} color="#EF4444" />
        </View>
        <Text style={styles.successTitle}>Report submitted.</Text>
        <Text style={styles.successSubtitle}>We'll review it within 24 hours.</Text>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.pageTitle}>Report Clip</Text>
      <Text style={styles.pageSubtitle}>Help keep Handsup safe. Select a reason below.</Text>

      {/* Reason options */}
      <View style={styles.reasonsBlock}>
        {REPORT_REASONS.map((reason) => {
          const selected = selectedReason === reason.id;
          return (
            <TouchableOpacity
              key={reason.id}
              style={[styles.reasonRow, selected && styles.reasonRowSelected]}
              onPress={() => setSelectedReason(reason.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.reasonEmoji}>{reason.emoji}</Text>
              <Text style={[styles.reasonLabel, selected && styles.reasonLabelSelected]}>
                {reason.label}
              </Text>
              <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Additional details */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Additional details <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.textArea}
          placeholder="Anything else we should know..."
          placeholderTextColor="#444"
          value={detail}
          onChangeText={setDetail}
          multiline
          numberOfLines={3}
          maxLength={500}
        />
        <Text style={styles.charCount}>{detail.length}/500</Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, !selectedReason && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading || !selectedReason}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="flag" size={18} color="#fff" />
            <Text style={styles.submitText}>Submit Report</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Reports are reviewed within 24 hours. False reports may result in account restrictions.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 100 },

  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 24,
    lineHeight: 20,
  },

  reasonsBlock: {
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    marginBottom: 24,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    gap: 12,
  },
  reasonRowSelected: {
    backgroundColor: '#1c0a0a',
  },
  reasonEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  reasonLabel: { flex: 1, fontSize: 15, color: '#ccc', fontWeight: '500' },
  reasonLabelSelected: { color: '#fff', fontWeight: '600' },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: '#EF4444' },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },

  fieldGroup: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: '#aaa', marginBottom: 7 },
  optional: { color: '#444', fontWeight: '400' },
  textArea: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#222',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#333',
    textAlign: 'right',
    marginTop: 4,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
  },
  submitBtnDisabled: {
    backgroundColor: '#3a1a1a',
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  disclaimer: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Success state
  successContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon: { marginBottom: 20 },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 40,
    textAlign: 'center',
  },
  doneBtn: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
  },
  doneBtnText: { color: '#aaa', fontWeight: '600', fontSize: 15 },
});

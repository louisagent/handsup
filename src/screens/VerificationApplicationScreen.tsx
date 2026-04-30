// ============================================================
// Handsup — Verification Application Screen
// Creators apply for verified badge here
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

type ApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export default function VerificationApplicationScreen({ navigation }: any) {
  const [status, setStatus] = useState<ApplicationStatus>('none');
  const [reason, setReason] = useState('');
  const [socialLinks, setSocialLinks] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('verification_applications')
        .select('status, reason, social_links')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setStatus(data.status as ApplicationStatus);
        setReason(data.reason ?? '');
        setSocialLinks(data.social_links ?? '');
      }
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please explain why you should be verified.');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('verification_applications')
        .upsert({
          user_id: user.id,
          reason: reason.trim(),
          social_links: socialLinks.trim() || null,
          status: 'pending',
        });

      if (error) throw error;
      setStatus('pending');
      Alert.alert('Application submitted! ✅', "We'll review your application and get back to you.");
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  // Already approved
  if (status === 'approved') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="checkmark-circle" size={64} color="#8B5CF6" />
        <Text style={styles.statusTitle}>You're Verified! ⚡</Text>
        <Text style={styles.statusSub}>Your verified badge is active on your profile.</Text>
      </View>
    );
  }

  // Pending review
  if (status === 'pending') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="time-outline" size={64} color="#FBBF24" />
        <Text style={styles.statusTitle}>Application Pending</Text>
        <Text style={styles.statusSub}>We're reviewing your application. This usually takes 1–3 days.</Text>
      </View>
    );
  }

  // Rejected — can reapply
  const isReapplying = status === 'rejected';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerSection}>
          <Ionicons name="shield-checkmark-outline" size={48} color="#8B5CF6" />
          <Text style={styles.title}>Apply for Verification</Text>
          <Text style={styles.subtitle}>
            Verified creators get a ⚡ badge on their profile and clips.
            We verify active festival uploaders, artists, and music journalists.
          </Text>
        </View>

        {isReapplying && (
          <View style={styles.rejectedBanner}>
            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
            <Text style={styles.rejectedText}>Your previous application wasn't approved. You're welcome to reapply.</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Why should you be verified? *</Text>
            <Text style={styles.hint}>Tell us about your connection to the live music scene.</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. I regularly upload clips from Melbourne festivals and have 50+ quality clips on the platform..."
              placeholderTextColor="#333"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{reason.length}/500</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Social media links (optional)</Text>
            <Text style={styles.hint}>Instagram, TikTok, SoundCloud, etc. — helps us verify your identity.</Text>
            <TextInput
              style={styles.input}
              value={socialLinks}
              onChangeText={setSocialLinks}
              placeholder="https://instagram.com/yourname"
              placeholderTextColor="#333"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>
                {isReapplying ? 'Resubmit Application' : 'Submit Application'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 60 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },

  statusTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  statusSub: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },

  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },

  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#1a0808',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF444422',
    padding: 14,
    marginBottom: 20,
  },
  rejectedText: { flex: 1, fontSize: 13, color: '#EF4444', lineHeight: 19 },

  form: { gap: 20 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '700', color: '#fff' },
  hint: { fontSize: 12, color: '#555' },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    color: '#333',
    textAlign: 'right',
    marginTop: 2,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 28,
  },
  submitBtnDisabled: { backgroundColor: '#3b2a6e' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface FormData {
  festivalName: string;
  contactName: string;
  email: string;
  website: string;
  attendance: string;
  message: string;
}

const BENEFITS = [
  { icon: '🎨', text: 'Branded event page with your lineup and map' },
  { icon: '📊', text: 'Real-time clip analytics dashboard' },
  { icon: '📹', text: 'Post-event content library' },
  { icon: '📈', text: 'Audience engagement data' },
  { icon: '🤝', text: 'Official partner badge on your event' },
];

export default function PartnershipScreen({ navigation }: any) {
  const [form, setForm] = useState<FormData>({
    festivalName: '',
    contactName: '',
    email: '',
    website: '',
    attendance: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.festivalName.trim() || !form.email.trim()) {
      Alert.alert('Missing fields', 'Please fill in at least your festival name and email.');
      return;
    }
    setSubmitting(true);
    try {
      const subject = encodeURIComponent(`Partnership Application: ${form.festivalName}`);
      const body = encodeURIComponent(
        `Festival Name: ${form.festivalName}\n` +
        `Contact Name: ${form.contactName}\n` +
        `Email: ${form.email}\n` +
        `Website: ${form.website}\n` +
        `Expected Attendance: ${form.attendance}\n\n` +
        `Message:\n${form.message}`
      );
      const { Linking } = require('react-native');
      await Linking.openURL(
        `mailto:festivals@handsuplive.com?subject=${subject}&body=${body}`
      );
      Alert.alert(
        '🎉 Application sent!',
        "Thanks for applying! We'll be in touch within 2 business days.",
        [{ text: 'Back to events', onPress: () => navigation.goBack() }]
      );
    } catch {
      Alert.alert(
        'Could not open email',
        'Please email us directly at festivals@handsuplive.com',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <LinearGradient
            colors={['#1a0a2e', '#0D0D0D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroEmoji}>🤝</Text>
            <Text style={styles.heroTitle}>Become a Festival Partner</Text>
            <Text style={styles.heroSubtitle}>
              Give your attendees a content layer for your event. We handle the tech, you get the data.
            </Text>
          </LinearGradient>

          {/* Benefits */}
          <View style={styles.benefitsSection}>
            <Text style={styles.sectionTitle}>What you get</Text>
            {BENEFITS.map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>{b.icon}</Text>
                <View style={styles.checkWrap}>
                  <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" style={{ marginRight: 8 }} />
                </View>
                <Text style={styles.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          {/* Application Form */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Apply now</Text>

            <Text style={styles.inputLabel}>Festival Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Laneway Festival"
              placeholderTextColor="#444"
              value={form.festivalName}
              onChangeText={(v) => updateField('festivalName', v)}
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>Contact Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor="#444"
              value={form.contactName}
              onChangeText={(v) => updateField('contactName', v)}
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#444"
              value={form.email}
              onChangeText={(v) => updateField('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>Festival Website</Text>
            <TextInput
              style={styles.input}
              placeholder="https://yourfestival.com"
              placeholderTextColor="#444"
              value={form.website}
              onChangeText={(v) => updateField('website', v)}
              keyboardType="url"
              autoCapitalize="none"
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>Expected Attendance</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10,000"
              placeholderTextColor="#444"
              value={form.attendance}
              onChangeText={(v) => updateField('attendance', v)}
              keyboardType="default"
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>What makes your festival unique?</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about your event, your audience, and what you're hoping to achieve with Handsup…"
              placeholderTextColor="#444"
              value={form.message}
              onChangeText={(v) => updateField('message', v)}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBtnWrapper, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Submit Application</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              Or email us directly at{' '}
              <Text style={styles.footerEmail}>festivals@handsuplive.com</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  hero: {
    padding: 32,
    paddingTop: 40,
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#A78BFA',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  benefitsSection: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  benefitIcon: {
    fontSize: 18,
    marginRight: 10,
    width: 24,
    textAlign: 'center',
  },
  checkWrap: {
    marginRight: 2,
  },
  benefitText: {
    flex: 1,
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },

  formSection: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 12,
  },
  submitBtnWrapper: {
    marginTop: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  footerNote: {
    color: '#444',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
  footerEmail: {
    color: '#8B5CF6',
    textDecorationLine: 'underline',
  },
});

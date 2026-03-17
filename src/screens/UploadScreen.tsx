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

export default function UploadScreen() {
  const [artist, setArtist] = useState('');
  const [festival, setFestival] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!artist || !festival || !location || !date) {
      Alert.alert('Missing info', 'Please fill in artist, festival, location and date.');
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

        <TouchableOpacity style={styles.videoPicker}>
          <Text style={styles.videoPickerIcon}>🎥</Text>
          <Text style={styles.videoPickerText}>Choose video from library</Text>
          <Text style={styles.videoPickerSub}>or record a new one</Text>
        </TouchableOpacity>

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

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>🙌  Upload & share</Text>
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
    marginBottom: 28,
  },
  videoPickerIcon: { fontSize: 32, marginBottom: 8 },
  videoPickerText: { color: '#8B5CF6', fontSize: 15, fontWeight: '600' },
  videoPickerSub: { color: '#555', fontSize: 12, marginTop: 4 },
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
  submitBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  successEmoji: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center' },
  successSub: {
    fontSize: 15,
    color: '#8B5CF6',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  successNote: {
    fontSize: 14,
    color: '#555',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadAnother: {
    marginTop: 32,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  uploadAnotherText: { color: '#8B5CF6', fontWeight: '600', fontSize: 15 },
});

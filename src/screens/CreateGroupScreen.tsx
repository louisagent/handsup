// ============================================================
// Handsup — Create Group Screen
// Form to create a new group
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createGroup } from '../services/groups';
import { supabase } from '../services/supabase';
import { Event } from '../types';

interface Props {
  navigation: any;
}

export default function CreateGroupScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [eventText, setEventText] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Load recent events for the optional event picker
    supabase
      .from('events')
      .select('id, name, slug, location, start_date')
      .order('start_date', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setEvents(data as Event[]);
      });
  }, []);

  const filteredEvents = events.filter((e) =>
    e.name.toLowerCase().includes(eventText.toLowerCase())
  );

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a group name.');
      return;
    }

    try {
      setCreating(true);
      const group = await createGroup(
        name.trim(),
        description.trim() || undefined,
        selectedEvent?.id,
        isPrivate
      );
      navigation.replace('GroupDetail', { groupId: group.id });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="people" size={40} color="#8B5CF6" />
        </View>

        <Text style={styles.pageTitle}>Create Group</Text>
        <Text style={styles.pageSubtitle}>
          Gather your crew. Share clips. Keep it in one place.
        </Text>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Group Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Splendour Front Row Crew"
            placeholderTextColor="#444"
            maxLength={60}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this group about?"
            placeholderTextColor="#444"
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Event */}
        <View style={styles.field}>
          <Text style={styles.label}>Link to Event (optional)</Text>
          {selectedEvent ? (
            <View style={styles.selectedEvent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedEventName}>{selectedEvent.name}</Text>
                <Text style={styles.selectedEventMeta}>{selectedEvent.location}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                <Ionicons name="close-circle" size={20} color="#555" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={eventText}
                onChangeText={(t) => {
                  setEventText(t);
                  setShowEventPicker(t.length > 0);
                }}
                placeholder="Search events..."
                placeholderTextColor="#444"
                onFocus={() => eventText.length > 0 && setShowEventPicker(true)}
                onBlur={() => setTimeout(() => setShowEventPicker(false), 200)}
              />
              {showEventPicker && filteredEvents.length > 0 && (
                <View style={styles.eventDropdown}>
                  {filteredEvents.slice(0, 6).map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      style={styles.eventDropdownRow}
                      onPress={() => {
                        setSelectedEvent(e);
                        setEventText('');
                        setShowEventPicker(false);
                      }}
                    >
                      <Text style={styles.eventDropdownName}>{e.name}</Text>
                      <Text style={styles.eventDropdownMeta}>{e.location}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Private toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Private Group</Text>
            <Text style={styles.toggleSubLabel}>
              {isPrivate
                ? 'Only people with the invite code can join'
                : 'Anyone can discover and join this group'}
            </Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: '#333', true: '#5b21b6' }}
            thumbColor={isPrivate ? '#8B5CF6' : '#888'}
          />
        </View>

        {/* Create button */}
        <TouchableOpacity
          style={[styles.createBtn, creating && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={creating}
          activeOpacity={0.85}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="people-circle" size={20} color="#fff" />
              <Text style={styles.createBtnText}>Create Group</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { padding: 24, paddingTop: 32 },

  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#1a1030',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },

  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#222',
  },
  inputMultiline: {
    height: 90,
    textAlignVertical: 'top',
  },

  selectedEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f1f',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a1a5a',
  },
  selectedEventName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  selectedEventMeta: { fontSize: 12, color: '#8B5CF6', marginTop: 2 },

  eventDropdown: {
    backgroundColor: '#111',
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
  },
  eventDropdownRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  eventDropdownName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  eventDropdownMeta: { fontSize: 11, color: '#888', marginTop: 2 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#222',
  },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 4 },
  toggleSubLabel: { fontSize: 12, color: '#666', maxWidth: 220 },

  createBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

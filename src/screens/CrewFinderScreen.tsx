// ============================================================
// Handsup — Crew Finder Screen
// Find solo festival-goers to go with
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Image, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import {
  getCrewListings, postCrewListing, removeCrewListing,
  hasCrewListing, sendCrewRequest, CrewListing,
} from '../services/crewFinder';

function CrewCard({
  listing,
  onConnect,
  alreadySent,
  isCurrentUser,
}: {
  listing: CrewListing;
  onConnect: () => void;
  alreadySent: boolean;
  isCurrentUser: boolean;
}) {
  const u = listing.user;
  const initials = (u?.username?.[0] ?? '?').toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        {u?.avatar_url ? (
          <Image source={{ uri: u.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{initials}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.username}>@{u?.username ?? 'unknown'}</Text>
          {u?.is_verified && <Ionicons name="checkmark-circle" size={14} color="#8B5CF6" />}
          {u?.level && (
            <View style={styles.levelPill}>
              <Text style={styles.levelText}>Lv.{u.level}</Text>
            </View>
          )}
        </View>
        <Text style={styles.uploadCount}>{u?.total_uploads ?? 0} clips uploaded</Text>
        {listing.bio ? (
          <Text style={styles.bio} numberOfLines={2}>{listing.bio}</Text>
        ) : null}
      </View>
      {!isCurrentUser && (
        <TouchableOpacity
          style={[styles.connectBtn, alreadySent && styles.connectBtnSent]}
          onPress={onConnect}
          disabled={alreadySent}
          activeOpacity={0.8}
        >
          <Ionicons
            name={alreadySent ? 'checkmark' : 'hand-right-outline'}
            size={16}
            color={alreadySent ? '#10B981' : '#fff'}
          />
          <Text style={[styles.connectBtnText, alreadySent && styles.connectBtnTextSent]}>
            {alreadySent ? 'Sent' : "I'm in!"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function CrewFinderScreen({ route, navigation }: any) {
  const { eventId, eventName } = route.params as { eventId: string; eventName: string };

  const [listings, setListings] = useState<CrewListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isListed, setIsListed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  // Modal for posting listing
  const [showPostModal, setShowPostModal] = useState(false);
  const [bio, setBio] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const [data, listed] = await Promise.all([
        getCrewListings(eventId),
        user ? hasCrewListing(eventId) : Promise.resolve(false),
      ]);

      setListings(data);
      setIsListed(listed);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const handlePost = async () => {
    setPosting(true);
    try {
      await postCrewListing(eventId, bio);
      setIsListed(true);
      setShowPostModal(false);
      setBio('');
      load();
    } catch (e: any) {
      Alert.alert('Cannot post listing', e?.message ?? 'Something went wrong.');
    } finally {
      setPosting(false);
    }
  };

  const handleRemoveListing = () => {
    Alert.alert('Remove listing?', "You'll be removed from the crew finder for this event.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeCrewListing(eventId);
          setIsListed(false);
          load();
        },
      },
    ]);
  };

  const handleConnect = async (listing: CrewListing) => {
    try {
      await sendCrewRequest(listing.user_id, eventId);
      setSentRequests((prev) => new Set(prev).add(listing.user_id));

      // Push notification to the other person
      const { data: me } = await supabase.from('profiles').select('username').eq('id', currentUserId ?? '').single();
      const { sendPushToUser } = await import('../services/notifications');
      sendPushToUser(listing.user_id, {
        title: '🤝 Crew request!',
        body: `@${me?.username ?? 'Someone'} wants to join your crew at ${eventName}`,
        data: { type: 'crew_request', eventId },
      }).catch(() => {});
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not send request.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header action bar */}
      <View style={styles.actionBar}>
        <View style={styles.actionBarLeft}>
          <Ionicons name="people-outline" size={18} color="#8B5CF6" />
          <Text style={styles.actionBarText}>
            {listings.length} looking for crew
          </Text>
        </View>
        {isListed ? (
          <TouchableOpacity style={styles.listedBtn} onPress={handleRemoveListing} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.listedBtnText}>You're listed</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.postBtn}
            onPress={() => setShowPostModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.postBtnText}>I'm going solo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Listings */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(l) => l.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#8B5CF6"
              colors={['#8B5CF6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎪</Text>
              <Text style={styles.emptyTitle}>No one listed yet</Text>
              <Text style={styles.emptySub}>Be the first to post — more people will follow!</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowPostModal(true)} activeOpacity={0.85}>
                <Text style={styles.emptyBtnText}>Post my listing</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <CrewCard
              listing={item}
              onConnect={() => handleConnect(item)}
              alreadySent={sentRequests.has(item.user_id)}
              isCurrentUser={item.user_id === currentUserId}
            />
          )}
          contentContainerStyle={listings.length === 0 ? styles.emptyContainer : styles.listContent}
        />
      )}

      {/* Post listing modal */}
      <Modal visible={showPostModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPostModal(false)} activeOpacity={0.8}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Going Solo?</Text>
            <TouchableOpacity onPress={handlePost} disabled={posting} activeOpacity={0.8}>
              {posting ? <ActivityIndicator size="small" color="#8B5CF6" /> : <Text style={styles.modalPost}>Post</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalEventName}>{eventName}</Text>
            <Text style={styles.modalDesc}>
              Let other solo festival-goers know you're looking for crew. Anyone can send you an "I'm in!" request.
            </Text>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              placeholder={`e.g. "Into techno & deep house, happy to meet for a drink before gates open 🍺"`}
              placeholderTextColor="#333"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={200}
            />
            <Text style={styles.charCount}>{bio.length}/200</Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  actionBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBarText: { fontSize: 14, color: '#8B5CF6', fontWeight: '600' },

  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  listedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0a1a12',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  listedBtnText: { color: '#10B981', fontWeight: '700', fontSize: 13 },

  listContent: { paddingBottom: 40 },
  emptyContainer: { flex: 1 },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 14,
    gap: 12,
  },
  cardLeft: {},
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a1228' },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#1a1228',
    borderWidth: 1, borderColor: '#8B5CF633',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#8B5CF6', fontWeight: '800', fontSize: 20 },
  cardInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { fontSize: 15, fontWeight: '700', color: '#fff' },
  levelPill: {
    backgroundColor: '#1a1228',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#8B5CF633',
  },
  levelText: { fontSize: 10, color: '#A78BFA', fontWeight: '700' },
  uploadCount: { fontSize: 12, color: '#555' },
  bio: { fontSize: 13, color: '#888', lineHeight: 18, marginTop: 2 },

  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  connectBtnSent: { backgroundColor: '#0a1a12', borderWidth: 1, borderColor: '#10B98133' },
  connectBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  connectBtnTextSent: { color: '#10B981' },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 80, gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#555' },
  emptySub: { fontSize: 14, color: '#333', textAlign: 'center', paddingHorizontal: 32 },
  emptyBtn: {
    marginTop: 8, backgroundColor: '#8B5CF6',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Modal
  modal: { flex: 1, backgroundColor: '#0a0a0a' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  modalCancel: { fontSize: 16, color: '#555' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  modalPost: { fontSize: 16, color: '#8B5CF6', fontWeight: '700' },
  modalBody: { padding: 20, gap: 12 },
  modalEventName: { fontSize: 20, fontWeight: '800', color: '#8B5CF6' },
  modalDesc: { fontSize: 14, color: '#666', lineHeight: 20 },
  bioInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    minHeight: 100,
  },
  charCount: { fontSize: 11, color: '#333', textAlign: 'right' },
});

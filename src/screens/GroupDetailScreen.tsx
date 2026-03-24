// ============================================================
// Handsup — Group Detail Screen
// View group info, clips, members; add clips; leave group
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Clipboard,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { Group, GroupMember, GroupClip, Clip } from '../types';
import {
  getGroupById,
  getGroupMembers,
  getGroupClips,
  leaveGroup,
  addClipToGroup,
  getMyClips,
} from '../services/groups';
import { supabase } from '../services/supabase';

interface Props {
  navigation: any;
  route: { params: { groupId: string } };
}

function ClipCard({ groupClip, onPress }: { groupClip: GroupClip; onPress: () => void }) {
  const clip = groupClip.clip;
  if (!clip) return null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {clip.thumbnail_url ? (
        <Image source={{ uri: clip.thumbnail_url }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.placeholderThumb]}>
          <Ionicons name="musical-notes" size={28} color="#333" />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.artist}>{clip.artist}</Text>
        <Text style={styles.festival}>{clip.festival_name}</Text>
        <Text style={styles.meta}>
          {clip.location} · {clip.clip_date}
        </Text>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>⬇ {clip.download_count}</Text>
          <Text style={styles.statText}>  👁 {clip.view_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ClipPickerModal({
  visible,
  clips,
  onSelect,
  onClose,
}: {
  visible: boolean;
  clips: Clip[];
  onSelect: (clipId: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerBox}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Add a Clip</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#aaa" />
            </TouchableOpacity>
          </View>
          {clips.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Text style={styles.pickerEmptyText}>You haven't uploaded any clips yet.</Text>
            </View>
          ) : (
            <FlatList
              data={clips}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerRow}
                  onPress={() => onSelect(item.id)}
                  activeOpacity={0.8}
                >
                  {item.thumbnail_url ? (
                    <Image source={{ uri: item.thumbnail_url }} style={styles.pickerThumb} />
                  ) : (
                    <View style={[styles.pickerThumb, styles.placeholderThumb]}>
                      <Ionicons name="musical-notes" size={16} color="#333" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerArtist}>{item.artist}</Text>
                    <Text style={styles.pickerMeta}>{item.festival_name} · {item.clip_date}</Text>
                  </View>
                  <Ionicons name="add-circle" size={22} color="#8B5CF6" />
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function GroupDetailScreen({ navigation, route }: Props) {
  const { groupId } = route.params;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupClips, setGroupClips] = useState<GroupClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [myClips, setMyClips] = useState<Clip[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const [grp, mems, clips] = await Promise.all([
        getGroupById(groupId),
        getGroupMembers(groupId),
        getGroupClips(groupId),
      ]);

      setGroup(grp);
      setMembers(mems);
      setGroupClips(clips);

      if (user) {
        const me = mems.find((m) => m.user_id === user.id);
        setIsAdmin(me?.role === 'admin' || grp?.created_by === user.id);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddClip = async () => {
    const clips = await getMyClips();
    setMyClips(clips);
    setPickerVisible(true);
  };

  const handleSelectClip = async (clipId: string) => {
    setPickerVisible(false);
    try {
      await addClipToGroup(groupId, clipId);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not add clip');
    }
  };

  const handleLeave = () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveGroup(groupId);
            navigation.goBack();
          } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Could not leave group');
          }
        },
      },
    ]);
  };

  const copyInviteCode = () => {
    if (group?.invite_code) {
      Clipboard.setString(group.invite_code);
      Alert.alert('Copied!', `Invite code ${group.invite_code} copied to clipboard`);
    }
  };

  const handleShareInvite = async () => {
    if (!group?.invite_code) return;
    const message = `Join my group "${group.name}" on Handsup!\n\nInvite code: ${group.invite_code}`;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        // Sharing.shareAsync requires a file URI; fall back to Alert.share text share
      }
      const { Share } = await import('react-native');
      await Share.share({ message });
    } catch {
      Alert.alert('Invite code', group.invite_code);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Group not found.</Text>
      </View>
    );
  }

  const shownMembers = members.slice(0, 5);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Group header */}
        <View style={styles.groupHeader}>
          <View style={styles.groupIconLarge}>
            <Ionicons name="people" size={44} color="#8B5CF6" />
          </View>

          <View style={styles.groupTitleRow}>
            <Text style={styles.groupName}>{group.name}</Text>
            {group.is_private && (
              <View style={styles.privateBadge}>
                <Ionicons name="lock-closed" size={10} color="#8B5CF6" />
                <Text style={styles.privateBadgeText}> Private</Text>
              </View>
            )}
          </View>

          {group.description ? (
            <Text style={styles.groupDescription}>{group.description}</Text>
          ) : null}

          <View style={styles.statsBadges}>
            <View style={styles.statBadge}>
              <Ionicons name="person" size={14} color="#8B5CF6" />
              <Text style={styles.statBadgeText}>{group.member_count} members</Text>
            </View>
            <View style={styles.statBadge}>
              <Ionicons name="film" size={14} color="#8B5CF6" />
              <Text style={styles.statBadgeText}>{group.clip_count} clips</Text>
            </View>
          </View>

          {/* Member avatars */}
          {shownMembers.length > 0 && (
            <View style={styles.avatarRow}>
              {shownMembers.map((m, i) => (
                <View
                  key={m.id}
                  style={[styles.avatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 5 - i }]}
                >
                  {m.profile?.avatar_url ? (
                    <Image source={{ uri: m.profile.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={14} color="#555" />
                    </View>
                  )}
                </View>
              ))}
              {members.length > 5 && (
                <View style={[styles.avatar, styles.avatarMore, { marginLeft: -10 }]}>
                  <Text style={styles.avatarMoreText}>+{members.length - 5}</Text>
                </View>
              )}
            </View>
          )}

          {/* Invite code (admin only) */}
          {isAdmin && group.invite_code && (
            <>
              <TouchableOpacity style={styles.inviteCodeBox} onPress={copyInviteCode}>
                <View>
                  <Text style={styles.inviteCodeLabel}>Invite Code</Text>
                  <Text style={styles.inviteCodeValue}>{group.invite_code}</Text>
                </View>
                <Ionicons name="copy-outline" size={18} color="#8B5CF6" />
              </TouchableOpacity>

              {/* QR code */}
              <View style={styles.qrContainer}>
                <QRCode
                  value={group.invite_code}
                  size={150}
                  color="#FFFFFF"
                  backgroundColor="transparent"
                />
              </View>

              {/* Share invite button */}
              <TouchableOpacity style={styles.shareInviteBtn} onPress={handleShareInvite} activeOpacity={0.85}>
                <Ionicons name="share-outline" size={17} color="#fff" />
                <Text style={styles.shareInviteBtnText}>Share invite</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.addClipBtn} onPress={handleAddClip}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addClipText}>Add Clip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
            <Ionicons name="exit-outline" size={18} color="#e53e3e" />
            <Text style={styles.leaveText}>Leave</Text>
          </TouchableOpacity>
        </View>

        {/* Clips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clips</Text>
          {groupClips.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="film-outline" size={36} color="#333" />
              <Text style={styles.emptyText}>No clips yet</Text>
              <Text style={styles.emptySubText}>Be the first to add a clip to this group</Text>
            </View>
          ) : (
            groupClips.map((gc) => (
              <ClipCard
                key={gc.id}
                groupClip={gc}
                onPress={() =>
                  gc.clip && navigation.navigate('VideoDetail', { video: gc.clip })
                }
              />
            ))
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Clip picker modal */}
      <ClipPickerModal
        visible={pickerVisible}
        clips={myClips}
        onSelect={handleSelectClip}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#e53e3e', fontSize: 16 },

  groupHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  groupIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#1a1030',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  groupName: { fontSize: 24, fontWeight: '800', color: '#fff' },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a0e30',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#4a2a7a',
  },
  privateBadgeText: { fontSize: 11, color: '#8B5CF6', fontWeight: '600' },
  groupDescription: { color: '#aaa', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  statsBadges: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  statBadgeText: { color: '#ccc', fontSize: 13, fontWeight: '600' },

  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#000' },
  avatarImg: { width: 32, height: 32, borderRadius: 16 },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMore: {
    backgroundColor: '#2a1a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMoreText: { fontSize: 10, color: '#8B5CF6', fontWeight: '700' },

  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f0f1a',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a1a5a',
  },
  inviteCodeLabel: { fontSize: 11, color: '#8B5CF6', fontWeight: '600', marginBottom: 2 },
  inviteCodeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: '#0f0f1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a1a5a',
  },
  shareInviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 12,
  },
  shareInviteBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  actionsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  addClipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  addClipText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a0808',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: '#3a0808',
  },
  leaveText: { color: '#e53e3e', fontWeight: '600', fontSize: 15 },

  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 14 },

  // Clip card (matches HomeScreen style)
  card: {
    flexDirection: 'row',
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  thumbnail: { width: 100, height: 80 },
  placeholderThumb: {
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, padding: 10 },
  artist: { fontSize: 14, fontWeight: '700', color: '#fff' },
  festival: { fontSize: 12, color: '#8B5CF6', marginTop: 2 },
  meta: { fontSize: 11, color: '#555', marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: 4 },
  statText: { fontSize: 11, color: '#888' },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#555', fontSize: 15, marginTop: 10 },
  emptySubText: { color: '#444', fontSize: 12, marginTop: 4, textAlign: 'center' },

  // Clip picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  pickerBox: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  pickerEmpty: { alignItems: 'center', paddingVertical: 40 },
  pickerEmptyText: { color: '#555', fontSize: 14 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    gap: 12,
  },
  pickerThumb: { width: 50, height: 40, borderRadius: 6 },
  pickerArtist: { fontSize: 14, fontWeight: '600', color: '#fff' },
  pickerMeta: { fontSize: 11, color: '#888', marginTop: 2 },
});

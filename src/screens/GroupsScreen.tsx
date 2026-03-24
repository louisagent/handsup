// ============================================================
// Handsup — Groups Screen
// Browse my groups, discover public groups, create/join groups
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Group } from '../types';
import { getMyGroups, getPublicGroups, joinGroupByCode } from '../services/groups';

interface Props {
  navigation: any;
}

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.groupCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.groupCardGradient}>
        <Ionicons name="people" size={28} color="#8B5CF6" />
      </View>
      <View style={styles.groupCardInfo}>
        <Text style={styles.groupCardName} numberOfLines={1}>{group.name}</Text>
        <View style={styles.groupCardMeta}>
          <Text style={styles.groupCardMetaText}>
            <Ionicons name="person" size={11} color="#888" /> {group.member_count}
          </Text>
          <Text style={styles.groupCardMetaText}>
            {'  '}
            <Ionicons name="film" size={11} color="#888" /> {group.clip_count}
          </Text>
          {group.is_private && (
            <View style={styles.privateBadge}>
              <Text style={styles.privateBadgeText}>Private</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PublicGroupRow({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.publicRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.publicRowIcon}>
        <Ionicons name="people-outline" size={22} color="#8B5CF6" />
      </View>
      <View style={styles.publicRowInfo}>
        <Text style={styles.publicRowName}>{group.name}</Text>
        {group.description ? (
          <Text style={styles.publicRowDesc} numberOfLines={1}>{group.description}</Text>
        ) : null}
        <Text style={styles.publicRowMeta}>
          {group.member_count} members · {group.clip_count} clips
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#555" />
    </TouchableOpacity>
  );
}

export default function GroupsScreen({ navigation }: Props) {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [mine, pub] = await Promise.all([getMyGroups(), getPublicGroups(30)]);
      setMyGroups(mine);
      setPublicGroups(pub);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) return;
    try {
      setJoining(true);
      const group = await joinGroupByCode(inviteCode.trim().toLowerCase());
      setCodeModalVisible(false);
      setInviteCode('');
      navigation.navigate('GroupDetail', { groupId: group.id });
    } catch (err: any) {
      Alert.alert('Invalid Code', err?.message ?? 'Could not find that group');
    } finally {
      setJoining(false);
    }
  };

  const goToGroup = (groupId: string) =>
    navigation.navigate('GroupDetail', { groupId });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* My Groups */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Groups</Text>
              <TouchableOpacity onPress={() => setCodeModalVisible(true)}>
                <Text style={styles.joinCodeLink}>Join with code</Text>
              </TouchableOpacity>
            </View>

            {myGroups.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={36} color="#333" />
                <Text style={styles.emptyText}>No groups yet.</Text>
                <Text style={styles.emptySubText}>Go to a festival with friends and create one. 🎪</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {myGroups.map((g) => (
                  <GroupCard key={g.id} group={g} onPress={() => goToGroup(g.id)} />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Discover */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Discover</Text>
            {publicGroups.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No public groups yet</Text>
              </View>
            ) : (
              <View style={styles.publicList}>
                {publicGroups.map((g) => (
                  <PublicGroupRow key={g.id} group={g} onPress={() => goToGroup(g.id)} />
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* Join with code modal */}
      <Modal
        visible={codeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCodeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Join with Code</Text>
            <TextInput
              style={styles.codeInput}
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="Enter invite code"
              placeholderTextColor="#555"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setCodeModalVisible(false);
                  setInviteCode('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalJoinBtn, joining && { opacity: 0.6 }]}
                onPress={handleJoinByCode}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalJoinText}>Join</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  createBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: { paddingTop: 24, paddingBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  joinCodeLink: { fontSize: 13, color: '#8B5CF6', fontWeight: '600' },

  horizontalScroll: { paddingLeft: 20, paddingRight: 8 },
  groupCard: {
    backgroundColor: '#0f0f0f',
    borderRadius: 14,
    padding: 14,
    width: 140,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  groupCardGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1a1030',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  groupCardInfo: {},
  groupCardName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 6 },
  groupCardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  groupCardMetaText: { fontSize: 12, color: '#888' },
  privateBadge: {
    backgroundColor: '#2a1a3a',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: 4,
  },
  privateBadgeText: { fontSize: 10, color: '#8B5CF6', fontWeight: '600' },

  publicList: { paddingHorizontal: 20 },
  publicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  publicRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1030',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  publicRowInfo: { flex: 1 },
  publicRowName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  publicRowDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  publicRowMeta: { fontSize: 11, color: '#555', marginTop: 3 },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyText: { color: '#555', fontSize: 15, marginTop: 10 },
  emptySubText: { color: '#444', fontSize: 12, marginTop: 4, textAlign: 'center' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 28,
    paddingBottom: 48,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 18 },
  codeInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    letterSpacing: 1.5,
  },
  modalActions: { flexDirection: 'row', marginTop: 18, gap: 12 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
  },
  modalCancelText: { color: '#aaa', fontWeight: '600', fontSize: 15 },
  modalJoinBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  modalJoinText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

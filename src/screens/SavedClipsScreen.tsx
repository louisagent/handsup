// ============================================================
// Handsup — Saved Clips Screen (Bookmarks + Collections)
// Shows clips the user has saved/bookmarked.
// Merges local AsyncStorage saves with Supabase saves table.
// Collections tab allows organising clips into named lists.
// ============================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
  Share,
  Animated,
} from 'react-native';

// ── Helpers ────────────────────────────────────────────────

function isSignedUrl(url?: string | null): boolean {
  return !!(url && url.includes('?token='));
}
import { Ionicons } from '@expo/vector-icons';
import { useSavedClips } from '../hooks/useSavedClips';
import { supabase } from '../services/supabase';
import { Clip } from '../types';
import * as Haptics from 'expo-haptics';
import { isExpiringSoon, getExpiryLabel } from '../utils/clipUtils';
import {
  getMyCollections,
  createCollection,
  getCollectionClips,
  Collection,
} from '../services/collections';

type TabName = 'All Saved' | 'Collections';

// ── Collection Clips View ─────────────────────────────────

function CollectionClipsView({
  collection,
  onBack,
  navigation,
}: {
  collection: Collection;
  onBack: () => void;
  navigation: any;
}) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCollectionClips(collection.id)
      .then(setClips)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [collection.id]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.collectionHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#8B5CF6" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.collectionHeaderName}>{collection.name}</Text>
          {collection.description ? (
            <Text style={styles.collectionHeaderDesc}>{collection.description}</Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : clips.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={48} color="#333" />
          <Text style={styles.emptyTitle}>No clips yet</Text>
          <Text style={styles.emptySubtitle}>
            Long press "Save" on any clip to add it to this collection.
          </Text>
        </View>
      ) : (
        <FlatList
          data={clips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('VerticalFeed', { initialClip: item })}
              activeOpacity={0.85}
            >
              <View style={styles.thumbnailContainer}>
                {item.thumbnail_url ? (
                  <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
                ) : (
                  <View style={[styles.thumbnail, styles.placeholderThumb]}>
                    <Ionicons name="play-circle-outline" size={32} color="#8B5CF6" />
                  </View>
                )}
                {item.duration_seconds != null && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{item.duration_seconds}s</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.artist} numberOfLines={1}>{item.artist}</Text>
                <Text style={styles.festival}>{item.festival_name}</Text>
                <Text style={styles.meta}>{item.location} · {item.clip_date}</Text>
                <View style={styles.stats}>
                  <Text style={styles.statText}>▶ {item.view_count.toLocaleString()}</Text>
                  <Text style={styles.statText}>⬇ {item.download_count.toLocaleString()}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ── Collections List View ──────────────────────────────────

function CollectionsListView({
  navigation,
}: {
  navigation: any;
}) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyCollections();
      setCollections(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => {
    Alert.prompt(
      'New Collection',
      'Enter a name for your collection',
      async (name?: string) => {
        if (!name?.trim()) return;
        try {
          const col = await createCollection(name.trim());
          setCollections((prev) => [col, ...prev]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e: any) {
          Alert.alert('Error', e?.message ?? 'Could not create collection.');
        }
      },
      'plain-text'
    );
  };

  if (selectedCollection) {
    return (
      <CollectionClipsView
        collection={selectedCollection}
        onBack={() => setSelectedCollection(null)}
        navigation={navigation}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Create button */}
      <TouchableOpacity
        style={styles.createCollectionBtn}
        onPress={handleCreate}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={20} color="#8B5CF6" />
        <Text style={styles.createCollectionBtnText}>New Collection</Text>
      </TouchableOpacity>

      {collections.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-outline" size={52} color="#333" />
          <Text style={styles.emptyTitle}>No collections yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a collection and long press "Save" on any clip to organise your saves.
          </Text>
        </View>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.collectionsListContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.collectionRow}
              onPress={() => setSelectedCollection(item)}
              activeOpacity={0.85}
            >
              <View style={styles.collectionIcon}>
                <Ionicons name="folder" size={26} color="#8B5CF6" />
              </View>
              <View style={styles.collectionInfo}>
                <View style={styles.collectionNameRow}>
                  <Text style={styles.collectionName}>{item.name}</Text>
                  {item.is_public && (
                    <View style={styles.publicBadge}>
                      <Text style={styles.publicBadgeText}>Public</Text>
                    </View>
                  )}
                </View>
                {item.description ? (
                  <Text style={styles.collectionDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
                <Text style={styles.collectionDate}>
                  Created {new Date(item.created_at).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#333" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────

const MAX_BULK_SELECT = 10;

export default function SavedClipsScreen({ navigation }: any) {
  const { savedIds, loaded, toggleSave } = useSavedClips();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>('All Saved');

  // Bulk select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Animated bottom bar
  const bottomBarAnim = useRef(new Animated.Value(0)).current;

  // Animate bottom bar in/out
  useEffect(() => {
    Animated.spring(bottomBarAnim, {
      toValue: selectMode ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [selectMode, bottomBarAnim]);

  // ── Fetch clips — merges local saves with Supabase saves ──

  const fetchSavedClips = useCallback(async () => {
    try {
      // 1. Get Supabase saves for current user
      const { data: { user } } = await supabase.auth.getUser();
      let supabaseIds: string[] = [];
      if (user) {
        const { data: savesData } = await supabase
          .from('saves')
          .select('clip_id')
          .eq('user_id', user.id);
        supabaseIds = (savesData ?? []).map((s: { clip_id: string }) => s.clip_id);
      }

      // 2. Union of local + Supabase saved IDs
      const allIds = Array.from(new Set([...Array.from(savedIds), ...supabaseIds]));

      if (allIds.length === 0) {
        setClips([]);
        return;
      }

      // 3. Batch fetch clips from Supabase
      const { data, error } = await supabase
        .from('clips')
        .select('*, uploader:profiles(username, is_verified)')
        .in('id', allIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClips(data ?? []);
    } catch (err: any) {
      console.warn('SavedClipsScreen fetch error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [savedIds]);

  useEffect(() => {
    if (loaded) {
      fetchSavedClips();
    }
  }, [loaded, fetchSavedClips]);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchSavedClips();
  };

  const handleUnsave = (clip: Clip) => {
    Alert.alert(
      'Remove from saved?',
      `"${clip.artist} @ ${clip.festival_name}" will be removed from your bookmarks.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await toggleSave(clip.id);
            // Also delete from Supabase saves
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('saves')
                .delete()
                .eq('user_id', user.id)
                .eq('clip_id', clip.id);
            }
            setClips((prev) => prev.filter((c) => c.id !== clip.id));
          },
        },
      ]
    );
  };

  const enterSelectMode = (clip: Clip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectMode(true);
    setSelectedIds(new Set([clip.id]));
  };

  const toggleSelect = (clipId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clipId)) {
        next.delete(clipId);
        if (next.size === 0) {
          setSelectMode(false);
        }
      } else {
        if (next.size >= MAX_BULK_SELECT) {
          Alert.alert('Max selection', `You can select up to ${MAX_BULK_SELECT} clips at once.`);
          return prev;
        }
        next.add(clipId);
      }
      return next;
    });
  };

  const cancelSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkUnsave = async () => {
    const ids = Array.from(selectedIds);
    Alert.alert(
      'Remove selected?',
      `Remove ${ids.length} clip${ids.length !== 1 ? 's' : ''} from saved?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const { data: { user } } = await supabase.auth.getUser();
            for (const id of ids) {
              await toggleSave(id);
              if (user) {
                await supabase.from('saves').delete().eq('user_id', user.id).eq('clip_id', id);
              }
            }
            setClips((prev) => prev.filter((c) => !ids.includes(c.id)));
            cancelSelectMode();
          },
        },
      ]
    );
  };

  const handleBulkShare = () => {
    const ids = Array.from(selectedIds);
    const selected = clips.filter((c) => ids.includes(c.id));
    if (selected.length === 0) return;

    const lines = selected.map(
      (c) => `• ${c.artist} @ ${c.festival_name} — https://handsuplive.com/clip/${c.id}`
    );
    const message =
      selected.length === 1
        ? `Check out ${selected[0].artist} at ${selected[0].festival_name} on Handsup 🙌\nhttps://handsuplive.com/clip/${selected[0].id}`
        : `Check out these ${selected.length} clips on Handsup 🙌\n\n${lines.join('\n')}`;

    Share.share({ message }).catch(() => {});
  };

  const renderClipCard = (clip: Clip) => (
    <TouchableOpacity
      key={clip.id}
      style={[styles.card, selectMode && selectedIds.has(clip.id) && styles.cardSelected]}
      onPress={() => {
        if (selectMode) {
          toggleSelect(clip.id);
        } else {
          navigation.navigate('VerticalFeed', { initialClip: clip });
        }
      }}
      onLongPress={() => {
        if (selectMode) {
          toggleSelect(clip.id);
        } else {
          enterSelectMode(clip);
        }
      }}
      activeOpacity={0.85}
      delayLongPress={400}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {clip.thumbnail_url ? (
          <Image source={{ uri: clip.thumbnail_url }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumb]}>
            <Ionicons name="play-circle-outline" size={32} color="#8B5CF6" />
          </View>
        )}
        {clip.duration_seconds != null && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{clip.duration_seconds}s</Text>
          </View>
        )}
        {isSignedUrl(clip.video_url) && (
          <TouchableOpacity
            style={styles.expiryBadge}
            onPress={() =>
              Alert.alert(
                '⚠️ Link may expire',
                "This clip's link may expire. Download it now to keep it.",
                [{ text: 'OK' }]
              )
            }
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.expiryBadgeText}>⚠️ Link may expire</Text>
          </TouchableOpacity>
        )}
        {selectMode && (
          <View style={styles.checkboxOverlay}>
            <Ionicons
              name={selectedIds.has(clip.id) ? 'checkmark-circle' : 'ellipse-outline'}
              size={28}
              color={selectedIds.has(clip.id) ? '#8B5CF6' : '#fff'}
            />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.artist} numberOfLines={1}>{clip.artist}</Text>
          {/* Unsave button — hidden in select mode */}
          {!selectMode && (
            <TouchableOpacity
              onPress={() => handleUnsave(clip)}
              style={styles.unsaveBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="bookmark" size={20} color="#8B5CF6" />
            </TouchableOpacity>
          )}
        </View>
        {/* Expiry warning banner */}
        {clip.expires_at && isExpiringSoon(clip.expires_at) && (
          <View style={styles.expiryWarningBanner}>
            <Text style={styles.expiryWarningIcon}>⚠️</Text>
            <Text style={styles.expiryWarningText}>{getExpiryLabel(clip.expires_at)}</Text>
          </View>
        )}
        <Text style={styles.festival}>{clip.festival_name}</Text>
        {clip.uploader?.username ? (
          <View style={styles.uploaderRow}>
            <Text style={styles.uploader}>@{clip.uploader.username}</Text>
            {clip.uploader.is_verified && (
              <Text style={styles.verifiedBadge}>⚡</Text>
            )}
          </View>
        ) : null}
        <Text style={styles.meta}>
          {clip.location} · {clip.clip_date}
        </Text>
        {clip.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {clip.description}
          </Text>
        ) : null}
        <View style={styles.stats}>
          <Text style={styles.statText}>▶ {clip.view_count.toLocaleString()}</Text>
          <Text style={styles.statText}>⬇ {clip.download_count.toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const isLoading = loading || !loaded;

  return (
    <View style={styles.container}>
      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(['All Saved', 'Collections'] as TabName[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabPillText, activeTab === tab && styles.tabPillTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Collections tab */}
      {activeTab === 'Collections' && (
        <CollectionsListView navigation={navigation} />
      )}

      {/* Animated bottom action bar — bulk select */}
      <Animated.View
        style={[
          styles.bottomBar,
          {
            transform: [
              {
                translateY: bottomBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [120, 0],
                }),
              },
            ],
            opacity: bottomBarAnim,
            pointerEvents: selectMode ? 'auto' : 'none',
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.bottomBarBtn, styles.bottomBarUnsaveBtn, selectedIds.size === 0 && styles.bottomBarBtnDisabled]}
          onPress={handleBulkUnsave}
          disabled={selectedIds.size === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.bottomBarBtnIcon}>🗑</Text>
          <Text style={[styles.bottomBarBtnText, selectedIds.size === 0 && styles.bottomBarBtnTextDisabled]}>
            Unsave
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomBarBtn, styles.bottomBarShareBtn, selectedIds.size === 0 && styles.bottomBarBtnDisabled]}
          onPress={handleBulkShare}
          disabled={selectedIds.size === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.bottomBarBtnIcon}>↗</Text>
          <Text style={[styles.bottomBarBtnText, selectedIds.size === 0 && styles.bottomBarBtnTextDisabled]}>
            Share
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* All Saved tab */}
      {activeTab === 'All Saved' && (
        <>
          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          ) : (
            <ScrollView
              style={selectMode ? { marginBottom: 80 } : undefined}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#8B5CF6"
                  colors={['#8B5CF6']}
                />
              }
              contentContainerStyle={clips.length === 0 ? styles.emptyContainer : styles.listContent}
            >
              {clips.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="bookmark-outline" size={52} color="#333" />
                  <Text style={styles.emptyTitle}>No saved clips yet.</Text>
                  <Text style={styles.emptySubtitle}>
                    Find something worth keeping. 🔖
                  </Text>
                </View>
              ) : (
                <>
                  {selectMode ? (
                    <View style={styles.selectModeHeader}>
                      <Text style={styles.selectModeCount}>
                        {selectedIds.size} selected
                      </Text>
                      <TouchableOpacity
                        style={styles.selectCancelBtn}
                        onPress={cancelSelectMode}
                      >
                        <Text style={styles.selectCancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.countRow}>
                      <Text style={styles.countText}>
                        {clips.length} saved clip{clips.length !== 1 ? 's' : ''}
                      </Text>
                      <Text style={styles.longPressHint}>Long press to select</Text>
                    </View>
                  )}
                  {clips.map(renderClipCard)}
                </>
              )}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Tab switcher
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  tabPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  tabPillActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  tabPillTextActive: {
    color: '#fff',
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 },
  emptyContainer: { flex: 1 },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingBottom: 8,
  },
  countText: { color: '#555', fontSize: 13, fontWeight: '600' },
  longPressHint: { color: '#333', fontSize: 11 },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Card
  card: {
    backgroundColor: '#161616',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 16,
  },
  thumbnailContainer: { position: 'relative' },
  thumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderThumb: {
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  expiryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(234,88,12,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  expiryBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  cardBody: { padding: 14 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  artist: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  festival: { fontSize: 14, color: '#8B5CF6', marginTop: 2, fontWeight: '600' },
  uploaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  uploader: { fontSize: 12, color: '#666' },
  verifiedBadge: { fontSize: 11, color: '#8B5CF6' },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  description: { fontSize: 13, color: '#aaa', marginTop: 8, lineHeight: 18 },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  statText: { fontSize: 12, color: '#555' },
  unsaveBtn: {
    padding: 4,
  },

  // Expiry warning
  expiryWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251,146,60,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  expiryWarningIcon: {
    fontSize: 12,
  },
  expiryWarningText: {
    fontSize: 12,
    color: '#fb923c',
    fontWeight: '600',
  },

  // Bulk select
  cardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: '#1a1228',
  },
  checkboxOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
  },
  selectModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingBottom: 8,
  },
  selectModeCount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  selectCancelBtn: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  selectCancelText: {
    color: '#aaa',
    fontWeight: '700',
    fontSize: 13,
  },

  // Animated bottom action bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
    gap: 12,
  },
  bottomBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bottomBarUnsaveBtn: {
    backgroundColor: '#3a1a1a',
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  bottomBarShareBtn: {
    backgroundColor: '#1a1a3a',
    borderWidth: 1,
    borderColor: '#2d2d7f',
  },
  bottomBarBtnDisabled: {
    opacity: 0.35,
  },
  bottomBarBtnIcon: {
    fontSize: 18,
  },
  bottomBarBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  bottomBarBtnTextDisabled: {
    color: '#888',
  },

  // Collections
  collectionsListContent: {
    padding: 16,
    paddingBottom: 40,
  },
  createCollectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  createCollectionBtnText: {
    color: '#8B5CF6',
    fontWeight: '700',
    fontSize: 15,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 12,
    gap: 12,
  },
  collectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a1a4a',
  },
  collectionInfo: { flex: 1 },
  collectionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  publicBadge: {
    backgroundColor: '#1a2a1a',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4ade8033',
  },
  publicBadgeText: {
    fontSize: 10,
    color: '#4ade80',
    fontWeight: '700',
  },
  collectionDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  collectionDate: {
    fontSize: 11,
    color: '#444',
  },

  // Collection detail header
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionHeaderName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  collectionHeaderDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

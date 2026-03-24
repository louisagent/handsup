// ============================================================
// Handsup — Notifications Screen (Real Data)
// Reads from Supabase notifications table
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { getNotifications, markAllRead, DbNotification } from '../services/notifications_db';

// ── Helpers ────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function notificationText(n: DbNotification): string {
  const actor = n.actor?.username ? `@${n.actor.username}` : 'Someone';
  switch (n.type) {
    case 'new_follower':
      return `${actor} started following you`;
    case 'clip_liked':
      return `${actor} liked your clip`;
    case 'comment':
      return `${actor} commented on your clip`;
    case 'clip_downloaded':
      return `${actor} downloaded your clip`;
    default:
      return `${actor} interacted with you`;
  }
}

function notificationIcon(type: string): string {
  switch (type) {
    case 'new_follower': return '👤';
    case 'clip_liked':   return '❤️';
    case 'comment':      return '💬';
    case 'clip_downloaded': return '⬇️';
    default:             return '🔔';
  }
}

function notificationColor(type: string): string {
  switch (type) {
    case 'new_follower':     return '#8B5CF6';
    case 'clip_liked':       return '#EF4444';
    case 'comment':          return '#3B82F6';
    case 'clip_downloaded':  return '#10B981';
    default:                 return '#8B5CF6';
  }
}

// ── Row Component ──────────────────────────────────────────

function NotifRow({ notif }: { notif: DbNotification }) {
  const color = notificationColor(notif.type);
  const text = notificationText(notif);

  return (
    <View style={[styles.item, !notif.read && styles.itemUnread]}>
      {/* Purple left border for unread */}
      {!notif.read && <View style={styles.unreadBar} />}

      <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
        <Text style={styles.icon}>{notificationIcon(notif.type)}</Text>
      </View>

      <View style={styles.itemBody}>
        <View style={styles.itemTop}>
          <Text style={styles.itemText} numberOfLines={2}>{text}</Text>
          <Text style={styles.itemTime}>{timeAgo(notif.created_at)}</Text>
        </View>
        {notif.clip && (
          <Text style={styles.clipSubtext} numberOfLines={1}>
            {notif.clip.artist} @ {notif.clip.festival_name}
          </Text>
        )}
      </View>

      {!notif.read && <View style={styles.unreadDot} />}
    </View>
  );
}

// ── Skeleton ───────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonIcon} />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silently fail
    } finally {
      setMarkingRead(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadBadge}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            style={styles.markAllBtn}
            disabled={markingRead}
            activeOpacity={0.8}
          >
            {markingRead ? (
              <ActivityIndicator size="small" color="#aaa" />
            ) : (
              <Text style={styles.markAllText}>Mark all read</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8B5CF6" colors={["#8B5CF6"]} />
        }
      >
        {loading ? (
          <View style={styles.list}>
            {[0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>Nothing yet.</Text>
            <Text style={styles.emptySubtitle}>
              Upload a clip and watch the reactions roll in. 🙌
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((n) => (
              <NotifRow key={n.id} notif={n} />
            ))}
          </View>
        )}

        {!loading && notifications.length > 0 && (
          <Text style={styles.footer}>You're all caught up 🙌</Text>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },

  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  unreadBadge: { fontSize: 13, color: '#8B5CF6', marginTop: 2, fontWeight: '600' },
  markAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 110,
    alignItems: 'center',
  },
  markAllText: { color: '#aaa', fontSize: 12, fontWeight: '600' },

  list: { padding: 16, gap: 4 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 4,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
  },
  itemUnread: {
    backgroundColor: '#120e1e',
    borderWidth: 1,
    borderColor: '#2a1a4a',
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: { fontSize: 20 },
  itemBody: { flex: 1 },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#ddd',
    fontWeight: '500',
    flex: 1,
    lineHeight: 19,
  },
  itemTime: { fontSize: 11, color: '#555', flexShrink: 0, marginTop: 1 },
  clipSubtext: {
    fontSize: 12,
    color: '#555',
    marginTop: 3,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    flexShrink: 0,
  },

  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 4,
    backgroundColor: '#0a0a0a',
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  skeletonBody: { flex: 1, gap: 8 },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
    width: '85%',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },

  footer: {
    textAlign: 'center',
    color: '#333',
    fontSize: 13,
    padding: 24,
  },
});

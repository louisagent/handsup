import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';

interface Notification {
  id: string;
  type: 'new_clip' | 'trending' | 'festival' | 'upload' | 'system';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'new_clip',
    title: 'New Tame Impala clips',
    body: '14 new clips just uploaded from Laneway Melbourne. Check them out.',
    time: '2m ago',
    read: false,
  },
  {
    id: '2',
    type: 'trending',
    title: 'Trending right now 🔥',
    body: 'Fred again.. at Field Day is blowing up — 800 downloads in the last hour.',
    time: '18m ago',
    read: false,
  },
  {
    id: '3',
    type: 'upload',
    title: 'Your clip is taking off',
    body: 'Your Flume upload has been downloaded 47 times today. 🙌',
    time: '1h ago',
    read: true,
  },
  {
    id: '4',
    type: 'festival',
    title: 'Splendour in the Grass',
    body: 'Clips from the weekend are live. 389 uploads from 3 stages.',
    time: '3h ago',
    read: true,
  },
  {
    id: '5',
    type: 'new_clip',
    title: 'New Disclosure clips',
    body: 'Someone uploaded 3 clips from the Glastonbury late night tent.',
    time: '5h ago',
    read: true,
  },
  {
    id: '6',
    type: 'system',
    title: 'Welcome to Handsup 🙌',
    body: 'You\'re part of the founding community. Hands up. Phone down.',
    time: '2d ago',
    read: true,
  },
];

const typeIcon: Record<string, string> = {
  new_clip: '🎥',
  trending: '🔥',
  festival: '🎪',
  upload: '⬆',
  system: '🙌',
};

const typeColor: Record<string, string> = {
  new_clip: '#8B5CF6',
  trending: '#F59E0B',
  festival: '#10B981',
  upload: '#3B82F6',
  system: '#8B5CF6',
};

const preferenceItems = [
  { key: 'new_clips', label: 'New clips from artists I follow', default: true },
  { key: 'trending', label: 'Trending clips & sets', default: true },
  { key: 'festivals', label: 'Upcoming festival alerts', default: true },
  { key: 'my_uploads', label: 'Activity on my uploads', default: true },
  { key: 'weekly', label: 'Weekly digest', default: false },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(preferenceItems.map((p) => [p.key, p.default]))
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadBadge}>{unreadCount} unread</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowPrefs(!showPrefs)}>
            <Text style={styles.prefIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Preferences panel */}
        {showPrefs && (
          <View style={styles.prefsPanel}>
            <Text style={styles.prefsTitle}>Notification preferences</Text>
            {preferenceItems.map((item) => (
              <View key={item.key} style={styles.prefRow}>
                <Text style={styles.prefLabel}>{item.label}</Text>
                <Switch
                  value={prefs[item.key]}
                  onValueChange={(val) =>
                    setPrefs((prev) => ({ ...prev, [item.key]: val }))
                  }
                  trackColor={{ false: '#2a2a2a', true: '#8B5CF6' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>
        )}

        {/* Notification list */}
        <View style={styles.list}>
          {notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[styles.item, !n.read && styles.itemUnread]}
              onPress={() => markRead(n.id)}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: typeColor[n.type] + '22' },
                ]}
              >
                <Text style={styles.icon}>{typeIcon[n.type]}</Text>
              </View>
              <View style={styles.itemBody}>
                <View style={styles.itemTop}>
                  <Text style={styles.itemTitle}>{n.title}</Text>
                  <Text style={styles.itemTime}>{n.time}</Text>
                </View>
                <Text style={styles.itemText}>{n.body}</Text>
              </View>
              {!n.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.footer}>You're all caught up 🙌</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
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
  headerActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  markAllText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  prefIcon: { fontSize: 22 },
  prefsPanel: {
    margin: 16,
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  prefsTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 16 },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  prefLabel: { fontSize: 13, color: '#aaa', flex: 1, marginRight: 12 },
  list: { padding: 16, gap: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 4,
  },
  itemUnread: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#222' },
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
    marginBottom: 4,
  },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1, marginRight: 8 },
  itemTime: { fontSize: 11, color: '#555', flexShrink: 0 },
  itemText: { fontSize: 13, color: '#888', lineHeight: 18 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    marginTop: 4,
    flexShrink: 0,
  },
  footer: {
    textAlign: 'center',
    color: '#333',
    fontSize: 13,
    padding: 24,
  },
});

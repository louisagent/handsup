// ============================================================
// Handsup — Admin / Moderation Screen
// Only accessible to users with role = 'moderator' | 'admin'
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPendingReports, resolveReport, deleteClip } from '../services/clips';
import { isModerator, banUser, unbanUser, getBannedUsers } from '../services/moderator';
import { supabase } from '../services/supabase';

// ── Types ──────────────────────────────────────────────────

interface Report {
  id: string;
  clip_id: string;
  reporter_id: string;
  reason: string;
  detail?: string;
  resolved: boolean;
  created_at: string;
  clip?: {
    id: string;
    artist: string;
    festival_name: string;
    location: string;
    thumbnail_url?: string;
    uploader_id?: string;
    uploader?: { username: string };
  };
  reporter?: { username: string };
}

interface BannedUser {
  id: string;
  user_id: string;
  reason: string | null;
  banned_at: string;
  user?: { username: string };
}

interface VerifyApp {
  id: string;
  user_id: string;
  reason: string;
  social_links: string | null;
  status: string;
  created_at: string;
  user?: { username: string; is_verified: boolean };
}

type Tab = 'reports' | 'banned' | 'verify';

// ── Helpers ────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Report Card ────────────────────────────────────────────

function ReportCard({
  report,
  onApprove,
  onRemove,
  onBan,
  resolving,
}: {
  report: Report;
  onApprove: () => void;
  onRemove: () => void;
  onBan: () => void;
  resolving: boolean;
}) {
  return (
    <View style={styles.card}>
      {/* Clip info */}
      <View style={styles.clipRow}>
        <View style={styles.thumb}>
          <Ionicons name="play-circle-outline" size={24} color="#8B5CF6" />
        </View>
        <View style={styles.clipInfo}>
          <Text style={styles.artist} numberOfLines={1}>
            {report.clip?.artist ?? 'Unknown artist'}
          </Text>
          <Text style={styles.festival} numberOfLines={1}>
            {report.clip?.festival_name ?? ''}
          </Text>
          {report.clip?.uploader?.username ? (
            <Text style={styles.uploader}>@{report.clip.uploader.username}</Text>
          ) : null}
        </View>
      </View>

      {/* Report details */}
      <View style={styles.reportDetails}>
        <View style={styles.reasonRow}>
          <Ionicons name="flag-outline" size={14} color="#EF4444" />
          <Text style={styles.reason}>{report.reason}</Text>
        </View>
        {report.detail ? (
          <Text style={styles.detail} numberOfLines={2}>
            "{report.detail}"
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.reporter}>
            Reported by @{report.reporter?.username ?? 'unknown'}
          </Text>
          <Text style={styles.timeAgo}>{timeAgo(report.created_at)}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {resolving ? (
          <ActivityIndicator size="small" color="#8B5CF6" style={{ padding: 14 }} />
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={onApprove}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={15} color="#10B981" />
              <Text style={styles.approveBtnText}>Keep</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.removeBtn]}
              onPress={onRemove}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.banBtn]}
              onPress={onBan}
              activeOpacity={0.8}
            >
              <Ionicons name="ban-outline" size={15} color="#F97316" />
              <Text style={styles.banBtnText}>Ban User</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// ── Banned User Card ───────────────────────────────────────

function BannedUserCard({
  bannedUser,
  onUnban,
  unbanning,
}: {
  bannedUser: BannedUser;
  onUnban: () => void;
  unbanning: boolean;
}) {
  return (
    <View style={styles.bannedCard}>
      <View style={styles.bannedIcon}>
        <Ionicons name="ban" size={20} color="#EF4444" />
      </View>
      <View style={styles.bannedInfo}>
        <Text style={styles.bannedUsername}>
          @{bannedUser.user?.username ?? 'unknown'}
        </Text>
        {bannedUser.reason ? (
          <Text style={styles.bannedReason} numberOfLines={1}>
            Reason: {bannedUser.reason}
          </Text>
        ) : null}
        <Text style={styles.bannedTime}>{timeAgo(bannedUser.banned_at)}</Text>
      </View>
      {unbanning ? (
        <ActivityIndicator size="small" color="#8B5CF6" />
      ) : (
        <TouchableOpacity
          style={styles.unbanBtn}
          onPress={onUnban}
          activeOpacity={0.8}
        >
          <Text style={styles.unbanBtnText}>Unban</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────

export default function AdminScreen({ navigation }: any) {
  const [checkingRole, setCheckingRole] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('reports');

  // Reports state
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsRefreshing, setReportsRefreshing] = useState(false);
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());

  // Banned users state
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [bannedLoading, setBannedLoading] = useState(true);
  const [unbanningIds, setUnbanningIds] = useState<Set<string>>(new Set());

  // Verification apps state
  const [verifyApps, setVerifyApps] = useState<VerifyApp[]>([]);
  const [verifyLoading, setVerifyLoading] = useState(true);
  const [reviewingIds, setReviewingIds] = useState<Set<string>>(new Set());

  // ── Role check ─────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const mod = await isModerator();
        setHasAccess(mod);
        if (mod) {
          loadReports();
          loadBannedUsers();
          loadVerificationApps();
        }
      } catch {
        setHasAccess(false);
      } finally {
        setCheckingRole(false);
      }
    })();
  }, []);

  // ── Data loaders ───────────────────────────────────────────

  const loadReports = useCallback(async () => {
    try {
      const data = await getPendingReports() as Report[];
      setReports(data);
    } catch {
      // silently fail
    } finally {
      setReportsLoading(false);
      setReportsRefreshing(false);
    }
  }, []);

  const loadBannedUsers = useCallback(async () => {
    try {
      const data = await getBannedUsers() as BannedUser[];
      setBannedUsers(data);
    } catch {
      // silently fail
    } finally {
      setBannedLoading(false);
    }
  }, []);

  const loadVerificationApps = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('verification_applications')
        .select('*, user:profiles!user_id(username, is_verified)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      setVerifyApps(data ?? []);
    } catch {}
    finally { setVerifyLoading(false); }
  }, []);

  const handleRefreshReports = () => {
    setReportsRefreshing(true);
    loadReports();
  };

  // ── Report actions ─────────────────────────────────────────

  const markResolving = (reportId: string, active: boolean) => {
    setResolvingIds((prev) => {
      const next = new Set(prev);
      if (active) next.add(reportId);
      else next.delete(reportId);
      return next;
    });
  };

  const handleApprove = async (report: Report) => {
    markResolving(report.id, true);
    try {
      await resolveReport(report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch {
      Alert.alert('Error', 'Could not resolve this report.');
    } finally {
      markResolving(report.id, false);
    }
  };

  const handleRemove = (report: Report) => {
    Alert.alert(
      'Remove Clip',
      `Remove the clip by "${report.clip?.artist}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!report.clip_id) return;
            markResolving(report.id, true);
            try {
              await deleteClip(report.clip_id);
              await resolveReport(report.id);
              setReports((prev) => prev.filter((r) => r.id !== report.id));
            } catch {
              Alert.alert('Error', 'Could not remove the clip.');
            } finally {
              markResolving(report.id, false);
            }
          },
        },
      ]
    );
  };

  const handleBanUploader = (report: Report) => {
    const username = report.clip?.uploader?.username ?? 'this user';
    const uploaderId = report.clip?.uploader_id;
    if (!uploaderId) {
      Alert.alert('Error', 'Cannot identify uploader.');
      return;
    }

    Alert.alert(
      'Ban User',
      `Ban @${username}? They will no longer be able to use the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Ban Reason (optional)',
              'Enter a reason for the ban',
              async (reason?: string) => {
                markResolving(report.id, true);
                try {
                  await banUser(uploaderId, reason?.trim() || undefined);
                  await resolveReport(report.id);
                  setReports((prev) => prev.filter((r) => r.id !== report.id));
                  loadBannedUsers();
                  Alert.alert('Banned', `@${username} has been banned.`);
                } catch {
                  Alert.alert('Error', 'Could not ban this user.');
                } finally {
                  markResolving(report.id, false);
                }
              },
              'plain-text'
            );
          },
        },
      ]
    );
  };

  // ── Unban action ───────────────────────────────────────────

  const handleUnban = (bannedUser: BannedUser) => {
    const username = bannedUser.user?.username ?? 'this user';
    Alert.alert(
      'Unban User',
      `Remove the ban for @${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unban',
          onPress: async () => {
            setUnbanningIds((prev) => new Set(prev).add(bannedUser.id));
            try {
              await unbanUser(bannedUser.user_id);
              setBannedUsers((prev) => prev.filter((b) => b.id !== bannedUser.id));
            } catch {
              Alert.alert('Error', 'Could not unban this user.');
            } finally {
              setUnbanningIds((prev) => {
                const next = new Set(prev);
                next.delete(bannedUser.id);
                return next;
              });
            }
          },
        },
      ]
    );
  };

  // ── Verify actions ─────────────────────────────────────────

  const handleApproveVerify = async (app: VerifyApp) => {
    const username = app.user?.username ?? 'this user';
    Alert.alert(
      'Approve Verification',
      `Grant verified badge to @${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setReviewingIds((prev) => new Set(prev).add(app.id));
            try {
              await supabase.from('profiles').update({ is_verified: true }).eq('id', app.user_id);
              const { data: { user } } = await supabase.auth.getUser();
              await supabase
                .from('verification_applications')
                .update({ status: 'approved', reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
                .eq('id', app.id);
              setVerifyApps((prev) => prev.filter((a) => a.id !== app.id));
              Alert.alert('Approved', `@${username} is now verified ⚡`);
            } catch {
              Alert.alert('Error', 'Could not approve application.');
            } finally {
              setReviewingIds((prev) => { const next = new Set(prev); next.delete(app.id); return next; });
            }
          },
        },
      ]
    );
  };

  const handleRejectVerify = async (app: VerifyApp) => {
    const username = app.user?.username ?? 'this user';
    Alert.alert(
      'Reject Application',
      `Reject @${username}'s verification request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setReviewingIds((prev) => new Set(prev).add(app.id));
            try {
              const { data: { user } } = await supabase.auth.getUser();
              await supabase
                .from('verification_applications')
                .update({ status: 'rejected', reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
                .eq('id', app.id);
              setVerifyApps((prev) => prev.filter((a) => a.id !== app.id));
            } catch {
              Alert.alert('Error', 'Could not reject application.');
            } finally {
              setReviewingIds((prev) => { const next = new Set(prev); next.delete(app.id); return next; });
            }
          },
        },
      ]
    );
  };

  // ── Render states ──────────────────────────────────────────

  if (checkingRole) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="lock-closed" size={48} color="#333" />
        <Text style={styles.noAccessTitle}>Access Denied</Text>
        <Text style={styles.noAccessSub}>Moderator access required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.tabActive]}
          onPress={() => setActiveTab('reports')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="flag-outline"
            size={16}
            color={activeTab === 'reports' ? '#EF4444' : '#555'}
          />
          <Text style={[styles.tabLabel, activeTab === 'reports' && styles.tabLabelActive]}>
            Reports{reports.length > 0 ? ` (${reports.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'banned' && styles.tabActive]}
          onPress={() => setActiveTab('banned')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="ban-outline"
            size={16}
            color={activeTab === 'banned' ? '#F97316' : '#555'}
          />
          <Text style={[styles.tabLabel, activeTab === 'banned' && styles.tabLabelActiveBan]}>
            Banned{bannedUsers.length > 0 ? ` (${bannedUsers.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'verify' && styles.tabActiveVerify]}
          onPress={() => setActiveTab('verify')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color={activeTab === 'verify' ? '#8B5CF6' : '#555'}
          />
          <Text style={[styles.tabLabel, activeTab === 'verify' && styles.tabLabelActiveVerify]}>
            Verify{verifyApps.length > 0 ? ` (${verifyApps.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        reportsLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(r) => r.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={reportsRefreshing}
                onRefresh={handleRefreshReports}
                tintColor="#8B5CF6"
                colors={['#8B5CF6']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🎉</Text>
                <Text style={styles.emptyTitle}>No pending reports</Text>
                <Text style={styles.emptySubtitle}>Everything looks clean!</Text>
              </View>
            }
            renderItem={({ item }) => (
              <ReportCard
                report={item}
                onApprove={() => handleApprove(item)}
                onRemove={() => handleRemove(item)}
                onBan={() => handleBanUploader(item)}
                resolving={resolvingIds.has(item.id)}
              />
            )}
            contentContainerStyle={
              reports.length === 0 ? styles.emptyContainer : styles.listContent
            }
          />
        )
      )}

      {/* Banned Tab */}
      {activeTab === 'banned' && (
        bannedLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : (
          <FlatList
            data={bannedUsers}
            keyExtractor={(b) => b.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>✅</Text>
                <Text style={styles.emptyTitle}>No banned users</Text>
                <Text style={styles.emptySubtitle}>All users are in good standing</Text>
              </View>
            }
            renderItem={({ item }) => (
              <BannedUserCard
                bannedUser={item}
                onUnban={() => handleUnban(item)}
                unbanning={unbanningIds.has(item.id)}
              />
            )}
            contentContainerStyle={
              bannedUsers.length === 0 ? styles.emptyContainer : styles.listContent
            }
          />
        )
      )}

      {/* Verify Tab */}
      {activeTab === 'verify' && (
        verifyLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : (
          <FlatList
            data={verifyApps}
            keyExtractor={(a) => a.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>⚡</Text>
                <Text style={styles.emptyTitle}>No pending applications</Text>
                <Text style={styles.emptySubtitle}>All caught up!</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.verifyCard}>
                <View style={styles.verifyHeader}>
                  <View style={styles.verifyIconBox}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#8B5CF6" />
                  </View>
                  <View style={styles.verifyUserInfo}>
                    <Text style={styles.verifyUsername}>@{item.user?.username ?? 'unknown'}</Text>
                    <Text style={styles.verifyTime}>{timeAgo(item.created_at)}</Text>
                  </View>
                </View>
                <Text style={styles.verifyReasonLabel}>Reason</Text>
                <Text style={styles.verifyReason}>{item.reason}</Text>
                {item.social_links ? (
                  <>
                    <Text style={styles.verifyReasonLabel}>Links</Text>
                    <Text style={styles.verifySocial} numberOfLines={2}>{item.social_links}</Text>
                  </>
                ) : null}
                <View style={styles.verifyActions}>
                  {reviewingIds.has(item.id) ? (
                    <ActivityIndicator size="small" color="#8B5CF6" style={{ padding: 14 }} />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.verifyBtn, styles.verifyApproveBtn]}
                        onPress={() => handleApproveVerify(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-circle-outline" size={15} color="#10B981" />
                        <Text style={styles.verifyApproveBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.verifyBtn, styles.verifyRejectBtn]}
                        onPress={() => handleRejectVerify(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close-circle-outline" size={15} color="#EF4444" />
                        <Text style={styles.verifyRejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )}
            contentContainerStyle={
              verifyApps.length === 0 ? styles.emptyContainer : styles.listContent
            }
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  noAccessTitle: { fontSize: 20, fontWeight: '700', color: '#555' },
  noAccessSub: { fontSize: 14, color: '#333' },

  listContent: { paddingBottom: 40 },
  emptyContainer: { flex: 1 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#0a0a0a',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#EF4444',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  tabLabelActive: {
    color: '#EF4444',
  },
  tabLabelActiveBan: {
    color: '#F97316',
  },

  // Report card
  card: {
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    overflow: 'hidden',
  },
  clipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  thumb: {
    width: 72,
    height: 60,
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1a1a1a',
  },
  clipInfo: { flex: 1, padding: 12 },
  artist: { fontSize: 14, fontWeight: '700', color: '#fff' },
  festival: { fontSize: 12, color: '#8B5CF6', fontWeight: '600', marginTop: 1 },
  uploader: { fontSize: 11, color: '#555', marginTop: 2 },

  // Report details
  reportDetails: { padding: 12 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reason: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  detail: { fontSize: 12, color: '#888', marginTop: 6, lineHeight: 17, fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  reporter: { fontSize: 12, color: '#555' },
  timeAgo: { fontSize: 12, color: '#444' },

  // Actions
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
  },
  approveBtn: {
    borderRightWidth: 1,
    borderRightColor: '#1a1a1a',
    backgroundColor: '#0a1a12',
  },
  removeBtn: {
    borderRightWidth: 1,
    borderRightColor: '#1a1a1a',
    backgroundColor: '#1a0a0a',
  },
  banBtn: {
    backgroundColor: '#1a110a',
  },
  approveBtnText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  removeBtnText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  banBtnText: { fontSize: 12, fontWeight: '700', color: '#F97316' },

  // Banned user card
  bannedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 14,
    gap: 12,
  },
  bannedIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1a0808',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EF444422',
  },
  bannedInfo: { flex: 1 },
  bannedUsername: { fontSize: 15, fontWeight: '700', color: '#fff' },
  bannedReason: { fontSize: 12, color: '#666', marginTop: 2 },
  bannedTime: { fontSize: 11, color: '#444', marginTop: 2 },
  unbanBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1a1228',
    borderWidth: 1,
    borderColor: '#8B5CF644',
  },
  unbanBtnText: { fontSize: 13, fontWeight: '700', color: '#8B5CF6' },

  // Tab active verify
  tabActiveVerify: {
    borderBottomColor: '#8B5CF6',
  },
  tabLabelActiveVerify: {
    color: '#8B5CF6',
  },

  // Verify card
  verifyCard: {
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8B5CF622',
    overflow: 'hidden',
    padding: 14,
    gap: 8,
  },
  verifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  verifyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF633',
  },
  verifyUserInfo: { flex: 1 },
  verifyUsername: { fontSize: 15, fontWeight: '700', color: '#fff' },
  verifyTime: { fontSize: 11, color: '#444', marginTop: 2 },
  verifyReasonLabel: { fontSize: 11, fontWeight: '700', color: '#8B5CF6', letterSpacing: 1, textTransform: 'uppercase' },
  verifyReason: { fontSize: 13, color: '#ccc', lineHeight: 19 },
  verifySocial: { fontSize: 12, color: '#888', lineHeight: 17 },
  verifyActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    marginTop: 4,
  },
  verifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
  },
  verifyApproveBtn: {
    borderRightWidth: 1,
    borderRightColor: '#1a1a1a',
    backgroundColor: '#0a1a12',
  },
  verifyRejectBtn: {
    backgroundColor: '#1a0a0a',
  },
  verifyApproveBtnText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  verifyRejectBtnText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 10,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#555' },
  emptySubtitle: { fontSize: 14, color: '#333' },
});

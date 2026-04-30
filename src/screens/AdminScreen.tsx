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
  Image,
  Modal,
  TextInput,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getPendingReports, resolveReport, deleteClip } from '../services/clips';
import { isModerator, banUser, unbanUser, getBannedUsers } from '../services/moderator';
import { supabase } from '../services/supabase';
import { getAllArtists, Artist } from '../services/artists';

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

type Tab = 'reports' | 'banned' | 'verify' | 'content';

interface FestivalImage {
  id: string;
  festival_name: string;
  image_url: string;
  created_at: string;
}

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

  // Content state
  const [contentTab, setContentTab] = useState<'artists' | 'festivals' | 'locations'>('artists');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [festivals, setFestivals] = useState<{ name: string; image_url?: string }[]>([]);
  const [festivalsLoading, setFestivalsLoading] = useState(true);
  const [locations, setLocations] = useState<{ location: string; count: number }[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [selectedLocation, setSelectedLocation] = useState<{ location: string; count: number } | null>(null);
  const [mergeTarget, setMergeTarget] = useState('');
  const [renameValue, setRenameValue] = useState('');

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
          loadArtists();
          loadFestivals();
          loadLocations();
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

  const loadArtists = useCallback(async () => {
    try {
      const data = await getAllArtists();
      setArtists(data);
    } catch {}
    finally { setArtistsLoading(false); }
  }, []);

  const loadFestivals = useCallback(async () => {
    try {
      const { data: clipData } = await supabase
        .from('clips')
        .select('festival_name')
        .not('festival_name', 'is', null);
      
      const uniqueFestivals = Array.from(new Set(clipData?.map((c: any) => c.festival_name) ?? []));
      
      // Try to load existing festival images
      const { data: festivalImages } = await supabase
        .from('festival_images')
        .select('festival_name, image_url');
      
      const imageMap = new Map(festivalImages?.map((f: any) => [f.festival_name, f.image_url]) ?? []);
      
      setFestivals(uniqueFestivals.map(name => ({
        name,
        image_url: imageMap.get(name),
      })));
    } catch {}
    finally { setFestivalsLoading(false); }
  }, []);

  const handleRefreshReports = () => {
    setReportsRefreshing(true);
    loadReports();
  };

  // ── Content actions ────────────────────────────────────────

  const uploadArtistPhotoFromGallery = async (artist: Artist) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    setUploadingIds((prev) => new Set(prev).add(artist.id));
    try {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const path = `${artist.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('artist-images')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('artist-images')
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('artists')
        .update({ image_url: publicUrl })
        .eq('id', artist.id);

      if (updateError) throw updateError;

      setArtists((prev) => prev.map((a) => a.id === artist.id ? { ...a, image_url: publicUrl } : a));
      Alert.alert('Success', `Updated photo for ${artist.name}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to upload photo');
    } finally {
      setUploadingIds((prev) => { const next = new Set(prev); next.delete(artist.id); return next; });
    }
  };

  const useArtistPhotoFromEvent = async (artist: Artist) => {
    setUploadingIds((prev) => new Set(prev).add(artist.id));
    try {
      // Look up event/festival by artist name (exact match)
      const { data: festivalData } = await supabase
        .from('festival_images')
        .select('image_url')
        .ilike('festival_name', artist.name)
        .limit(1)
        .single();

      if (!festivalData?.image_url) {
        Alert.alert('Not Found', `No event/festival found with name "${artist.name}" or event has no photo`);
        return;
      }

      const { error: updateError } = await supabase
        .from('artists')
        .update({ image_url: festivalData.image_url })
        .eq('id', artist.id);

      if (updateError) throw updateError;

      setArtists((prev) => prev.map((a) => a.id === artist.id ? { ...a, image_url: festivalData.image_url } : a));
      Alert.alert('Success', `Using event photo for ${artist.name}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to use event photo');
    } finally {
      setUploadingIds((prev) => { const next = new Set(prev); next.delete(artist.id); return next; });
    }
  };

  const handleEditArtistPhoto = (artist: Artist) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Upload from Gallery', 'Use Event Photo', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) uploadArtistPhotoFromGallery(artist);
          else if (buttonIndex === 1) useArtistPhotoFromEvent(artist);
        }
      );
    } else {
      Alert.alert(
        'Edit Photo',
        `Choose a source for ${artist.name}`,
        [
          { text: 'Upload from Gallery', onPress: () => uploadArtistPhotoFromGallery(artist) },
          { text: 'Use Event Photo', onPress: () => useArtistPhotoFromEvent(artist) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const uploadFestivalPhotoFromGallery = async (festivalName: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (result.canceled) return;

    setUploadingIds((prev) => new Set(prev).add(festivalName));
    try {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const slug = festivalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const path = `${slug}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('festival-images')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('festival-images')
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      const { error: upsertError } = await supabase
        .from('festival_images')
        .upsert({ festival_name: festivalName, image_url: publicUrl });

      if (upsertError) throw upsertError;

      setFestivals((prev) => prev.map((f) => f.name === festivalName ? { ...f, image_url: publicUrl } : f));
      Alert.alert('Success', `Updated photo for ${festivalName}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to upload photo');
    } finally {
      setUploadingIds((prev) => { const next = new Set(prev); next.delete(festivalName); return next; });
    }
  };

  const useFestivalPhotoFromArtist = async (festivalName: string) => {
    setUploadingIds((prev) => new Set(prev).add(festivalName));
    try {
      // Look up artist by name (exact match)
      const { data: artistData } = await supabase
        .from('artists')
        .select('image_url')
        .ilike('name', festivalName)
        .limit(1)
        .single();

      if (!artistData?.image_url) {
        Alert.alert('Not Found', `No artist found with name "${festivalName}" or artist has no photo`);
        return;
      }

      const { error: upsertError } = await supabase
        .from('festival_images')
        .upsert({ festival_name: festivalName, image_url: artistData.image_url });

      if (upsertError) throw upsertError;

      setFestivals((prev) => prev.map((f) => f.name === festivalName ? { ...f, image_url: artistData.image_url } : f));
      Alert.alert('Success', `Using artist photo for ${festivalName}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to use artist photo');
    } finally {
      setUploadingIds((prev) => { const next = new Set(prev); next.delete(festivalName); return next; });
    }
  };

  const handleEditFestivalPhoto = (festivalName: string) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Upload from Gallery', 'Use Artist Photo', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) uploadFestivalPhotoFromGallery(festivalName);
          else if (buttonIndex === 1) useFestivalPhotoFromArtist(festivalName);
        }
      );
    } else {
      Alert.alert(
        'Edit Photo',
        `Choose a source for ${festivalName}`,
        [
          { text: 'Upload from Gallery', onPress: () => uploadFestivalPhotoFromGallery(festivalName) },
          { text: 'Use Artist Photo', onPress: () => useFestivalPhotoFromArtist(festivalName) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  // ── Location actions ──────────────────────────

  const loadLocations = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('clips')
        .select('location')
        .not('location', 'is', null);
      
      if (data) {
        const locationCounts = new Map<string, number>();
        data.forEach((row: { location: string }) => {
          const loc = row.location;
          locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
        });
        const sorted = Array.from(locationCounts.entries())
          .map(([location, count]) => ({ location, count }))
          .sort((a, b) => b.count - a.count);
        setLocations(sorted);
      }
    } catch {}
    finally { setLocationsLoading(false); }
  }, []);

  const handleLocationAction = (location: { location: string; count: number }) => {
    setSelectedLocation(location);
    setRenameValue(location.location);
    setMergeTarget('');
  };

  const handleMergeLocation = async () => {
    if (!selectedLocation || !mergeTarget.trim()) {
      Alert.alert('Error', 'Please enter a target location');
      return;
    }

    Alert.alert(
      'Merge Locations',
      `Merge "${selectedLocation.location}" into "${mergeTarget}"? This will update ${selectedLocation.count} clip(s).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('clips')
                .update({ location: mergeTarget })
                .eq('location', selectedLocation.location);
              
              setSelectedLocation(null);
              loadLocations();
              Alert.alert('Success', `Merged ${selectedLocation.count} clips into "${mergeTarget}"`);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to merge locations');
            }
          },
        },
      ]
    );
  };

  const handleRenameLocation = async () => {
    if (!selectedLocation || !renameValue.trim()) {
      Alert.alert('Error', 'Please enter a new location name');
      return;
    }

    if (renameValue === selectedLocation.location) {
      setSelectedLocation(null);
      return;
    }

    try {
      await supabase
        .from('clips')
        .update({ location: renameValue })
        .eq('location', selectedLocation.location);
      
      setSelectedLocation(null);
      loadLocations();
      Alert.alert('Success', `Renamed to "${renameValue}"`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to rename location');
    }
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
        <TouchableOpacity
          style={[styles.tab, activeTab === 'content' && styles.tabActiveContent]}
          onPress={() => setActiveTab('content')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="image-outline"
            size={16}
            color={activeTab === 'content' ? '#10B981' : '#555'}
          />
          <Text style={[styles.tabLabel, activeTab === 'content' && styles.tabLabelActiveContent]}>
            Content
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

      {/* Content Tab */}
      {activeTab === 'content' && (
        <View style={styles.contentContainer}>
          {/* Sub-tabs */}
          <View style={styles.contentTabBar}>
            <TouchableOpacity
              style={[styles.contentTab, contentTab === 'artists' && styles.contentTabActive]}
              onPress={() => setContentTab('artists')}
              activeOpacity={0.8}
            >
              <Text style={[styles.contentTabLabel, contentTab === 'artists' && styles.contentTabLabelActive]}>
                Artists ({artists.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contentTab, contentTab === 'festivals' && styles.contentTabActive]}
              onPress={() => setContentTab('festivals')}
              activeOpacity={0.8}
            >
              <Text style={[styles.contentTabLabel, contentTab === 'festivals' && styles.contentTabLabelActive]}>
                Festivals ({festivals.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contentTab, contentTab === 'locations' && styles.contentTabActive]}
              onPress={() => setContentTab('locations')}
              activeOpacity={0.8}
            >
              <Text style={[styles.contentTabLabel, contentTab === 'locations' && styles.contentTabLabelActive]}>
                Locations ({locations.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Artists list */}
          {contentTab === 'artists' && (
            artistsLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#8B5CF6" />
              </View>
            ) : (
              <FlatList
                data={artists}
                keyExtractor={(a) => a.id}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🎤</Text>
                    <Text style={styles.emptyTitle}>No artists yet</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.contentCard}>
                    <View style={styles.contentImageBox}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.contentImage} />
                      ) : (
                        <Ionicons name="person-outline" size={28} color="#555" />
                      )}
                    </View>
                    <View style={styles.contentInfo}>
                      <Text style={styles.contentName} numberOfLines={1}>{item.name}</Text>
                      {item.genre_tags && item.genre_tags.length > 0 && (
                        <Text style={styles.contentGenre} numberOfLines={1}>
                          {item.genre_tags.join(', ')}
                        </Text>
                      )}
                    </View>
                    {uploadingIds.has(item.id) ? (
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : (
                      <TouchableOpacity
                        style={styles.editPhotoBtn}
                        onPress={() => handleEditArtistPhoto(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="camera-outline" size={16} color="#10B981" />
                        <Text style={styles.editPhotoBtnText}>Edit Photo</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                contentContainerStyle={
                  artists.length === 0 ? styles.emptyContainer : styles.listContent
                }
              />
            )
          )}

          {/* Festivals list */}
          {contentTab === 'festivals' && (
            festivalsLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#8B5CF6" />
              </View>
            ) : (
              <FlatList
                data={festivals}
                keyExtractor={(f) => f.name}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🎪</Text>
                    <Text style={styles.emptyTitle}>No festivals yet</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.contentCard}>
                    <View style={styles.contentImageBox}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.contentImage} />
                      ) : (
                        <Ionicons name="calendar-outline" size={28} color="#555" />
                      )}
                    </View>
                    <View style={styles.contentInfo}>
                      <Text style={styles.contentName} numberOfLines={1}>{item.name}</Text>
                    </View>
                    {uploadingIds.has(item.name) ? (
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : (
                      <TouchableOpacity
                        style={styles.editPhotoBtn}
                        onPress={() => handleEditFestivalPhoto(item.name)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="camera-outline" size={16} color="#10B981" />
                        <Text style={styles.editPhotoBtnText}>Edit Photo</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                contentContainerStyle={
                  festivals.length === 0 ? styles.emptyContainer : styles.listContent
                }
              />
            )
          )}

          {/* Locations list */}
          {contentTab === 'locations' && (
            locationsLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#8B5CF6" />
              </View>
            ) : (
              <FlatList
                data={locations}
                keyExtractor={(l) => l.location}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="location-outline" size={48} color="#333" />
                    <Text style={styles.emptyTitle}>No locations yet</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.contentCard}
                    onPress={() => handleLocationAction(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.contentImageBox}>
                      <Ionicons name="location" size={28} color="#10B981" />
                    </View>
                    <View style={styles.contentInfo}>
                      <Text style={styles.contentName} numberOfLines={1}>{item.location}</Text>
                      <Text style={styles.contentGenre} numberOfLines={1}>{item.count} clip{item.count !== 1 ? 's' : ''}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </TouchableOpacity>
                )}
                contentContainerStyle={
                  locations.length === 0 ? styles.emptyContainer : styles.listContent
                }
              />
            )
          )}
        </View>
      )}

      {/* Location Edit Modal */}
      <Modal
        visible={!!selectedLocation}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLocation(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Location</Text>
              <TouchableOpacity onPress={() => setSelectedLocation(null)} style={styles.modalClose}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Current: {selectedLocation?.location}</Text>
            <Text style={styles.modalSubLabel}>{selectedLocation?.count} clip(s) affected</Text>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Rename</Text>
              <TextInput
                style={styles.modalInput}
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="New location name"
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={handleRenameLocation}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnText}>Rename</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Merge into another location</Text>
              <TextInput
                style={styles.modalInput}
                value={mergeTarget}
                onChangeText={setMergeTarget}
                placeholder="Target location name"
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDestructive]}
                onPress={handleMergeLocation}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnText}>Merge</Text>
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

  // Content tab
  tabActiveContent: {
    borderBottomColor: '#10B981',
  },
  tabLabelActiveContent: {
    color: '#10B981',
  },
  contentContainer: {
    flex: 1,
  },
  contentTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#0a0a0a',
  },
  contentTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  contentTabActive: {
    borderBottomColor: '#10B981',
  },
  contentTabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  contentTabLabelActive: {
    color: '#10B981',
  },
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 12,
    gap: 12,
  },
  contentImageBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  contentImage: {
    width: '100%',
    height: '100%',
  },
  contentInfo: {
    flex: 1,
  },
  contentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  contentGenre: {
    fontSize: 12,
    color: '#8B5CF6',
    marginTop: 2,
  },
  editPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0a1a12',
    borderWidth: 1,
    borderColor: '#10B98144',
  },
  editPhotoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },

  // Location Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  modalClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  modalSubLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 24,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
    marginBottom: 12,
  },
  modalBtn: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnDestructive: {
    backgroundColor: '#EF4444',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 20,
  },
});

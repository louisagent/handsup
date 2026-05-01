import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { followUser, unfollowUser, isFollowing } from '../services/follows';

interface User {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_verified: boolean;
}

export default function FollowListScreen({ route, navigation }: any) {
  const { userId, tab: initialTab } = route.params;
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab || 'followers');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  useEffect(() => {
    loadUsers();
  }, [userId, tab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      if (tab === 'followers') {
        // Get followers
        const { data, error } = await supabase
          .from('follows')
          .select('follower:profiles!follower_id(id, username, display_name, avatar_url, is_verified)')
          .eq('following_id', userId);

        if (!error && data) {
          const followers = data.map((item: any) => item.follower).filter(Boolean);
          setUsers(followers);
          
          // Check following status for each user
          const followingStatus: Record<string, boolean> = {};
          await Promise.all(
            followers.map(async (user: User) => {
              const following = await isFollowing(user.id).catch(() => false);
              followingStatus[user.id] = following;
            })
          );
          setFollowingMap(followingStatus);
        }
      } else {
        // Get following
        const { data, error } = await supabase
          .from('follows')
          .select('following:profiles!following_id(id, username, display_name, avatar_url, is_verified)')
          .eq('follower_id', userId);

        if (!error && data) {
          const following = data.map((item: any) => item.following).filter(Boolean);
          setUsers(following);
          
          // Check following status for each user
          const followingStatus: Record<string, boolean> = {};
          await Promise.all(
            following.map(async (user: User) => {
              const isFollowingUser = await isFollowing(user.id).catch(() => false);
              followingStatus[user.id] = isFollowingUser;
            })
          );
          setFollowingMap(followingStatus);
        }
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (user: User) => {
    const isCurrentlyFollowing = followingMap[user.id];
    
    // Optimistic update
    setFollowingMap(prev => ({ ...prev, [user.id]: !isCurrentlyFollowing }));
    
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(user.id);
      } else {
        await followUser(user.id);
      }
    } catch (err) {
      // Revert on error
      setFollowingMap(prev => ({ ...prev, [user.id]: isCurrentlyFollowing }));
      console.error('Follow toggle error:', err);
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const isOwnProfile = item.id === currentUserId;
    const isFollowingUser = followingMap[item.id];
    
    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.userLeft}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {(item.display_name || item.username || '?')
                  .split(' ')
                  .map(w => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.displayName}>{item.display_name || item.username}</Text>
              {item.is_verified && (
                <Ionicons name="checkmark-circle" size={14} color="#8B5CF6" />
              )}
            </View>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
        </View>
        
        {!isOwnProfile && (
          <TouchableOpacity
            style={[styles.followButton, isFollowingUser && styles.followingButton]}
            onPress={() => handleFollowToggle(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.followButtonText, isFollowingUser && styles.followingButtonText]}>
              {isFollowingUser ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {tab === 'followers' ? 'Followers' : 'Following'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'followers' && styles.tabActive]}
          onPress={() => setTab('followers')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'followers' && styles.tabTextActive]}>
            Followers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'following' && styles.tabActive]}
          onPress={() => setTab('following')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'following' && styles.tabTextActive]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color="#333" />
          <Text style={styles.emptyText}>
            {tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#8B5CF6',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#555',
    marginTop: 16,
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#222',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  username: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
  },
  followingButton: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#333',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  followingButtonText: {
    color: '#666',
  },
});

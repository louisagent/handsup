// ============================================================
// Handsup — Inbox Screen
// List of all conversations with unread indicators
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { getConversations, Conversation, getOrCreateConversation } from '../services/messages';
import { supabase } from '../services/supabase';

type RootStackParamList = {
  Conversation: {
    conversationId: string;
    otherUser: {
      id: string;
      username: string;
      avatar_url: string | null;
    };
  };
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

export default function InboxScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeQuery, setComposeQuery] = useState('');
  const [composeResults, setComposeResults] = useState<Array<{ id: string; username: string; avatar_url: string | null }>>([]);
  const [composing, setComposing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadConversations = async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.trim().length < 2 || !currentUserId) {
      setComposeResults([]);
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .neq('id', currentUserId)
        .limit(10);
      setComposeResults(data ?? []);
    } catch (error) {
      console.error('User search failed:', error);
      setComposeResults([]);
    }
  };

  const handleSelectUser = async (userId: string, username: string, avatarUrl: string | null) => {
    setComposing(true);
    try {
      const conversationId = await getOrCreateConversation(userId);
      setShowCompose(false);
      setComposeQuery('');
      setComposeResults([]);
      navigation.navigate('Conversation', {
        conversationId,
        otherUser: { id: userId, username, avatar_url: avatarUrl },
      });
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setComposing(false);
    }
  };

  useEffect(() => {
    loadConversations();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(composeQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [composeQuery, currentUserId]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleConversationPress = (conv: Conversation) => {
    if (!conv.other_user) return;
    navigation.navigate('Conversation', {
      conversationId: conv.id,
      otherUser: conv.other_user,
    });
  };

  const handleDeleteConversation = async (conversationId: string, username: string) => {
    const deleteAction = async () => {
      try {
        await supabase.from('conversations').delete().eq('id', conversationId);
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      } catch (error) {
        Alert.alert('Error', 'Could not delete conversation');
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Delete Conversation', 'Cancel'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          message: `Delete conversation with @${username}?`,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) deleteAction();
        }
      );
    } else {
      Alert.alert(
        'Delete Conversation',
        `Delete conversation with @${username}? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: deleteAction },
        ]
      );
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUser = item.other_user;
    if (!otherUser) return null;

    const hasUnread = (item.unread_count || 0) > 0;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
        onLongPress={() => handleDeleteConversation(item.id, otherUser.username)}
        activeOpacity={0.7}
        delayLongPress={400}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {otherUser.avatar_url ? (
            <Image source={{ uri: otherUser.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitials}>{getInitials(otherUser.username)}</Text>
            </View>
          )}
          {hasUnread && <View style={styles.unreadDot} />}
        </View>

        {/* Conversation Info */}
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.username, hasUnread && styles.usernameUnread]}>
              {otherUser.username}
            </Text>
            <Text style={styles.timestamp}>
              {item.last_message_at ? timeAgo(item.last_message_at) : ''}
            </Text>
          </View>
          <Text
            style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {item.last_message_preview || 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="mail-outline" size={64} color="#666" />
      <Text style={styles.emptyText}>No messages yet.</Text>
      <Text style={styles.emptySubtext}>Start a conversation from someone's profile.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={() => setShowCompose(true)} style={styles.composeButton}>
          <Ionicons name="create-outline" size={24} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {/* Compose Modal */}
      <Modal
        visible={showCompose}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompose(false)}
      >
        <SafeAreaView style={styles.composeContainer}>
          {/* Compose Header */}
          <View style={styles.composeHeader}>
            <Text style={styles.composeTitle}>New Message</Text>
            <TouchableOpacity onPress={() => { setShowCompose(false); setComposeQuery(''); setComposeResults([]); }} style={styles.composeClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people..."
              placeholderTextColor="#666"
              value={composeQuery}
              onChangeText={setComposeQuery}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Results List */}
          {composing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          ) : composeResults.length > 0 ? (
            <FlatList
              data={composeResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => handleSelectUser(item.id, item.username, item.avatar_url)}
                  activeOpacity={0.7}
                >
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.resultAvatar} />
                  ) : (
                    <View style={[styles.resultAvatar, styles.resultAvatarPlaceholder]}>
                      <Text style={styles.resultAvatarInitials}>{getInitials(item.username)}</Text>
                    </View>
                  )}
                  <Text style={styles.resultUsername}>{item.username}</Text>
                </TouchableOpacity>
              )}
            />
          ) : composeQuery.trim().length >= 2 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptySubtext}>Type at least 2 characters to search</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Conversations List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8B5CF6"
            />
          }
        />
      )}
    </SafeAreaView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  composeButton: {
    padding: 8,
  },
  composeContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  composeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  composeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  composeClose: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  resultAvatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultAvatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  resultUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#000',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#8B5CF6',
    borderWidth: 2,
    borderColor: '#000',
  },
  conversationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ddd',
  },
  usernameUnread: {
    fontWeight: '700',
    color: '#fff',
  },
  timestamp: {
    fontSize: 13,
    color: '#666',
  },
  lastMessage: {
    fontSize: 14,
    color: '#888',
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#aaa',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
});

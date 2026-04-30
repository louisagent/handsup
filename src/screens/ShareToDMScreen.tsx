import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../services/supabase';
import { getOrCreateConversation, sendClipMessage } from '../services/messages';
import { Clip } from '../types';

interface Props {
  route: any;
  navigation: any;
}

interface SearchResult {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function ShareToDMScreen({ route, navigation }: Props) {
  const { clip }: { clip: Clip } = route.params;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  // Debounced search
  React.useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .ilike('username', `%${searchQuery}%`)
          .limit(20);
        setSearchResults(data ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectUser = async (user: SearchResult) => {
    if (sending) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const conversationId = await getOrCreateConversation(user.id);
      await sendClipMessage(conversationId, clip);

      // Show success briefly
      Alert.alert('Sent!', `Clip sent to @${user.username}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not send clip');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send to...</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Search field */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username"
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color="#8B5CF6" />}
      </View>

      {/* Clip preview */}
      <View style={styles.clipPreview}>
        <Ionicons name="musical-notes" size={16} color="#8B5CF6" />
        <Text style={styles.clipPreviewText} numberOfLines={1}>
          {clip.artist} @ {clip.festival_name}
        </Text>
      </View>

      {/* Results list */}
      {searchQuery.length < 2 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color="#333" />
          <Text style={styles.emptyText}>Search for a friend</Text>
        </View>
      ) : searchResults.length === 0 && !searching ? (
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color="#333" />
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => handleSelectUser(item)}
              disabled={sending}
              activeOpacity={0.7}
            >
              <View style={styles.resultAvatar}>
                <Text style={styles.resultAvatarText}>
                  {item.username[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <Text style={styles.resultUsername}>@{item.username}</Text>
              {sending ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <Ionicons name="send-outline" size={18} color="#666" />
              )}
            </TouchableOpacity>
          )}
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
    borderBottomColor: '#1a1a1a',
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 14,
    paddingVertical: 10,
    margin: 16,
    gap: 10,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  clipPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1228',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8B5CF644',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  clipPreviewText: {
    flex: 1,
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#555',
    fontSize: 15,
    fontWeight: '600',
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    marginBottom: 8,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a1650',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultAvatarText: {
    color: '#8B5CF6',
    fontWeight: '800',
    fontSize: 16,
  },
  resultUsername: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

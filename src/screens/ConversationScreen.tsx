// ============================================================
// Handsup — Conversation Screen
// Chat thread with read receipts
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { getMessages, sendMessage, markConversationRead, Message } from '../services/messages';
import { supabase } from '../services/supabase';

type ConversationRouteParams = {
  Conversation: {
    conversationId: string;
    otherUser: {
      id: string;
      username: string;
      avatar_url: string | null;
    };
  };
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}

export default function ConversationScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ConversationRouteParams, 'Conversation'>>();
  const { conversationId, otherUser } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadCurrentUser();
    loadMessages();
    markAsRead();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? (payload.new as Message) : msg))
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadMessages = async () => {
    try {
      // Load last 30 messages initially
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (data) {
        const msgs = data.reverse() as Message[];
        setMessages(msgs);
        setHasMoreMessages(data.length === 30);
      }
      setLoading(false);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages:', error);
      setLoading(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!hasMoreMessages || loadingOlderMessages || messages.length === 0) return;
    
    setLoadingOlderMessages(true);
    try {
      const oldestMessage = messages[0];
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (data && data.length > 0) {
        const olderMsgs = data.reverse() as Message[];
        setMessages((prev) => [...olderMsgs, ...prev]);
        setHasMoreMessages(data.length === 30);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const markAsRead = async () => {
    try {
      await markConversationRead(conversationId);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await sendMessage(conversationId, messageText);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);
      setInputText(messageText); // Restore text on error
    } finally {
      setSending(false);
    }
  };

  const getInitials = (username?: string): string => {
    return username?.trim()?.[0]?.toUpperCase() ?? '?';
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === currentUserId;

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        {!isOwnMessage && (
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('UserProfile', { userId: otherUser.id })}
            style={styles.avatarContainer}
          >
            {otherUser.avatar_url ? (
              <Image source={{ uri: otherUser.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{getInitials(otherUser.username)}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        <View style={styles.messageContent}>
          <View style={[styles.messageBubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
            <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
              {item.body}
            </Text>
            {isOwnMessage && (
              <View style={styles.readReceiptContainer}>
                {item.read ? (
                  <Text style={styles.readReceipt}>✓✓</Text>
                ) : (
                  <Text style={styles.unreadReceipt}>✓</Text>
                )}
              </View>
            )}
          </View>
          <Text style={[styles.messageTime, isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        {otherUser.avatar_url ? (
          <Image source={{ uri: otherUser.avatar_url }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {otherUser.username[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
        <Text style={styles.headerTitle}>{otherUser.username}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          ListHeaderComponent={
            hasMoreMessages ? (
              <TouchableOpacity
                style={styles.loadOlderButton}
                onPress={loadOlderMessages}
                disabled={loadingOlderMessages}
              >
                {loadingOlderMessages ? (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <Text style={styles.loadOlderText}>Load older messages</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Ionicons
              name="send"
              size={20}
              color={!inputText.trim() || sending ? '#444' : '#8B5CF6'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadOlderButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  loadOlderText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '600',
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '75%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  messageContent: {
    flex: 1,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  ownBubble: {
    backgroundColor: '#8B5CF6',
  },
  otherBubble: {
    backgroundColor: '#2a2a2a',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#fff',
  },
  readReceiptContainer: {
    marginLeft: 6,
    marginBottom: -2,
  },
  readReceipt: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  unreadReceipt: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    marginHorizontal: 4,
  },
  ownMessageTime: {
    textAlign: 'right',
  },
  otherMessageTime: {
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
    backgroundColor: '#000',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#fff',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

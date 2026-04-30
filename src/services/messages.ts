// ============================================================
// Handsup — Messages Service
// Direct messaging between users
// ============================================================

import { supabase } from './supabase';

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message: string | null;
  last_message_at: string;
  created_at: string;
  // Joined data
  other_user?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read: boolean;
  created_at: string;
}

// Get or create a conversation between current user and another user
export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const currentUserId = user.id;
  
  // Order participants consistently (lower UUID first) to avoid duplicates
  const [participant1, participant2] = [currentUserId, otherUserId].sort();

  // Try to find existing conversation
  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select('id')
    .or(`and(participant_1.eq.${participant1},participant_2.eq.${participant2})`)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new conversation
  const { data: newConv, error: createError } = await supabase
    .from('conversations')
    .insert({
      participant_1: participant1,
      participant_2: participant2,
    })
    .select('id')
    .single();

  if (createError) throw createError;
  if (!newConv) throw new Error('Failed to create conversation');

  return newConv.id;
}

// Get all conversations for current user
export async function getConversations(): Promise<Conversation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const currentUserId = user.id;

  // Get conversations where user is either participant
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  if (!conversations) return [];

  // For each conversation, get the other participant's profile and unread count
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const otherUserId = conv.participant_1 === currentUserId ? conv.participant_2 : conv.participant_1;

      // Get other user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', otherUserId)
        .single();

      // Get unread count
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('read', false)
        .neq('sender_id', currentUserId);

      return {
        ...conv,
        other_user: profile || { id: otherUserId, username: 'Unknown', avatar_url: null },
        unread_count: count || 0,
      };
    })
  );

  return enriched;
}

// Get messages for a conversation
export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Send a message
export async function sendMessage(conversationId: string, body: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Insert message
  const { error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body,
    });

  if (msgError) throw msgError;

  // Update conversation last_message and last_message_at
  const { error: convError } = await supabase
    .from('conversations')
    .update({
      last_message: body,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (convError) throw convError;
}

// Mark conversation as read
export async function markConversationRead(conversationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .eq('read', false);

  if (error) throw error;
}

// Get unread message count (number of conversations with unread messages)
export async function getUnreadMessageCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const currentUserId = user.id;

  // Get all conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`);

  if (!conversations || conversations.length === 0) return 0;

  // Count how many conversations have unread messages
  let unreadConversations = 0;

  for (const conv of conversations) {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('read', false)
      .neq('sender_id', currentUserId);

    if (count && count > 0) {
      unreadConversations++;
    }
  }

  return unreadConversations;
}

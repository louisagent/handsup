// ============================================================
// Handsup — Messages Service
// Direct messaging between users
// DB columns: participant_a, participant_b, last_message_preview, last_message_at
// ============================================================

import { supabase } from './supabase';

export interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
  last_message_preview: string | null;
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
  const [participantA, participantB] = [currentUserId, otherUserId].sort();

  // Try to find existing conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(`and(participant_a.eq.${participantA},participant_b.eq.${participantB})`)
    .maybeSingle();

  if (existing) return existing.id;

  // Create new conversation
  const { data: newConv, error: createError } = await supabase
    .from('conversations')
    .insert({ participant_a: participantA, participant_b: participantB })
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

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_a.eq.${currentUserId},participant_b.eq.${currentUserId}`)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  if (!conversations) return [];

  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const otherUserId = conv.participant_a === currentUserId ? conv.participant_b : conv.participant_a;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', otherUserId)
        .single();

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

  const { error: msgError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body });

  if (msgError) throw msgError;

  const { error: convError } = await supabase
    .from('conversations')
    .update({
      last_message_preview: body,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (convError) throw convError;

  // Send push notification to the other participant (non-blocking)
  try {
    const { data: conv } = await supabase
      .from('conversations')
      .select('participant_a, participant_b')
      .eq('id', conversationId)
      .single();

    if (conv) {
      const recipientId = conv.participant_a === user.id ? conv.participant_b : conv.participant_a;
      const { data: sender } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      const senderName = (sender as any)?.username ?? 'Someone';

      // Dynamic import to avoid circular dependency
      const { sendPushToUser } = await import('./notifications');
      await sendPushToUser(recipientId, {
        title: `💬 ${senderName}`,
        body: body.length > 60 ? body.slice(0, 57) + '...' : body,
        data: { type: 'message', conversationId },
      });
    }
  } catch {
    // Non-blocking — don't fail the message send
  }
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
  if (!user) return 0;

  const currentUserId = user.id;

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .or(`participant_a.eq.${currentUserId},participant_b.eq.${currentUserId}`);

  if (!conversations || conversations.length === 0) return 0;

  let unreadConversations = 0;
  for (const conv of conversations) {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('read', false)
      .neq('sender_id', currentUserId);

    if (count && count > 0) unreadConversations++;
  }

  return unreadConversations;
}

// Send a clip as a DM (for share-to-friend feature)
export async function sendClipMessage(
  conversationId: string,
  clip: { id: string; artist: string; festival_name: string; thumbnail_url?: string | null }
): Promise<void> {
  const body = `🎵 ${clip.artist} @ ${clip.festival_name}\nhandsuplive.com/clip/${clip.id}`;
  await sendMessage(conversationId, body);
}

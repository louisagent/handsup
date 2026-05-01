// ============================================================
// Handsup — Clip Reactions Component
// Quick emoji reactions on clips (🔥 ❤️ 👏 💀 😍 ⚡)
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export const REACTION_EMOJIS = ['🔥', '❤️', '👏', '💀', '😍', '⚡'] as const;
export type ReactionEmoji = typeof REACTION_EMOJIS[number];

interface ClipReaction {
  id: string;
  clip_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: {
    username: string;
    is_verified: boolean;
  };
}

interface ReactionCounts {
  [emoji: string]: number;
}

interface Props {
  clipId: string;
  compact?: boolean;
  onReactionChange?: () => void;
}

export default function ClipReactions({ clipId, compact = false, onReactionChange }: Props) {
  const [reactions, setReactions] = useState<ClipReaction[]>([]);
  const [counts, setCounts] = useState<ReactionCounts>({});
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadReactions();
  }, [clipId]);

  const loadReactions = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch all reactions for this clip
      const { data, error } = await supabase
        .from('clip_reactions')
        .select('*, user:profiles!user_id(username, is_verified)')
        .eq('clip_id', clipId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reactionsList = data ?? [];
      setReactions(reactionsList);

      // Calculate counts
      const newCounts: ReactionCounts = {};
      reactionsList.forEach((r: ClipReaction) => {
        newCounts[r.emoji] = (newCounts[r.emoji] || 0) + 1;
      });
      setCounts(newCounts);

      // Find user's reaction
      if (user) {
        const userReaction = reactionsList.find((r: ClipReaction) => r.user_id === user.id);
        setMyReaction(userReaction?.emoji ?? null);
      }
    } catch (error) {
      console.error('Error loading reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReact = async (emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // If same emoji, remove reaction
      if (myReaction === emoji) {
        await supabase
          .from('clip_reactions')
          .delete()
          .eq('clip_id', clipId)
          .eq('user_id', user.id);
        
        setMyReaction(null);
      } else {
        // Remove old reaction if exists
        if (myReaction) {
          await supabase
            .from('clip_reactions')
            .delete()
            .eq('clip_id', clipId)
            .eq('user_id', user.id);
        }

        // Add new reaction
        await supabase
          .from('clip_reactions')
          .insert({
            clip_id: clipId,
            user_id: user.id,
            emoji,
          });
        
        setMyReaction(emoji);
      }

      // Reload reactions
      await loadReactions();
      onReactionChange?.();
      setShowPicker(false);
    } catch (error) {
      console.error('Error reacting:', error);
    }
  };

  const totalReactions = Object.values(counts).reduce((sum, count) => sum + count, 0);

  if (loading && !compact) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#8B5CF6" />
      </View>
    );
  }

  if (compact) {
    // Compact mode: just show total count and my reaction
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        {myReaction ? (
          <Text style={styles.compactEmoji}>{myReaction}</Text>
        ) : (
          <Ionicons name="heart-outline" size={18} color="#666" />
        )}
        {totalReactions > 0 && (
          <Text style={styles.compactCount}>{totalReactions}</Text>
        )}
        
        {/* Reaction Picker Modal */}
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          >
            <View style={styles.pickerContainer}>
              {REACTION_EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiButton,
                    myReaction === emoji && styles.emojiButtonActive,
                  ]}
                  onPress={() => handleReact(emoji)}
                >
                  <Text style={styles.emojiButtonText}>{emoji}</Text>
                  {counts[emoji] > 0 && (
                    <Text style={styles.emojiCount}>{counts[emoji]}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </TouchableOpacity>
    );
  }

  // Full mode: show all reactions with counts
  return (
    <View style={styles.container}>
      {/* Reaction Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.reactionsRow}
      >
        {REACTION_EMOJIS.map(emoji => {
          const count = counts[emoji] || 0;
          const isActive = myReaction === emoji;
          
          if (count === 0 && !isActive) return null;
          
          return (
            <TouchableOpacity
              key={emoji}
              style={[styles.reactionPill, isActive && styles.reactionPillActive]}
              onPress={() => handleReact(emoji)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              <Text style={[styles.reactionCount, isActive && styles.reactionCountActive]}>
                {count}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {/* Add reaction button */}
        <TouchableOpacity
          style={styles.addReactionButton}
          onPress={() => setShowPicker(true)}
        >
          <Ionicons name="add" size={18} color="#8B5CF6" />
        </TouchableOpacity>
      </ScrollView>

      {/* Total count - tap to see who reacted */}
      {totalReactions > 0 && (
        <TouchableOpacity
          onPress={() => setShowDetails(true)}
          style={styles.totalButton}
        >
          <Text style={styles.totalText}>
            {totalReactions} reaction{totalReactions !== 1 ? 's' : ''}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#666" />
        </TouchableOpacity>
      )}

      {/* Reaction Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.pickerContainer}>
            {REACTION_EMOJIS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiButton,
                  myReaction === emoji && styles.emojiButtonActive,
                ]}
                onPress={() => handleReact(emoji)}
              >
                <Text style={styles.emojiButtonText}>{emoji}</Text>
                {counts[emoji] > 0 && (
                  <Text style={styles.emojiCount}>{counts[emoji]}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Details Modal - show who reacted */}
      <Modal
        visible={showDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.detailsModalOverlay}>
          <View style={styles.detailsModal}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Reactions</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.detailsList}>
              {reactions.map(reaction => (
                <View key={reaction.id} style={styles.detailItem}>
                  <Text style={styles.detailEmoji}>{reaction.emoji}</Text>
                  <Text style={styles.detailUsername}>
                    @{reaction.user?.username ?? 'unknown'}
                  </Text>
                  {reaction.user?.is_verified && (
                    <Ionicons name="checkmark-circle" size={14} color="#8B5CF6" />
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactEmoji: {
    fontSize: 18,
  },
  compactCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  reactionPillActive: {
    backgroundColor: '#2a1a4a',
    borderColor: '#8B5CF6',
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  reactionCountActive: {
    color: '#8B5CF6',
  },
  addReactionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  totalText: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: '#111',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  emojiButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 60,
  },
  emojiButtonActive: {
    backgroundColor: '#2a1a4a',
  },
  emojiButtonText: {
    fontSize: 32,
    marginBottom: 4,
  },
  emojiCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
  },
  detailsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  detailsModal: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  detailsList: {
    flex: 1,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0a0a0a',
  },
  detailEmoji: {
    fontSize: 24,
  },
  detailUsername: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

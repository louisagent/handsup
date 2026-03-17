import React, { useState } from 'react';
import { useSavedClips } from '../hooks/useSavedClips';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { VideoClip, Comment } from '../data/mockData';
import { getHeatBadge } from '../utils/heatScore';

export default function VideoDetailScreen({ route }: any) {
  const { video }: { video: VideoClip } = route.params;
  const [downloaded, setDownloaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes);
  const [comments, setComments] = useState<Comment[]>(video.comments);
  const [commentText, setCommentText] = useState('');
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const { isSaved, toggleSave } = useSavedClips();
  const saved = isSaved(video.id);

  const handleDownload = () => {
    setDownloaded(true);
    Alert.alert('Saved! 🙌', 'Video saved to your camera roll.');
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  const handleCommentLike = (id: string) => {
    setLikedComments((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setComments((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, likes: likedComments.has(id) ? c.likes - 1 : c.likes + 1 } : c
      )
    );
  };

  const handlePostComment = () => {
    const text = commentText.trim();
    if (!text) return;
    const newComment: Comment = {
      id: `new-${Date.now()}`,
      username: 'you',
      avatar: '🙋',
      text,
      created_at: new Date().toISOString(),
      likes: 0,
    };
    setComments((prev) => [newComment, ...prev]);
    setCommentText('');
  };

  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Video thumbnail / player */}
        <View style={styles.thumbnailWrapper}>
          <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
          <TouchableOpacity style={styles.playButton} onPress={() => setPlaying(!playing)}>
            <Text style={styles.playIcon}>{playing ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          {playing && (
            <View style={styles.playingBadge}>
              <Text style={styles.playingText}>▐▐ Playing... (mock)</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>

          {/* Title + heat badge */}
          <View style={styles.titleRow}>
            <Text style={styles.artist}>{video.artist}</Text>
            {(() => {
              const badge = getHeatBadge(video);
              return badge ? (
                <View style={[styles.heatBadge, { backgroundColor: badge.color + '22', borderColor: badge.color + '55' }]}>
                  <Text style={[styles.heatText, { color: badge.color }]}>{badge.emoji} {badge.label}</Text>
                </View>
              ) : null;
            })()}
          </View>

          <Text style={styles.festival}>{video.festival}</Text>
          <Text style={styles.meta}>📍 {video.location}   📅 {video.date}   ⏱ {video.duration}</Text>
          <Text style={styles.description}>{video.description}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{video.views.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{video.full_views.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Full views</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{video.downloads.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Downloads</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>@{video.uploader}</Text>
              <Text style={styles.statLabel}>Uploaded by</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            {/* Like */}
            <TouchableOpacity
              style={[styles.actionBtn, liked && styles.actionBtnActive]}
              onPress={handleLike}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>{liked ? '❤️' : '🤍'}</Text>
              <Text style={[styles.actionLabel, liked && styles.actionLabelActive]}>
                {likeCount.toLocaleString()}
              </Text>
            </TouchableOpacity>

            {/* Comments count (taps to jump to comments — scrolling handled naturally) */}
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionLabel}>{comments.length}</Text>
            </TouchableOpacity>

            {/* Save */}
            <TouchableOpacity
              style={[styles.actionBtn, saved && styles.actionBtnActive]}
              onPress={() => toggleSave(video.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>{saved ? '🔖' : '🔖'}</Text>
              <Text style={[styles.actionLabel, saved && styles.actionLabelActive]}>
                {saved ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>

            {/* Download */}
            <TouchableOpacity
              style={[styles.actionBtn, downloaded && styles.actionBtnDownloaded]}
              onPress={handleDownload}
              disabled={downloaded}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>{downloaded ? '✅' : '⬇️'}</Text>
              <Text style={[styles.actionLabel, downloaded && styles.actionLabelDownloaded]}>
                {downloaded ? 'Saved' : 'Download'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Comments section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              💬 Comments{comments.length > 0 ? ` (${comments.length})` : ''}
            </Text>

            {/* Comment input */}
            <View style={styles.commentInputRow}>
              <Text style={styles.commentInputAvatar}>🙋</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#444"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={280}
              />
              <TouchableOpacity
                style={[styles.commentPostBtn, !commentText.trim() && styles.commentPostBtnDisabled]}
                onPress={handlePostComment}
                disabled={!commentText.trim()}
              >
                <Text style={styles.commentPostText}>Post</Text>
              </TouchableOpacity>
            </View>

            {/* Comment list */}
            {comments.length === 0 ? (
              <Text style={styles.noComments}>No comments yet. Be the first 👆</Text>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentRow}>
                  <Text style={styles.commentAvatar}>{comment.avatar}</Text>
                  <View style={styles.commentBody}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUsername}>@{comment.username}</Text>
                      <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                    <TouchableOpacity
                      style={styles.commentLikeBtn}
                      onPress={() => handleCommentLike(comment.id)}
                    >
                      <Text style={styles.commentLikeIcon}>
                        {likedComments.has(comment.id) ? '❤️' : '🤍'}
                      </Text>
                      <Text style={[
                        styles.commentLikeCount,
                        likedComments.has(comment.id) && styles.commentLikeCountActive,
                      ]}>
                        {comment.likes + (likedComments.has(comment.id) ? 1 : 0)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { paddingBottom: 60 },

  // Video
  thumbnailWrapper: { position: 'relative' },
  thumbnail: { width: '100%', height: 240, backgroundColor: '#1a1a1a' },
  playButton: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: [{ translateX: -28 }, { translateY: -28 }],
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(139,92,246,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  playIcon: { fontSize: 22, color: '#fff' },
  playingBadge: {
    position: 'absolute', bottom: 12, left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  playingText: { color: '#8B5CF6', fontSize: 12, fontWeight: '600' },

  // Body
  body: { padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  artist: { fontSize: 24, fontWeight: '800', color: '#fff', flex: 1, marginRight: 8 },
  heatBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  heatText: { fontSize: 12, fontWeight: '700' },
  festival: { fontSize: 15, color: '#8B5CF6', fontWeight: '600', marginBottom: 6 },
  meta: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 12 },
  description: {
    fontSize: 15, color: '#ccc', lineHeight: 22,
    paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },

  // Stats
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 20, marginBottom: 20,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 13, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 10, color: '#555', marginTop: 2 },

  // Action buttons
  actionsRow: {
    flexDirection: 'row', gap: 10, marginBottom: 28,
    paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  actionBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#161616', borderRadius: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: '#222',
  },
  actionBtnActive: { borderColor: '#8B5CF644', backgroundColor: '#1a1228' },
  actionBtnDownloaded: { borderColor: '#2d5a2d44', backgroundColor: '#0f1e0f' },
  actionIcon: { fontSize: 20, marginBottom: 4 },
  actionLabel: { fontSize: 11, color: '#666', fontWeight: '600' },
  actionLabelActive: { color: '#8B5CF6' },
  actionLabelDownloaded: { color: '#4ade80' },

  // Comments
  commentsSection: { marginTop: 4 },
  commentsTitle: {
    fontSize: 17, fontWeight: '800', color: '#fff',
    marginBottom: 16, letterSpacing: -0.3,
  },
  commentInputRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginBottom: 20, backgroundColor: '#111',
    borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#1e1e1e',
  },
  commentInputAvatar: { fontSize: 24, marginTop: 2 },
  commentInput: {
    flex: 1, color: '#fff', fontSize: 14, lineHeight: 20, minHeight: 36,
  },
  commentPostBtn: {
    backgroundColor: '#8B5CF6', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-end',
  },
  commentPostBtnDisabled: { backgroundColor: '#2a2a2a' },
  commentPostText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  noComments: { color: '#444', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  commentRow: {
    flexDirection: 'row', gap: 10, marginBottom: 18,
  },
  commentAvatar: { fontSize: 28, marginTop: 2 },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  commentUsername: { color: '#fff', fontWeight: '700', fontSize: 13 },
  commentTime: { color: '#444', fontSize: 11 },
  commentText: { color: '#bbb', fontSize: 14, lineHeight: 20, marginBottom: 6 },
  commentLikeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentLikeIcon: { fontSize: 13 },
  commentLikeCount: { color: '#555', fontSize: 12, fontWeight: '600' },
  commentLikeCountActive: { color: '#EF4444' },
});

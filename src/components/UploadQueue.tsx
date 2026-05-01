// ============================================================
// Handsup — Upload Queue Component
// Shows pending, uploading, and failed uploads
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  QueuedUpload,
  getQueue,
  subscribeToQueue,
  removeFromQueue,
  processQueue,
  clearCompletedUploads,
} from '../services/uploadQueue';

export default function UploadQueue({ onClose }: { onClose: () => void }) {
  const [queue, setQueue] = useState<QueuedUpload[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToQueue(setQueue);
    return unsubscribe;
  }, []);

  const handleRetry = async () => {
    await processQueue();
  };

  const handleClearCompleted = async () => {
    await clearCompletedUploads();
  };

  const handleRemove = async (id: string) => {
    await removeFromQueue(id);
  };

  const pendingCount = queue.filter(u => u.status === 'pending' || u.status === 'uploading').length;
  const completedCount = queue.filter(u => u.status === 'completed').length;
  const failedCount = queue.filter(u => u.status === 'failed').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upload Queue</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{failedCount}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
      </View>

      {/* Actions */}
      {(failedCount > 0 || completedCount > 0) && (
        <View style={styles.actions}>
          {failedCount > 0 && (
            <TouchableOpacity onPress={handleRetry} style={styles.actionButton}>
              <Ionicons name="refresh" size={16} color="#8B5CF6" />
              <Text style={styles.actionText}>Retry Failed</Text>
            </TouchableOpacity>
          )}
          {completedCount > 0 && (
            <TouchableOpacity onPress={handleClearCompleted} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={16} color="#8B5CF6" />
              <Text style={styles.actionText}>Clear Completed</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Queue List */}
      <ScrollView style={styles.list}>
        {queue.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-done-outline" size={48} color="#555" />
            <Text style={styles.emptyText}>No uploads in queue</Text>
          </View>
        ) : (
          queue.map(upload => (
            <UploadItem
              key={upload.id}
              upload={upload}
              onRemove={() => handleRemove(upload.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function UploadItem({ upload, onRemove }: { upload: QueuedUpload; onRemove: () => void }) {
  const getStatusIcon = () => {
    switch (upload.status) {
      case 'pending':
        return <Ionicons name="time-outline" size={20} color="#F59E0B" />;
      case 'uploading':
        return <ActivityIndicator size="small" color="#8B5CF6" />;
      case 'completed':
        return <Ionicons name="checkmark-circle" size={20} color="#10B981" />;
      case 'failed':
        return <Ionicons name="close-circle" size={20} color="#EF4444" />;
    }
  };

  const getStatusText = () => {
    switch (upload.status) {
      case 'pending':
        return 'Waiting to upload';
      case 'uploading':
        return 'Uploading...';
      case 'completed':
        return 'Uploaded successfully';
      case 'failed':
        return upload.errorMessage ?? 'Upload failed';
    }
  };

  return (
    <View style={styles.item}>
      <View style={styles.itemIcon}>
        {getStatusIcon()}
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {upload.artist} • {upload.festival}
        </Text>
        <Text style={styles.itemLocation} numberOfLines={1}>
          {upload.location}
        </Text>
        <Text style={[
          styles.itemStatus,
          upload.status === 'failed' && styles.itemStatusError,
        ]}>
          {getStatusText()}
        </Text>
        {upload.retryCount > 0 && (
          <Text style={styles.itemRetry}>
            Retry attempt {upload.retryCount}
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
        <Ionicons name="trash-outline" size={18} color="#666" />
      </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  list: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  itemIcon: {
    width: 40,
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  itemLocation: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
  },
  itemStatus: {
    fontSize: 12,
    color: '#666',
  },
  itemStatusError: {
    color: '#EF4444',
  },
  itemRetry: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
});

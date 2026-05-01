// ============================================================
// Handsup — QR Code View Component
// Generate QR codes for groups and user profiles
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

export type QRCodeType = 'group' | 'profile';

interface Props {
  type: QRCodeType;
  id: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export default function QRCodeView({ type, id, title, subtitle, onClose }: Props) {
  // Generate deep link URL
  const getQRValue = () => {
    if (type === 'group') {
      return `handsup://group/${id}`;
    } else {
      return `handsup://profile/${id}`;
    }
  };

  const handleShare = async () => {
    try {
      const url = getQRValue();
      const message = type === 'group'
        ? `Join "${title}" on Handsup: ${url}`
        : `Follow @${title} on Handsup: ${url}`;
      
      await Share.share({
        message,
        url,
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.modal}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {type === 'group' ? 'Join Group' : 'Follow User'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={getQRValue()}
              size={240}
              backgroundColor="white"
              color="#000"
            />
          </View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <Text style={styles.instruction}>
            Scan this code with the Handsup app to {type === 'group' ? 'join this group' : 'follow this user'}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Share Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#111',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  info: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  instruction: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  actions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

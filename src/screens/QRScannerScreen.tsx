// ============================================================
// Handsup — QR Scanner Screen
// Scan QR codes to join groups or follow users
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { joinGroup } from '../services/groups';
import { followUser } from '../services/follows';

export default function QRScannerScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    
    setScanned(true);
    setProcessing(true);

    try {
      // Parse deep link: handsup://group/ID or handsup://profile/ID
      const match = data.match(/^handsup:\/\/(group|profile)\/(.+)$/);
      
      if (!match) {
        Alert.alert('Invalid QR Code', 'This QR code is not a valid Handsup link.');
        setScanned(false);
        setProcessing(false);
        return;
      }

      const [, type, id] = match;

      if (type === 'group') {
        await handleJoinGroup(id);
      } else if (type === 'profile') {
        await handleFollowUser(id);
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert('Error', 'Failed to process QR code. Please try again.');
      setScanned(false);
      setProcessing(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      // Get group details
      const { data: group, error } = await supabase
        .from('groups')
        .select('*, event:events(name)')
        .eq('id', groupId)
        .single();

      if (error || !group) {
        Alert.alert('Error', 'Group not found.');
        setScanned(false);
        setProcessing(false);
        return;
      }

      // Join the group
      await joinGroup(groupId);

      Alert.alert(
        'Joined!',
        `You've joined "${group.name}"`,
        [
          {
            text: 'View Group',
            onPress: () => {
              navigation.replace('GroupDetail', { groupId });
            },
          },
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Failed to join group. You may already be a member.');
      setScanned(false);
      setProcessing(false);
    }
  };

  const handleFollowUser = async (userId: string) => {
    try {
      // Get user profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, display_name, is_verified')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        Alert.alert('Error', 'User not found.');
        setScanned(false);
        setProcessing(false);
        return;
      }

      // Follow the user
      await followUser(userId);

      const displayName = profile.display_name || profile.username;
      Alert.alert(
        'Following!',
        `You're now following @${profile.username}`,
        [
          {
            text: 'View Profile',
            onPress: () => {
              navigation.replace('UserProfile', { userId });
            },
          },
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error following user:', error);
      Alert.alert('Error', 'Failed to follow user. You may already be following them.');
      setScanned(false);
      setProcessing(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={64} color="#555" />
        <Text style={styles.noPermissionText}>
          Camera permission is required to scan QR codes
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Scanning frame */}
        <View style={styles.frameContainer}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <Text style={styles.instruction}>
            {processing ? 'Processing...' : 'Point camera at QR code'}
          </Text>
        </View>

        {/* Bottom hint */}
        <View style={styles.bottom}>
          <Text style={styles.hint}>
            Scan a group or profile QR code to join or follow
          </Text>
        </View>
      </View>

      {/* Processing indicator */}
      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#8B5CF6',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  instruction: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  bottom: {
    paddingBottom: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  hint: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPermissionText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    marginHorizontal: 40,
    lineHeight: 24,
  },
  backButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

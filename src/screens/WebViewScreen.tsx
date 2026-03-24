// ============================================================
// Handsup — WebView Screen
// Full-screen in-app browser for legal pages (ToS, Privacy, DMCA)
// ============================================================

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

type WebViewRouteParams = {
  WebView: { url: string; title: string };
};

type Props = {
  route: RouteProp<WebViewRouteParams, 'WebView'>;
  navigation: any;
};

export default function WebViewScreen({ route, navigation }: Props) {
  const { url, title } = route.params;
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        pullToRefreshEnabled
        allowsBackForwardNavigationGestures
      />
      {loading && (
        <View style={styles.loadingOverlay}>
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
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});

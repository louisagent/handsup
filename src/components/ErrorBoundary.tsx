import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Updates from 'expo-updates';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRestart = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      // If reloadAsync isn't available (dev mode), reset state
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Logo / icon */}
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>🙌</Text>
              <Text style={styles.appName}>handsup</Text>
            </View>

            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              An unexpected error occurred. Tap below to restart the app.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxLabel}>Error (dev only)</Text>
                <Text style={styles.errorBoxText}>
                  {this.state.error.message}
                </Text>
                {this.state.error.stack ? (
                  <Text style={styles.errorStackText} numberOfLines={10}>
                    {this.state.error.stack}
                  </Text>
                ) : null}
              </View>
            )}

            <TouchableOpacity
              style={styles.restartBtn}
              onPress={this.handleRestart}
              activeOpacity={0.85}
            >
              <Text style={styles.restartBtnText}>↺ Restart App</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingTop: 80,
    paddingBottom: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#8B5CF6',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  errorBox: {
    backgroundColor: '#1a0808',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EF444433',
    marginBottom: 28,
    width: '100%',
  },
  errorBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  errorBoxText: {
    fontSize: 13,
    color: '#f87171',
    fontWeight: '600',
    marginBottom: 6,
  },
  errorStackText: {
    fontSize: 10,
    color: '#555',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  restartBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  restartBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});

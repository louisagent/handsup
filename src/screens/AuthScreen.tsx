import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  StatusBar,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signIn, signUp } from '../services/auth';
import { Profile } from '../types';

type Mode = 'signin' | 'signup';

interface AuthScreenProps {
  onAuth: (user: Profile) => void;
}

export default function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus state for border highlight
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
    setEmail('');
    setUsername('');
    setPassword('');
  };

  // ── User-friendly error mapper ───────────────────────────
  const friendlyError = (err: any): string => {
    const msg: string = (err?.message ?? err?.error_description ?? String(err)).toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
      return 'Incorrect email or password. Please try again.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Please verify your email address before signing in.';
    }
    if (msg.includes('user already registered') || msg.includes('already been registered') || msg.includes('email address is already')) {
      return 'An account with this email already exists. Try signing in.';
    }
    if (msg.includes('username') && msg.includes('already')) {
      return 'That username is taken. Please choose a different one.';
    }
    if (msg.includes('password') && (msg.includes('short') || msg.includes('weak') || msg.includes('least'))) {
      return 'Password must be at least 6 characters.';
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('failed to fetch')) {
      return 'Network error. Check your connection and try again.';
    }
    if (msg.includes('invalid email')) {
      return 'Please enter a valid email address.';
    }
    return err?.message ?? 'Something went wrong. Please try again.';
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedUsername = username.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please fill in your email/username and password.');
      return;
    }
    if (mode === 'signup' && !trimmedUsername) {
      setError('Please choose a username.');
      return;
    }
    if (mode === 'signup' && trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (mode === 'signup' && trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      let profile: Profile;
      if (mode === 'signin') {
        // If input looks like an email use it directly, otherwise look up email by username
        const isEmail = trimmedEmail.includes('@');
        let signInEmail = trimmedEmail;

        if (!isEmail) {
          // Username entered — look up their email via secure RPC
          const { getEmailByUsername } = await import('../services/auth');
          const foundEmail = await getEmailByUsername(trimmedEmail);
          if (!foundEmail) {
            setError('No account found with that username.');
            setLoading(false);
            return;
          }
          signInEmail = foundEmail;
        }
        profile = await signIn(signInEmail, trimmedPassword);
      } else {
        profile = await signUp(trimmedEmail, trimmedPassword, trimmedUsername);
      }
      onAuth(profile);
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo block ── */}
        <View style={styles.logoBlock}>
          <Image
              source={require('../../assets/logo-full.jpeg')}
              style={styles.logoImage}
              resizeMode="contain"
            />

          <Text style={styles.logoTagline}>feel it now. find it later.</Text>
        </View>

        {/* ── Tab switcher ── */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, mode === 'signin' && styles.tabBtnActive]}
            onPress={() => switchMode('signin')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, mode === 'signup' && styles.tabBtnActive]}
            onPress={() => switchMode('signup')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Form ── */}
        <View style={styles.form}>
          {/* Username (sign up only) */}
          {mode === 'signup' && (
            <TextInput
              ref={usernameRef}
              style={inputStyle('username')}
              placeholder="Username"
              placeholderTextColor="#555"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
            />
          )}

          {/* Email or Username */}
          <TextInput
            ref={emailRef}
            style={inputStyle('email')}
            placeholder={mode === 'signin' ? 'Email or username' : 'Email'}
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            keyboardType={mode === 'signin' ? 'default' : 'email-address'}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />

          {/* Password */}
          <TextInput
            ref={passwordRef}
            style={inputStyle('password')}
            placeholder="Password"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
          />

          {/* Error message */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Forgot password */}
          {mode === 'signin' && (
            <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {/* Submit button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            style={styles.submitWrapper}
          >
            <LinearGradient
              colors={['#9F6EFF', '#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Terms ── */}
        <Text style={styles.termsText}>
          By continuing you agree to our Terms of Service
        </Text>

        {/* ── Skip (testing only — remove before shipping) ── */}
        <TouchableOpacity
          style={styles.skipBtn}
          activeOpacity={0.6}
          onPress={() =>
            onAuth({
              id: 'guest',
              username: 'guest',
              display_name: 'Guest',
              is_verified: false,
              total_uploads: 0,
              total_downloads: 0,
              reputation_score: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as any)
          }
        >
          <Text style={styles.skipText}>Skip for now → (testing only)</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 48,
    flexGrow: 1,
  },

  // Logo
  logoBlock: {
    alignItems: 'center',
    marginBottom: 44,
  },

  logoImage: {
    width: 240,
    height: 100,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  logoTagline: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Tab switcher
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 100,
    padding: 4,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 100,
  },
  tabBtnActive: {
    backgroundColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#444',
  },
  tabTextActive: {
    color: '#ffffff',
  },

  // Form
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#161616',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#222222',
  },
  inputFocused: {
    borderColor: '#8B5CF6',
  },

  // Error
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -4,
  },

  // Forgot password
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '500',
  },

  // Submit
  submitWrapper: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitBtn: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Terms
  termsText: {
    textAlign: 'center',
    color: '#3a3a3a',
    fontSize: 11,
    marginTop: 32,
    lineHeight: 17,
  },

  // Skip (testing only)
  skipBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: '#2a2a2a',
    fontSize: 12,
    fontWeight: '500',
  },
});

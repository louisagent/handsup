// ============================================================
// Handsup — Auth Service
// Wraps Supabase Auth. Drop-in replacement for the mock
// auth in AuthScreen once keys are configured.
// ============================================================

import { supabase } from './supabase';
import { Profile } from '../types';

// Sign up with email + password
export async function signUp(email: string, password: string, username: string): Promise<Profile> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: username },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('Sign up failed');

  // Profile is auto-created by the DB trigger (handle_new_user)
  // Fetch and return it
  const profile = await getProfile(data.user.id);
  if (!profile) throw new Error('Profile creation failed');
  return profile;
}

// Sign in with email + password
export async function signIn(email: string, password: string): Promise<Profile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
  if (!data.user) throw new Error('Sign in failed');

  const profile = await getProfile(data.user.id);
  if (!profile) throw new Error('Profile not found');
  return profile;
}

// Sign in with Apple (Expo requires expo-apple-authentication)
export async function signInWithApple(identityToken: string): Promise<void> {
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
  });
  if (error) throw error;
}

// Sign out
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get current user's profile
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return getProfile(user.id);
}

// Get any profile by ID
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

// Get profile by username
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error) return null;
  return data;
}

// Update profile
export async function updateProfile(updates: Partial<Profile>): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get user's download history
export async function getMyDownloads() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('downloads')
    .select('*, clip:clips(*, uploader:profiles(username))')
    .eq('user_id', user.id)
    .order('downloaded_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Get user's uploaded clips
export async function getMyUploads() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('clips')
    .select('*')
    .eq('uploader_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Reset password
export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'handsup://reset-password',
  });
  if (error) throw error;
}

// Look up email by username via secure RPC function
export async function getEmailByUsername(username: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_email_by_username', { p_username: username });
  if (error || !data) return null;
  return data as string;
}

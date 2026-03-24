// ============================================================
// Handsup — Groups Service
// All group-related API calls.
// ============================================================

import { supabase } from './supabase';
import { Group, GroupClip, GroupMember } from '../types';

// Create a new group and auto-join as admin
export async function createGroup(
  name: string,
  description: string | undefined,
  eventId: string | undefined,
  isPrivate: boolean
): Promise<Group> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      name,
      description,
      event_id: eventId ?? null,
      created_by: user.id,
      is_private: isPrivate,
    })
    .select()
    .single();

  if (error) throw error;

  // Auto-join as admin
  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'admin',
  });

  return group;
}

// Get groups the current user is a member of
export async function getMyGroups(): Promise<Group[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, groups(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row: any) => row.groups)
    .filter(Boolean) as Group[];
}

// Discover public groups
export async function getPublicGroups(limit = 20): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('is_private', false)
    .order('member_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// Get a single group by ID
export async function getGroupById(id: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*, event:events(name, slug), creator:profiles!created_by(username, avatar_url)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

// Join a group by its ID
export async function joinGroup(groupId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: user.id,
    role: 'member',
  });

  if (error) throw error;

  // Increment member_count
  await supabase.rpc('increment_group_member_count', { group_id: groupId }).maybeSingle();
}

// Join a group via invite code
export async function joinGroupByCode(inviteCode: string): Promise<Group> {
  const { data: group, error: findError } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', inviteCode)
    .single();

  if (findError || !group) throw new Error('Invalid invite code');

  await joinGroup(group.id);
  return group;
}

// Leave a group
export async function leaveGroup(groupId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id);

  if (error) throw error;
}

// Add a clip to a group
export async function addClipToGroup(
  groupId: string,
  clipId: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('group_clips').insert({
    group_id: groupId,
    clip_id: clipId,
    added_by: user.id,
  });

  if (error) throw error;
}

// Get clips for a group
export async function getGroupClips(groupId: string): Promise<GroupClip[]> {
  const { data, error } = await supabase
    .from('group_clips')
    .select(
      '*, clip:clips(*, uploader:profiles(username, is_verified, avatar_url)), adder:profiles!added_by(username)'
    )
    .eq('group_id', groupId)
    .order('added_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Get members of a group
export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, profile:profiles(username, avatar_url, is_verified)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// Get current user's clips (for the clip picker)
export async function getMyClips() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('clips')
    .select('*')
    .eq('uploader_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

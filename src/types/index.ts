// ============================================================
// Handsup — Shared TypeScript Types
// These match the Supabase schema in supabase/schema.sql
// ============================================================

export interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  home_city?: string;        // fallback label when GPS is unavailable
  total_uploads: number;
  total_downloads: number;
  reputation_score: number;
  is_verified: boolean;
  created_at: string;
  /** ID of the clip pinned to the top of this user's profile. */
  pinned_clip_id?: string;
  /** IDs of up to 3 clips pinned to the top of this user's profile. */
  pinned_clip_ids?: string[];
  /** Ko-fi, PayPal, or other support/tip link. */
  support_url?: string | null;
  /** XP points earned through actions (uploads, likes, comments, etc.) */
  xp?: number;
  /** Current level derived from XP */
  level?: number;
  /** Current daily login streak (consecutive days active) */
  current_streak?: number;
  /** All-time longest streak */
  longest_streak?: number;
  /** ISO date string of the last day the user was active */
  last_active_date?: string;
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  location: string;
  city: string;
  country: string;
  start_date: string;
  end_date?: string;
  description?: string;
  image_url?: string;
  website_url?: string;
  is_partner: boolean;
  is_upcoming: boolean;
  genre_tags: string[];
  clip_count: number;
  attendee_estimate?: string;
  created_at: string;
  /** Private events are hidden from the public list. Access requires an invite_code. */
  is_private?: boolean;
  /** 6-character alphanumeric code used to join a private event (e.g. "XK93PQ"). */
  invite_code?: string;
  /** The user ID of the creator — used to show the invite code on EventDetailScreen. */
  created_by?: string;
}

export interface Clip {
  id: string;
  uploader_id?: string;
  event_id?: string;
  artist: string;
  festival_name: string;
  location: string;
  clip_date: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  resolution?: string;
  view_count: number;
  download_count: number;
  repost_count?: number;
  is_approved: boolean;
  created_at: string;
  /** ISO date string — when the signed URL expires. Used to show expiry warnings. */
  expires_at?: string;
  // Track ID
  track_name?: string;
  track_artist?: string;
  track_streaming_url?: string;
  track_id_status?: 'unknown' | 'suggested' | 'community_picked' | 'confirmed';
  // Joined fields
  uploader?: Profile;
  event?: Event;
}

export interface Download {
  id: string;
  user_id: string;
  clip_id: string;
  downloaded_at: string;
  clip?: Clip;
}

export interface SearchParams {
  query?: string;
  artist?: string;
  location?: string;
  festival?: string;
  date?: string;
  description?: string; // hashtag search via ilike
  limit?: number;
  offset?: number;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  event_id?: string;
  created_by?: string;
  is_private: boolean;
  invite_code?: string;
  cover_image_url?: string;
  member_count: number;
  clip_count: number;
  created_at: string;
  // Joined fields
  event?: Event;
  creator?: Profile;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  // Joined fields
  profile?: Profile;
}

export interface GroupClip {
  id: string;
  group_id: string;
  clip_id: string;
  added_by?: string;
  added_at: string;
  // Joined fields
  clip?: Clip;
  adder?: Profile;
}

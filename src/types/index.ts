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
  total_uploads: number;
  total_downloads: number;
  reputation_score: number;
  is_verified: boolean;
  created_at: string;
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
  is_approved: boolean;
  created_at: string;
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
  limit?: number;
  offset?: number;
}

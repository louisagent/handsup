-- ============================================================
-- HANDSUP — MASTER SQL (all schemas + migrations in order)
-- Paste this entire file into Supabase SQL Editor and click Run
-- ============================================================


-- ============================================================
-- 1. schema.sql
-- ============================================================

-- ============================================================
-- Handsup — Supabase Database Schema
-- Run this in the Supabase SQL editor after creating a project
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  total_uploads integer default 0,
  total_downloads integer default 0,
  reputation_score integer default 0, -- earned from quality uploads
  is_verified boolean default false,  -- festival crew, official uploaders
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

-- ============================================================
-- FESTIVALS / EVENTS
-- ============================================================
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,         -- e.g. "laneway-melbourne-2026"
  location text not null,
  city text not null,
  country text not null default 'Australia',
  start_date date not null,
  end_date date,
  description text,
  image_url text,
  website_url text,
  is_partner boolean default false,  -- paid/official festival partner
  is_upcoming boolean generated always as (start_date > current_date) stored,
  genre_tags text[] default '{}',
  clip_count integer default 0,      -- denormalised, updated via trigger
  attendee_estimate text,            -- e.g. "15,000"
  created_at timestamp with time zone default timezone('utc', now())
);

-- ============================================================
-- CLIPS (the core content)
-- ============================================================
create table public.clips (
  id uuid default uuid_generate_v4() primary key,
  uploader_id uuid references public.profiles(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,

  -- Tagging
  artist text not null,
  festival_name text not null,
  location text not null,
  clip_date date not null,
  description text,

  -- Media
  video_url text not null,           -- Supabase Storage URL
  thumbnail_url text,                -- auto-generated or uploaded
  duration_seconds integer,
  file_size_bytes bigint,
  resolution text,                   -- e.g. "1080p"

  -- Stats (denormalised for performance)
  view_count integer default 0,
  download_count integer default 0,

  -- Moderation
  is_approved boolean default true,
  is_flagged boolean default false,
  flagged_reason text,

  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Full-text search index on artist + festival + location
create index clips_search_idx on public.clips
  using gin(to_tsvector('english', artist || ' ' || festival_name || ' ' || location));

-- Index for common queries
create index clips_artist_idx on public.clips(lower(artist));
create index clips_date_idx on public.clips(clip_date desc);
create index clips_event_idx on public.clips(event_id);
create index clips_uploader_idx on public.clips(uploader_id);

-- ============================================================
-- DOWNLOADS (track who downloaded what)
-- ============================================================
create table public.downloads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  clip_id uuid references public.clips(id) on delete cascade,
  downloaded_at timestamp with time zone default timezone('utc', now()),
  unique(user_id, clip_id) -- one record per user per clip
);

-- ============================================================
-- VIEWS (track clip views for trending)
-- ============================================================
create table public.clip_views (
  id uuid default uuid_generate_v4() primary key,
  clip_id uuid references public.clips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  viewed_at timestamp with time zone default timezone('utc', now())
);

-- ============================================================
-- SAVES / BOOKMARKS
-- ============================================================
create table public.saves (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  clip_id uuid references public.clips(id) on delete cascade,
  saved_at timestamp with time zone default timezone('utc', now()),
  unique(user_id, clip_id)
);

-- ============================================================
-- REPORTS (content moderation)
-- ============================================================
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  reporter_id uuid references public.profiles(id) on delete set null,
  clip_id uuid references public.clips(id) on delete cascade,
  reason text not null, -- 'copyright', 'inappropriate', 'spam', 'other'
  detail text,
  resolved boolean default false,
  created_at timestamp with time zone default timezone('utc', now())
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update download_count on clips when a download is inserted
create or replace function increment_download_count()
returns trigger as $$
begin
  update public.clips
  set download_count = download_count + 1
  where id = NEW.clip_id;

  update public.profiles
  set total_downloads = total_downloads + 1
  where id = NEW.user_id;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_download_insert
  after insert on public.downloads
  for each row execute procedure increment_download_count();

-- Auto-update clip_count on events
create or replace function update_event_clip_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.events
    set clip_count = clip_count + 1
    where id = NEW.event_id;
  elsif TG_OP = 'DELETE' then
    update public.events
    set clip_count = clip_count - 1
    where id = OLD.event_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_clip_change
  after insert or delete on public.clips
  for each row execute procedure update_event_clip_count();

-- Auto-create profile when user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    coalesce(NEW.raw_user_meta_data->>'display_name', 'New User')
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.clips enable row level security;
alter table public.downloads enable row level security;
alter table public.saves enable row level security;
alter table public.events enable row level security;
alter table public.reports enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Clips: anyone can read approved clips, only uploader can update/delete
create policy "Approved clips are viewable by everyone" on public.clips
  for select using (is_approved = true);

create policy "Authenticated users can upload clips" on public.clips
  for insert with check (auth.uid() = uploader_id);

create policy "Uploaders can update own clips" on public.clips
  for update using (auth.uid() = uploader_id);

create policy "Uploaders can delete own clips" on public.clips
  for delete using (auth.uid() = uploader_id);

-- Downloads: users can see and manage their own downloads
create policy "Users can view own downloads" on public.downloads
  for select using (auth.uid() = user_id);

create policy "Authenticated users can download" on public.downloads
  for insert with check (auth.uid() = user_id);

-- Events: public read, admin write
create policy "Events are viewable by everyone" on public.events
  for select using (true);

-- Saves: private to each user
create policy "Users can manage own saves" on public.saves
  for all using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS (run in Supabase dashboard or via API)
-- ============================================================
-- Create these buckets in Supabase Storage:
--   'clips'       — video files (private, served via signed URLs)
--   'thumbnails'  — clip thumbnails (public)
--   'avatars'     — user profile images (public)

-- ============================================================
-- SEED DATA (sample events — mirrors mockData.ts)
-- ============================================================
insert into public.events (name, slug, location, city, country, start_date, end_date, description, genre_tags, attendee_estimate, is_partner) values
  ('Laneway Festival', 'laneway-melbourne-2026', 'Footscray Park', 'Melbourne', 'Australia', '2026-02-01', '2026-02-01', 'Australia''s favourite boutique touring festival.', array['Indie','Electronic','Alternative'], '15,000', true),
  ('Splendour in the Grass', 'splendour-byron-2025', 'North Byron Parklands', 'Byron Bay', 'Australia', '2025-07-25', '2025-07-27', 'Three days of music, art and culture in Northern Rivers NSW.', array['Rock','Electronic','Hip Hop'], '30,000', false),
  ('Glastonbury', 'glastonbury-2025', 'Worthy Farm', 'Somerset', 'UK', '2025-06-25', '2025-06-29', 'The world''s most famous music and performing arts festival.', array['All genres'], '200,000', false),
  ('Coachella', 'coachella-2026', 'Empire Polo Club', 'Indio', 'USA', '2026-04-10', '2026-04-19', 'The desert festival that defines music culture for a generation.', array['Electronic','Rock','Hip Hop'], '125,000', false),
  ('Field Day', 'field-day-sydney-2026', 'The Domain', 'Sydney', 'Australia', '2026-01-01', '2026-01-01', 'Sydney''s premier electronic music festival.', array['Electronic','Dance'], '20,000', false),
  ('Meredith Music Festival', 'meredith-2025', 'Meredith Supernatural Amphitheatre', 'Meredith', 'Australia', '2025-12-05', '2025-12-07', 'No dickheads policy enforced. Three days in a paddock.', array['Eclectic','Alternative'], '10,000', false);


-- ============================================================
-- 2. analytics_schema.sql
-- ============================================================

create table public.analytics_events (
  id uuid default uuid_generate_v4() primary key,
  event_name text not null,
  user_id uuid references public.profiles(id) on delete set null,
  properties jsonb default '{}',
  created_at timestamp with time zone default timezone('utc', now())
);

-- No RLS needed — insert only via service role in production
-- For now allow authenticated inserts
alter table public.analytics_events enable row level security;
create policy "Authenticated users can log events" on public.analytics_events
  for insert with check (true);


-- ============================================================
-- 3. follows_schema.sql
-- ============================================================

-- ============================================================
-- Handsup — Follows / Friends Schema
-- Run this in the Supabase SQL editor
-- ============================================================

create table public.follows (
  id uuid default uuid_generate_v4() primary key,
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc', now()),
  unique(follower_id, following_id)
);

alter table public.follows enable row level security;

create policy "Anyone can view follows" on public.follows
  for select using (true);

create policy "Users can follow others" on public.follows
  for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow" on public.follows
  for delete using (auth.uid() = follower_id);


-- ============================================================
-- 4. likes_schema.sql
-- ============================================================

-- ── clip_likes table ─────────────────────────────────────────────────────────
-- Persists per-user clip likes. clip_id is text to match the clips.id type
-- used throughout the app. user_id references auth.users so likes are
-- automatically cleaned up when an account is deleted.
--
-- Run once against your Supabase project via the SQL editor or CLI.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clip_likes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  clip_id    text        NOT NULL,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (clip_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.clip_likes ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read likes — needed for public like counts
CREATE POLICY "Anyone can view likes"
  ON public.clip_likes
  FOR SELECT
  USING (true);

-- Only authenticated users can insert a like for themselves
CREATE POLICY "Users can like"
  ON public.clip_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "Users can unlike"
  ON public.clip_likes
  FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- 5. comments_schema.sql
-- ============================================================

create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  clip_id uuid references public.clips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  text text not null check (char_length(text) <= 280),
  created_at timestamp with time zone default timezone('utc', now())
);

alter table public.comments enable row level security;

create policy "Anyone can view comments" on public.comments
  for select using (true);

create policy "Authenticated users can comment" on public.comments
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own comments" on public.comments
  for delete using (auth.uid() = user_id);


-- ============================================================
-- 6. notifications_schema.sql
-- ============================================================

create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null, -- 'new_follower', 'clip_liked', 'comment', 'clip_downloaded'
  actor_id uuid references public.profiles(id) on delete set null,
  clip_id uuid references public.clips(id) on delete set null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "System can insert notifications" on public.notifications
  for insert with check (true);

create policy "Users can mark own notifications read" on public.notifications
  for update using (auth.uid() = user_id);


-- ============================================================
-- 7. groups_schema.sql
-- ============================================================

-- ============================================================
-- Handsup — Groups Schema
-- Run this after schema.sql to add groups functionality
-- ============================================================

-- Groups table
create table public.groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  event_id uuid references public.events(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  is_private boolean default false,
  invite_code text unique default substr(md5(random()::text), 1, 8),
  cover_image_url text,
  member_count integer default 1,
  clip_count integer default 0,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Group members
create table public.group_members (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member', -- 'admin' or 'member'
  joined_at timestamp with time zone default timezone('utc', now()),
  unique(group_id, user_id)
);

-- Group clips (clips shared into a group)
create table public.group_clips (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  clip_id uuid references public.clips(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamp with time zone default timezone('utc', now()),
  unique(group_id, clip_id)
);

-- RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_clips enable row level security;

-- Public groups visible to all; private groups only to members
create policy "Public groups are viewable by everyone" on public.groups
  for select using (is_private = false OR id in (
    select group_id from public.group_members where user_id = auth.uid()
  ));

create policy "Authenticated users can create groups" on public.groups
  for insert with check (auth.uid() = created_by);

create policy "Admins can update groups" on public.groups
  for update using (auth.uid() = created_by);

-- Members can see group_members for groups they belong to
create policy "Members can view group members" on public.group_members
  for select using (group_id in (
    select group_id from public.group_members where user_id = auth.uid()
  ));

create policy "Authenticated users can join groups" on public.group_members
  for insert with check (auth.uid() = user_id);

create policy "Members can leave groups" on public.group_members
  for delete using (auth.uid() = user_id);

-- Group clips visible to members
create policy "Members can view group clips" on public.group_clips
  for select using (group_id in (
    select group_id from public.group_members where user_id = auth.uid()
  ));

create policy "Members can add clips to groups" on public.group_clips
  for insert with check (
    auth.uid() = added_by AND
    group_id in (select group_id from public.group_members where user_id = auth.uid())
  );


-- ============================================================
-- 8. collections_schema.sql
-- ============================================================

create table public.collections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc', now())
);

create table public.collection_clips (
  id uuid default uuid_generate_v4() primary key,
  collection_id uuid references public.collections(id) on delete cascade,
  clip_id uuid references public.clips(id) on delete cascade,
  added_at timestamp with time zone default timezone('utc', now()),
  unique(collection_id, clip_id)
);

alter table public.collections enable row level security;
alter table public.collection_clips enable row level security;

create policy "Users can manage own collections" on public.collections
  for all using (auth.uid() = user_id);

create policy "Public collections viewable by all" on public.collections
  for select using (is_public = true OR auth.uid() = user_id);

create policy "Members can manage collection clips" on public.collection_clips
  for all using (
    collection_id in (select id from public.collections where user_id = auth.uid())
  );


-- ============================================================
-- 9. reactions_schema.sql
-- ============================================================

-- ============================================================
-- Handsup — Clip Reactions Schema
-- Run in the Supabase SQL editor to enable emoji reactions.
-- ============================================================

create table public.clip_reactions (
  id uuid default uuid_generate_v4() primary key,
  clip_id uuid references public.clips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('🔥', '🙌', '😮', '💜', '🎵')),
  created_at timestamp with time zone default timezone('utc', now()),
  unique(clip_id, user_id, emoji)
);

alter table public.clip_reactions enable row level security;

create policy "Anyone can view reactions"
  on public.clip_reactions for select
  using (true);

create policy "Auth users can react"
  on public.clip_reactions for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own reactions"
  on public.clip_reactions for delete
  using (auth.uid() = user_id);


-- ============================================================
-- 10. set_alerts_schema.sql
-- ============================================================

-- Set Alerts — local notification scheduling for artist set times
-- Run this migration in Supabase SQL editor (optional — MVP uses AsyncStorage only)

create table public.set_alerts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  event_id text not null,
  artist text not null,
  start_time timestamp with time zone not null,
  notify_minutes_before integer default 15, -- 5, 15, or 30
  notified boolean default false,
  created_at timestamp with time zone default timezone('utc', now()),
  unique(user_id, event_id, artist)
);

alter table public.set_alerts enable row level security;

create policy "Users manage own alerts" on public.set_alerts
  for all using (auth.uid() = user_id);


-- ============================================================
-- 11. track_id_schema.sql
-- ============================================================

-- ============================================================
-- Track ID Schema
-- Community-driven track identification for clips
-- ============================================================

-- Add track_id fields to clips table
ALTER TABLE public.clips 
  ADD COLUMN IF NOT EXISTS track_name text,
  ADD COLUMN IF NOT EXISTS track_artist text,
  ADD COLUMN IF NOT EXISTS track_streaming_url text, -- Spotify/Apple Music/SoundCloud URL
  ADD COLUMN IF NOT EXISTS track_id_status text default 'unknown' 
    CHECK (track_id_status IN ('unknown', 'suggested', 'community_picked', 'confirmed'));

-- Track ID suggestions from community
CREATE TABLE IF NOT EXISTS public.track_id_suggestions (
  id uuid default uuid_generate_v4() primary key,
  clip_id uuid references public.clips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  track_name text not null,
  track_artist text not null,
  remix_note text, -- e.g. "VIP Edit", "Extended Mix", "ID Remix"
  streaming_url text,
  votes integer default 0,
  created_at timestamp with time zone default timezone('utc', now())
);

ALTER TABLE public.track_id_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view suggestions" ON public.track_id_suggestions FOR SELECT USING (true);
CREATE POLICY "Auth users can suggest" ON public.track_id_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own suggestions" ON public.track_id_suggestions FOR UPDATE USING (auth.uid() = user_id);

-- Track ID votes
CREATE TABLE IF NOT EXISTS public.track_id_votes (
  id uuid default uuid_generate_v4() primary key,
  suggestion_id uuid references public.track_id_suggestions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc', now()),
  UNIQUE(suggestion_id, user_id)
);

ALTER TABLE public.track_id_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view votes" ON public.track_id_votes FOR SELECT USING (true);
CREATE POLICY "Auth users can vote" ON public.track_id_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove vote" ON public.track_id_votes FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 12. username_login_function.sql
-- ============================================================

-- Function to look up a user's email by their username
-- Uses SECURITY DEFINER to access auth.users with elevated privileges
-- Only returns email if the username exists — doesn't expose anything else
create or replace function public.get_email_by_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select au.email into v_email
  from auth.users au
  inner join public.profiles p on p.id = au.id
  where lower(p.username) = lower(p_username)
  limit 1;
  
  return v_email; -- returns null if not found
end;
$$;

-- Grant execute to anon and authenticated roles
grant execute on function public.get_email_by_username(text) to anon, authenticated;


-- ============================================================
-- 13. pinned_clip_migration.sql
-- ============================================================

-- Migration: Add pinned_clip_id to profiles
-- Allows each user to pin one clip to the top of their profile.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pinned_clip_id text;


-- ============================================================
-- 14. private_events_migration.sql
-- ============================================================

-- ============================================================
-- Handsup — Private Events Migration
-- Adds private event support to the events table and creates
-- the event_members table for tracking access.
-- ============================================================

-- Add private event columns to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_private boolean default false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS invite_code text;

-- Add created_by so we can show invite code to the creator
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Event members table: tracks who has joined a private event via invite code
CREATE TABLE IF NOT EXISTS public.event_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Index for fast membership lookups
CREATE INDEX IF NOT EXISTS event_members_user_id_idx ON public.event_members(user_id);
CREATE INDEX IF NOT EXISTS event_members_event_id_idx ON public.event_members(event_id);

-- RLS: event_members
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;

-- Users can insert their own memberships (joining via invite code)
CREATE POLICY "Users can join events" ON public.event_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own memberships
CREATE POLICY "Users can read own memberships" ON public.event_members
  FOR SELECT USING (auth.uid() = user_id);

-- Event creator can read all members of their event
CREATE POLICY "Creator can read event members" ON public.event_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  );

-- RLS for events: private events are only visible to creator + members
-- (Full enforcement deferred — see TODO in clips service)
-- For now, the app filters client-side in EventsScreen.


-- ============================================================
-- 15. moderator_migration.sql
-- ============================================================

-- Add role column to profiles (user | moderator | admin)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user' 
CHECK (role IN ('user', 'moderator', 'admin'));

-- Index for fast role lookups
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- RLS policy: moderators can delete any clip
CREATE POLICY "Moderators can delete any clip"
ON public.clips FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  )
);

-- RLS policy: moderators can update any profile (for banning)
CREATE POLICY "Moderators can ban users"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  )
)
WITH CHECK (true);

-- banned_users table
CREATE TABLE IF NOT EXISTS public.banned_users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  banned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  banned_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(user_id)
);

ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can manage bans"
ON public.banned_users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  )
);


-- ============================================================
-- 16. push_notifications_migration.sql
-- ============================================================

-- ============================================================
-- Handsup — Push Notifications Migration
-- Run this in the Supabase SQL editor to enable push notifications.
-- ============================================================

-- Add push_token column to profiles (safe to run multiple times)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_token text;

-- Track sent push notifications (used to log delivery)
CREATE TABLE IF NOT EXISTS public.push_notification_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'like' | 'comment' | 'follow'
  reference_id text, -- clip_id or user_id
  sent_at timestamp with time zone DEFAULT timezone('utc', now()),
  expo_ticket_id text
);

CREATE INDEX IF NOT EXISTS push_log_recipient_idx
  ON public.push_notification_log(recipient_id, type, reference_id);


-- ============================================================
-- 17. reposts_migration.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reposts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  clip_id uuid REFERENCES public.clips(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(user_id, clip_id)
);

ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reposts"
ON public.reposts FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can read reposts"
ON public.reposts FOR SELECT
USING (true);

-- Add repost_count to clips for denormalised performance
ALTER TABLE public.clips
ADD COLUMN IF NOT EXISTS repost_count integer DEFAULT 0;

-- RPC function to increment repost count safely
CREATE OR REPLACE FUNCTION increment_repost_count(clip_id uuid)
RETURNS void AS $$
  UPDATE public.clips SET repost_count = repost_count + 1 WHERE id = clip_id;
$$ LANGUAGE sql SECURITY DEFINER;


-- ============================================================
-- 18. xp_badges_migration.sql
-- ============================================================

-- ============================================================
-- Handsup — XP & Badges Migration
-- ============================================================

-- XP tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;

-- Badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_key text NOT NULL, -- e.g. 'first_upload', 'festival_regular', 'century_club'
  earned_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(user_id, badge_key)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
ON public.user_badges FOR SELECT USING (true);

CREATE POLICY "System can award badges"
ON public.user_badges FOR INSERT
WITH CHECK (true);

-- RPC to add XP and update level
CREATE OR REPLACE FUNCTION add_xp(user_id uuid, amount integer)
RETURNS void AS $$
DECLARE
  new_xp integer;
  new_level integer;
BEGIN
  UPDATE public.profiles
  SET xp = xp + amount
  WHERE id = user_id
  RETURNING xp INTO new_xp;

  -- Level thresholds: 1=0, 2=100, 3=300, 4=600, 5=1000, 6=1500, 7=2500, 8=4000, 9=6000, 10=10000
  new_level := CASE
    WHEN new_xp >= 10000 THEN 10
    WHEN new_xp >= 6000 THEN 9
    WHEN new_xp >= 4000 THEN 8
    WHEN new_xp >= 2500 THEN 7
    WHEN new_xp >= 1500 THEN 6
    WHEN new_xp >= 1000 THEN 5
    WHEN new_xp >= 600 THEN 4
    WHEN new_xp >= 300 THEN 3
    WHEN new_xp >= 100 THEN 2
    ELSE 1
  END;

  UPDATE public.profiles SET level = new_level WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 19. streaks_migration.sql
-- ============================================================

-- ============================================================
-- Handsup — Daily Streaks Migration
-- Add streak tracking to profiles + server-side RPC
-- ============================================================

-- Add streak fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_streak  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date date;

-- RPC: call when a user does any action today
-- Returns the new (or unchanged) streak count
CREATE OR REPLACE FUNCTION update_streak(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_last_date   date;
  v_today       date := current_date;
  v_current     integer;
  v_new_streak  integer;
BEGIN
  SELECT last_active_date, current_streak
    INTO v_last_date, v_current
    FROM public.profiles
   WHERE id = p_user_id;

  -- Already active today — return current streak unchanged
  IF v_last_date = v_today THEN
    RETURN v_current;
  END IF;

  -- Active yesterday — extend streak
  IF v_last_date = v_today - 1 THEN
    v_new_streak := COALESCE(v_current, 0) + 1;
  ELSE
    -- Gap of 2+ days (or no previous activity) — reset to 1
    v_new_streak := 1;
  END IF;

  UPDATE public.profiles
     SET current_streak   = v_new_streak,
         longest_streak   = GREATEST(COALESCE(longest_streak, 0), v_new_streak),
         last_active_date = v_today
   WHERE id = p_user_id;

  RETURN v_new_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 20. challenges_migration.sql
-- ============================================================

-- Weekly challenge progress tracking
CREATE TABLE IF NOT EXISTS public.challenge_progress (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_key text NOT NULL, -- e.g. 'upload_3_2026-W12'
  week_key text NOT NULL, -- e.g. '2026-W12' (ISO week)
  progress integer DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(user_id, challenge_key, week_key)
);

ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own challenge progress"
ON public.challenge_progress FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view challenge progress"
ON public.challenge_progress FOR SELECT
USING (true);


-- ============================================================
-- 21. attendance_migration.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_attendance (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(user_id, event_id)
);

ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own attendance"
ON public.event_attendance FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view attendance"
ON public.event_attendance FOR SELECT
USING (true);

-- Attendee count view (useful for EventDetailScreen)
CREATE OR REPLACE VIEW public.event_attendee_counts AS
SELECT event_id, COUNT(*) as attendee_count
FROM public.event_attendance
GROUP BY event_id;


-- ============================================================
-- 22. crew_finder_migration.sql
-- ============================================================

-- ============================================================
-- Handsup — Crew Finder Migration
-- Solo festival-goer discovery and mutual opt-in connections
-- ============================================================

-- Crew listings: users saying "I'm going solo to this event"
CREATE TABLE IF NOT EXISTS public.crew_listings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  bio text, -- "Looking for people who are into techno, down to grab a beer before"
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(user_id, event_id)
);

ALTER TABLE public.crew_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own listings"
ON public.crew_listings FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view active listings"
ON public.crew_listings FOR SELECT
USING (active = true);

-- Crew requests: mutual opt-in connections
CREATE TABLE IF NOT EXISTS public.crew_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(from_user_id, to_user_id, event_id)
);

ALTER TABLE public.crew_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own requests"
ON public.crew_requests FOR ALL
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());


-- ============================================================
-- 23. support_link_migration.sql
-- ============================================================

-- Add support_url to profiles (Ko-fi, PayPal, etc.)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS support_url text;


-- ============================================================
-- 24. verification_migration.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.verification_applications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  reason text NOT NULL,
  social_links text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc', now())
);

ALTER TABLE public.verification_applications ENABLE ROW LEVEL SECURITY;

-- Users can insert/read their own application
CREATE POLICY "Users can manage own application"
ON public.verification_applications FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Moderators can read and update all applications
CREATE POLICY "Moderators can manage all applications"
ON public.verification_applications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  )
);


-- ============================================================
-- 25. artist_claim_migration.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.artist_claims (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  artist_name text NOT NULL,
  bio text,
  instagram_url text,
  spotify_url text,
  soundcloud_url text,
  website_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(artist_name) -- only one approved claim per artist name
);

ALTER TABLE public.artist_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own claims"
ON public.artist_claims FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view approved claims"
ON public.artist_claims FOR SELECT
USING (status = 'approved' OR user_id = auth.uid());

CREATE POLICY "Moderators can manage all claims"
ON public.artist_claims FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin'))
);


-- ============================================================
-- 26. preferences_migration.sql
-- ============================================================

-- Preference Onboarding Migration
-- Adds genre_preferences and onboarding_completed columns to profiles
-- Run this in the Supabase SQL editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS genre_preferences text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;


-- ============================================================
-- 27. lineups_migration.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lineups (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  artist_name text NOT NULL,
  stage text,
  set_time timestamp with time zone,
  set_end_time timestamp with time zone,
  day_label text, -- e.g. "Friday", "Saturday"
  order_index integer DEFAULT 0, -- for manual ordering
  created_at timestamp with time zone DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS lineups_event_idx ON public.lineups(event_id);
CREATE INDEX IF NOT EXISTS lineups_artist_idx ON public.lineups(artist_name);

ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lineups"
ON public.lineups FOR SELECT USING (true);

CREATE POLICY "Moderators can manage lineups"
ON public.lineups FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin'))
);


-- ============================================================
-- SET YOURSELF AS MODERATOR
-- Replace YOUR-USER-ID-HERE with your actual user ID from:
-- Supabase → Authentication → Users → click your email
-- ============================================================
UPDATE profiles SET role = 'moderator' WHERE id = 'YOUR-USER-ID-HERE';

-- ============================================================
-- 28. migrations/find_your_crew_migration.sql
-- ============================================================

-- ============================================================
-- Find Your Crew Migration
-- Allows solo festival-goers to find each other at events
-- ============================================================

-- ── crew_lookups ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crew_lookups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    TEXT NOT NULL,
  message     TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS crew_lookups_event_active_idx
  ON public.crew_lookups (event_id, active);

CREATE INDEX IF NOT EXISTS crew_lookups_user_idx
  ON public.crew_lookups (user_id);

-- ── crew_connections ──────────────────────────────────────────
CREATE TYPE IF NOT EXISTS crew_connection_status AS ENUM ('pending', 'connected');

CREATE TABLE IF NOT EXISTS public.crew_connections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    TEXT NOT NULL,
  status      crew_connection_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- prevent exact duplicate rows (same direction)
  UNIQUE (user_a_id, user_b_id, event_id)
);

CREATE INDEX IF NOT EXISTS crew_connections_user_a_idx
  ON public.crew_connections (user_a_id, event_id);

CREATE INDEX IF NOT EXISTS crew_connections_user_b_idx
  ON public.crew_connections (user_b_id, event_id);

CREATE INDEX IF NOT EXISTS crew_connections_event_idx
  ON public.crew_connections (event_id, status);

-- ── RLS: crew_lookups ─────────────────────────────────────────
ALTER TABLE public.crew_lookups ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active lookups
CREATE POLICY "crew_lookups_select"
  ON public.crew_lookups FOR SELECT
  TO authenticated
  USING (active = TRUE);

-- Users can insert their own lookup
CREATE POLICY "crew_lookups_insert"
  ON public.crew_lookups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update (deactivate) their own lookup
CREATE POLICY "crew_lookups_update"
  ON public.crew_lookups FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── RLS: crew_connections ─────────────────────────────────────
ALTER TABLE public.crew_connections ENABLE ROW LEVEL SECURITY;

-- Users can read connections they are part of
CREATE POLICY "crew_connections_select"
  ON public.crew_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Users can insert connections where they are user_a
CREATE POLICY "crew_connections_insert"
  ON public.crew_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_a_id);

-- Users can update connections where they are user_b (to accept)
CREATE POLICY "crew_connections_update"
  ON public.crew_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_b_id)
  WITH CHECK (auth.uid() = user_b_id);

-- ============================================================
-- 29. migrations/weekly_challenges_migration.sql
-- ============================================================

-- ============================================================
-- Handsup — Weekly Challenges Migration
-- Rotating weekly goals with badge rewards on completion
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.goal_type_enum AS ENUM ('upload', 'like', 'comment', 'download');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- CHALLENGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  goal_type     public.goal_type_enum NOT NULL,
  goal_count    INTEGER NOT NULL CHECK (goal_count > 0),
  badge_reward  TEXT NOT NULL,
  week_start    DATE NOT NULL,
  week_end      DATE NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS challenges_week_idx ON public.challenges(week_start, week_end);
CREATE INDEX IF NOT EXISTS challenges_goal_type_idx ON public.challenges(goal_type);

-- ============================================================
-- USER CHALLENGE PROGRESS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_id  uuid REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  current_count INTEGER NOT NULL DEFAULT 0,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  badge_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(user_id, challenge_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS ucp_user_idx      ON public.user_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS ucp_challenge_idx ON public.user_challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS ucp_completed_idx ON public.user_challenge_progress(completed);

-- ============================================================
-- ROW LEVEL SECURITY — challenges
-- ============================================================
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Everyone can read challenges
CREATE POLICY "Challenges are viewable by everyone"
  ON public.challenges FOR SELECT
  USING (true);

-- Only service role can insert/update/delete challenges (admin only)
CREATE POLICY "Only service role can manage challenges"
  ON public.challenges FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- ROW LEVEL SECURITY — user_challenge_progress
-- ============================================================
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own progress
CREATE POLICY "Users can view own challenge progress"
  ON public.user_challenge_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own challenge progress"
  ON public.user_challenge_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own challenge progress"
  ON public.user_challenge_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SEED DATA — 3 sample challenges for the current week
-- ============================================================
-- Week: Mon 24 Mar 2026 → Sun 29 Mar 2026
INSERT INTO public.challenges (title, description, goal_type, goal_count, badge_reward, week_start, week_end)
VALUES
  (
    'Upload 3 Clips',
    'Share the vibe — upload 3 clips from any festival this week.',
    'upload',
    3,
    '🎬',
    '2026-03-23',
    '2026-03-29'
  ),
  (
    'Like 10 Clips',
    'Spread the love — like 10 clips from the community.',
    'like',
    10,
    '❤️',
    '2026-03-23',
    '2026-03-29'
  ),
  (
    'Download 5 Clips',
    'Save the moments — download 5 clips you love.',
    'download',
    5,
    '⬇️',
    '2026-03-23',
    '2026-03-29'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- 30. migrations/reposts_migration.sql (complete version with trigger)
-- ============================================================

-- ============================================================
-- Handsup — Reposts Migration
-- Adds reposts table and repost_count column to clips
-- ============================================================

-- Add repost_count to clips table
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS repost_count INTEGER DEFAULT 0;

-- ============================================================
-- REPOSTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reposts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  clip_id uuid REFERENCES public.clips(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(user_id, clip_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS reposts_user_idx ON public.reposts(user_id);
CREATE INDEX IF NOT EXISTS reposts_clip_idx ON public.reposts(clip_id);
CREATE INDEX IF NOT EXISTS reposts_created_idx ON public.reposts(created_at DESC);

-- ============================================================
-- TRIGGER — keep repost_count in sync
-- ============================================================
CREATE OR REPLACE FUNCTION update_repost_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.clips
    SET repost_count = repost_count + 1
    WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.clips
    SET repost_count = GREATEST(0, repost_count - 1)
    WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_repost_change ON public.reposts;
CREATE TRIGGER on_repost_change
  AFTER INSERT OR DELETE ON public.reposts
  FOR EACH ROW EXECUTE PROCEDURE update_repost_count();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

-- Anyone can see reposts (needed for feed queries and repost counts)
CREATE POLICY "Reposts are viewable by everyone"
  ON public.reposts FOR SELECT
  USING (true);

-- Users can insert their own reposts
CREATE POLICY "Users can insert own reposts"
  ON public.reposts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reposts
CREATE POLICY "Users can delete own reposts"
  ON public.reposts FOR DELETE
  USING (auth.uid() = user_id);

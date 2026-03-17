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

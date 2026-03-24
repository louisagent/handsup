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

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

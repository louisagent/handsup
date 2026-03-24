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

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

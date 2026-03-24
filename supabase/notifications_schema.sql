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

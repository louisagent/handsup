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

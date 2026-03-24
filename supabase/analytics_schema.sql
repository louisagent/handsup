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

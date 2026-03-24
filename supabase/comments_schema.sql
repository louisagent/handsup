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

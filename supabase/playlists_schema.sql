-- Playlists table for organizing clips into collections
-- Supports collaborative playlists where multiple users can add clips

create table if not exists playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid references auth.users(id) on delete cascade not null,
  thumbnail_url text,
  is_collaborative boolean default false,
  collaborators uuid[] default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Playlist clips junction table
create table if not exists playlist_clips (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references playlists(id) on delete cascade not null,
  clip_id uuid references clips(id) on delete cascade not null,
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamp with time zone default now(),
  unique(playlist_id, clip_id)
);

-- Indexes
create index if not exists playlists_owner_id_idx on playlists(owner_id);
create index if not exists playlists_created_at_idx on playlists(created_at desc);
create index if not exists playlist_clips_playlist_id_idx on playlist_clips(playlist_id);
create index if not exists playlist_clips_clip_id_idx on playlist_clips(clip_id);

-- RLS policies
alter table playlists enable row level security;
alter table playlist_clips enable row level security;

-- Playlists policies
create policy "Users can view their own playlists and collaborative ones"
  on playlists for select
  using (
    owner_id = auth.uid() 
    or auth.uid() = any(collaborators)
  );

create policy "Users can create their own playlists"
  on playlists for insert
  with check (owner_id = auth.uid());

create policy "Users can update their own playlists"
  on playlists for update
  using (owner_id = auth.uid());

create policy "Users can delete their own playlists"
  on playlists for delete
  using (owner_id = auth.uid());

-- Playlist clips policies
create policy "Users can view clips in playlists they have access to"
  on playlist_clips for select
  using (
    exists (
      select 1 from playlists p
      where p.id = playlist_clips.playlist_id
      and (p.owner_id = auth.uid() or auth.uid() = any(p.collaborators))
    )
  );

create policy "Users can add clips to playlists they own or collaborate on"
  on playlist_clips for insert
  with check (
    exists (
      select 1 from playlists p
      where p.id = playlist_clips.playlist_id
      and (
        p.owner_id = auth.uid() 
        or (p.is_collaborative and auth.uid() = any(p.collaborators))
      )
    )
  );

create policy "Users can remove clips from playlists they own"
  on playlist_clips for delete
  using (
    exists (
      select 1 from playlists p
      where p.id = playlist_clips.playlist_id
      and p.owner_id = auth.uid()
    )
  );

-- Function to update playlist thumbnail (use first clip's thumbnail)
create or replace function update_playlist_thumbnail()
returns trigger as $$
begin
  update playlists
  set thumbnail_url = (
    select c.thumbnail_url
    from playlist_clips pc
    join clips c on c.id = pc.clip_id
    where pc.playlist_id = new.playlist_id
    order by pc.added_at desc
    limit 1
  )
  where id = new.playlist_id;
  return new;
end;
$$ language plpgsql;

create trigger update_playlist_thumbnail_trigger
after insert or delete on playlist_clips
for each row execute function update_playlist_thumbnail();

-- Updated at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger playlists_updated_at
before update on playlists
for each row execute function update_updated_at();

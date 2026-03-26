CREATE TABLE IF NOT EXISTS artist_discussions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_slug TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  username TEXT NOT NULL,
  body TEXT NOT NULL,
  parent_id UUID REFERENCES artist_discussions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  like_count INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS artist_discussions_slug_idx ON artist_discussions(artist_slug);
CREATE INDEX IF NOT EXISTS artist_discussions_parent_idx ON artist_discussions(parent_id);

CREATE TABLE IF NOT EXISTS event_discussions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  username TEXT NOT NULL,
  body TEXT NOT NULL,
  parent_id UUID REFERENCES event_discussions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  like_count INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS event_discussions_event_idx ON event_discussions(event_id);

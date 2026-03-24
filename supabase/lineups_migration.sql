CREATE TABLE IF NOT EXISTS public.lineups (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  artist_name text NOT NULL,
  stage text,
  set_time timestamp with time zone,
  set_end_time timestamp with time zone,
  day_label text, -- e.g. "Friday", "Saturday"
  order_index integer DEFAULT 0, -- for manual ordering
  created_at timestamp with time zone DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS lineups_event_idx ON public.lineups(event_id);
CREATE INDEX IF NOT EXISTS lineups_artist_idx ON public.lineups(artist_name);

ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lineups"
ON public.lineups FOR SELECT USING (true);

CREATE POLICY "Moderators can manage lineups"
ON public.lineups FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin'))
);

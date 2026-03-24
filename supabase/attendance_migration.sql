CREATE TABLE IF NOT EXISTS public.event_attendance (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(user_id, event_id)
);

ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own attendance"
ON public.event_attendance FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view attendance"
ON public.event_attendance FOR SELECT
USING (true);

-- Attendee count view (useful for EventDetailScreen)
CREATE OR REPLACE VIEW public.event_attendee_counts AS
SELECT event_id, COUNT(*) as attendee_count
FROM public.event_attendance
GROUP BY event_id;

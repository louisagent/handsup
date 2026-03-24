-- ============================================================
-- Handsup — Private Events Migration
-- Adds private event support to the events table and creates
-- the event_members table for tracking access.
-- ============================================================

-- Add private event columns to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_private boolean default false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS invite_code text;

-- Add created_by so we can show invite code to the creator
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Event members table: tracks who has joined a private event via invite code
CREATE TABLE IF NOT EXISTS public.event_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Index for fast membership lookups
CREATE INDEX IF NOT EXISTS event_members_user_id_idx ON public.event_members(user_id);
CREATE INDEX IF NOT EXISTS event_members_event_id_idx ON public.event_members(event_id);

-- RLS: event_members
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;

-- Users can insert their own memberships (joining via invite code)
CREATE POLICY "Users can join events" ON public.event_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own memberships
CREATE POLICY "Users can read own memberships" ON public.event_members
  FOR SELECT USING (auth.uid() = user_id);

-- Event creator can read all members of their event
CREATE POLICY "Creator can read event members" ON public.event_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  );

-- RLS for events: private events are only visible to creator + members
-- (Full enforcement deferred — see TODO in clips service)
-- For now, the app filters client-side in EventsScreen.

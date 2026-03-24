-- ============================================================
-- Find Your Crew Migration
-- Allows solo festival-goers to find each other at events
-- ============================================================

-- ── crew_lookups ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crew_lookups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    TEXT NOT NULL,
  message     TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS crew_lookups_event_active_idx
  ON public.crew_lookups (event_id, active);

CREATE INDEX IF NOT EXISTS crew_lookups_user_idx
  ON public.crew_lookups (user_id);

-- ── crew_connections ──────────────────────────────────────────
CREATE TYPE IF NOT EXISTS crew_connection_status AS ENUM ('pending', 'connected');

CREATE TABLE IF NOT EXISTS public.crew_connections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    TEXT NOT NULL,
  status      crew_connection_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- prevent exact duplicate rows (same direction)
  UNIQUE (user_a_id, user_b_id, event_id)
);

CREATE INDEX IF NOT EXISTS crew_connections_user_a_idx
  ON public.crew_connections (user_a_id, event_id);

CREATE INDEX IF NOT EXISTS crew_connections_user_b_idx
  ON public.crew_connections (user_b_id, event_id);

CREATE INDEX IF NOT EXISTS crew_connections_event_idx
  ON public.crew_connections (event_id, status);

-- ── RLS: crew_lookups ─────────────────────────────────────────
ALTER TABLE public.crew_lookups ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active lookups
CREATE POLICY "crew_lookups_select"
  ON public.crew_lookups FOR SELECT
  TO authenticated
  USING (active = TRUE);

-- Users can insert their own lookup
CREATE POLICY "crew_lookups_insert"
  ON public.crew_lookups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update (deactivate) their own lookup
CREATE POLICY "crew_lookups_update"
  ON public.crew_lookups FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── RLS: crew_connections ─────────────────────────────────────
ALTER TABLE public.crew_connections ENABLE ROW LEVEL SECURITY;

-- Users can read connections they are part of
CREATE POLICY "crew_connections_select"
  ON public.crew_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Users can insert connections where they are user_a
CREATE POLICY "crew_connections_insert"
  ON public.crew_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_a_id);

-- Users can update connections where they are user_b (to accept)
CREATE POLICY "crew_connections_update"
  ON public.crew_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_b_id)
  WITH CHECK (auth.uid() = user_b_id);

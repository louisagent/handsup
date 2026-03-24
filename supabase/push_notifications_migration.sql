-- ============================================================
-- Handsup — Push Notifications Migration
-- Run this in the Supabase SQL editor to enable push notifications.
-- ============================================================

-- Add push_token column to profiles (safe to run multiple times)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_token text;

-- Track sent push notifications (used to log delivery)
CREATE TABLE IF NOT EXISTS public.push_notification_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'like' | 'comment' | 'follow'
  reference_id text, -- clip_id or user_id
  sent_at timestamp with time zone DEFAULT timezone('utc', now()),
  expo_ticket_id text
);

CREATE INDEX IF NOT EXISTS push_log_recipient_idx
  ON public.push_notification_log(recipient_id, type, reference_id);

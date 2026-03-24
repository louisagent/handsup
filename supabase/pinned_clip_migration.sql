-- Migration: Add pinned_clip_id to profiles
-- Allows each user to pin one clip to the top of their profile.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pinned_clip_id text;

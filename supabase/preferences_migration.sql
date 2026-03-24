-- Preference Onboarding Migration
-- Adds genre_preferences and onboarding_completed columns to profiles
-- Run this in the Supabase SQL editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS genre_preferences text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add support_url to profiles (Ko-fi, PayPal, etc.)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS support_url text;

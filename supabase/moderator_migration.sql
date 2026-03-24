-- Add role column to profiles (user | moderator | admin)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user' 
CHECK (role IN ('user', 'moderator', 'admin'));

-- Index for fast role lookups
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- RLS policy: moderators can delete any clip
CREATE POLICY "Moderators can delete any clip"
ON public.clips FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  )
);

-- RLS policy: moderators can update any profile (for banning)
CREATE POLICY "Moderators can ban users"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  )
)
WITH CHECK (true);

-- banned_users table
CREATE TABLE IF NOT EXISTS public.banned_users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  banned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  banned_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE(user_id)
);

ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can manage bans"
ON public.banned_users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  )
);

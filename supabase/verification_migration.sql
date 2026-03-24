CREATE TABLE IF NOT EXISTS public.verification_applications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  reason text NOT NULL,
  social_links text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc', now())
);

ALTER TABLE public.verification_applications ENABLE ROW LEVEL SECURITY;

-- Users can insert/read their own application
CREATE POLICY "Users can manage own application"
ON public.verification_applications FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Moderators can read and update all applications
CREATE POLICY "Moderators can manage all applications"
ON public.verification_applications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  )
);

# Pending Supabase Migrations

> The `exec_sql` RPC is not available on this project. Migrations must be run manually in the **Supabase SQL editor** at: https://supabase.com/dashboard/project/ulvhjkkyxzybahcqcvaf/sql

## ✅ Status Summary (verified 2026-03-27)

All critical tables are **already deployed**. No blocking migrations pending.

| Table / Feature | Status | Notes |
|----------------|--------|-------|
| `profiles` | ✅ Exists | Has xp, level, current_streak, longest_streak, last_active_date, push_token |
| `clips` | ✅ Exists | Has live data |
| `clip_likes` | ✅ Exists | App uses `clip_likes`, NOT `likes` |
| `comments` | ✅ Exists | |
| `saves` | ✅ Exists | |
| `follows` | ✅ Exists | |
| `notifications` | ✅ Exists | |
| `collections` | ✅ Exists | |
| `collection_clips` | ✅ Exists | |
| `groups` | ✅ Exists | |
| `group_members` | ✅ Exists | |
| `events` | ✅ Exists | Has live data |
| `analytics_events` | ✅ Exists | |
| `push_notification_log` | ✅ Exists | |
| `user_badges` | ✅ Exists | XP/badges migration applied |
| `clip_reactions` | ⚠️ **NEW** | **Required for clip reactions feature** |
| `likes` (generic) | ℹ️ Not needed | App uses `clip_likes` — no code references `likes` table |
| `push_tokens` (separate table) | ℹ️ Not needed | App uses `push_token` column on `profiles` — confirmed present |

## ⚠️ Required Migrations for New Features

### 1. Voice Comments Storage Bucket & Column (Feature 4 - Voice Comments)
**Status:** Required for voice comments feature

```sql
-- 1. Create storage bucket for voice comments (run in Supabase Dashboard → Storage)
-- Bucket name: 'voice-comments'
-- Public: true (or use signed URLs)
-- File size limit: 5MB
-- Allowed MIME types: audio/m4a, audio/mpeg, audio/webm

-- 2. Add audio_url column to comments table
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 3. Add index for voice comment queries
CREATE INDEX IF NOT EXISTS comments_audio_url_idx ON public.comments(audio_url) WHERE audio_url IS NOT NULL;
```

### 2. Clip Reactions Table (Feature 4)
**Status:** Required for clip reactions feature

```sql
-- Create clip_reactions table
CREATE TABLE IF NOT EXISTS public.clip_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID NOT NULL REFERENCES public.clips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clip_id, user_id) -- One reaction per user per clip
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS clip_reactions_clip_id_idx ON public.clip_reactions(clip_id);
CREATE INDEX IF NOT EXISTS clip_reactions_user_id_idx ON public.clip_reactions(user_id);

-- Enable RLS
ALTER TABLE public.clip_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view reactions"
  ON public.clip_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own reactions"
  ON public.clip_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON public.clip_reactions FOR DELETE
  USING (auth.uid() = user_id);
```

## ⚠️ Optional / Future Migrations

These should be run when ready (not blocking launch):

### 1. RLS Policy Audit
Verify Row Level Security is enabled and policies are correct on all user-data tables.
Suggested SQL to check:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 2. Events: Add lat/lng for Map Feature
```sql
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS latitude FLOAT,
  ADD COLUMN IF NOT EXISTS longitude FLOAT;
```
File: not yet created — add when map feature is activated.

### 3. Clips Storage Bucket — Upload/Download Policy (⚠️ Action Required)
The `clips` bucket is **private** (confirmed via API). The current UploadScreen.tsx constructs a
`/storage/v1/object/public/clips/...` URL for the stored video — this will NOT work for private
buckets. Two options:

**Option A — Make clips bucket public (simpler, fine for festival clips):**
In Supabase Dashboard → Storage → clips bucket → Settings → toggle Public ON.

**Option B — Keep private, use signed URLs (more secure):**
Change UploadScreen.tsx to store the path (not full URL) in `video_url`, then generate signed
URLs on-demand via `supabase.storage.from('clips').createSignedUrl(path, 3600)`.

Additionally, ensure these storage RLS policies are in place (Supabase Dashboard → Storage → Policies):
```
-- Allow authenticated users to upload to their own folder
-- Policy name: "Authenticated users can upload clips"
-- Operation: INSERT
-- Policy: bucket_id = 'clips' AND auth.uid() IS NOT NULL

-- Allow anyone to view clips (or authenticated only if private)
-- Policy name: "Anyone can view clips"
-- Operation: SELECT
-- Policy: bucket_id = 'clips'
```

### 4. Events Table — Add lat/lng Columns (for Map feature)
```sql
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS latitude FLOAT,
  ADD COLUMN IF NOT EXISTS longitude FLOAT;
```
Once added, the app can populate these via PATCH requests. MapScreen currently uses hardcoded
coordinates from `eventsData.ts` — once lat/lng columns exist, update MapScreen to load from
Supabase via `getEvents()` and use `event.latitude`/`event.longitude`.

Coordinates to populate after migration:
- Laneway Festival: -37.8007, 144.9507
- Splendour in the Grass: -28.6516, 153.5636
- Glastonbury: 51.1536, -2.6406
- Coachella: 33.6796, -116.2376
- Field Day: -33.8688, 151.2093
- Meredith Music Festival: -37.8391, 143.9784
- Spilt Milk Festival: -27.4705, 153.0260
- Wildlands Festival: -34.9285, 138.6007
- Southbound Festival: -31.9505, 115.8605
- Secret Garden Sessions: -37.7991, 144.9784
- Rooftop After-Dark: -33.8855, 151.2094

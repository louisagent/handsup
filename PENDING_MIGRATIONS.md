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
| `likes` (generic) | ℹ️ Not needed | App uses `clip_likes` — no code references `likes` table |
| `push_tokens` (separate table) | ℹ️ Not needed | App uses `push_token` column on `profiles` — confirmed present |

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

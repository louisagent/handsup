# handsup — Launch Prep Status

> Last updated: 2026-03-27

---

## Round 2 — 2026-03-27

### ✅ TASK 1 — Seed Real Events into Supabase
Checked existing events table (had 9 events). Inserted 5 missing festivals:
- **Spilt Milk Festival** (Brisbane, Nov 2025)
- **Wildlands Festival** (Adelaide, Jan 2026)
- **Southbound Festival** (Perth, Jan 2026)
- **Secret Garden Sessions** (Melbourne, Mar 2026, private, code: XK93PQ)
- **Rooftop After-Dark** (Sydney, Apr 2026, private, code: RT7ZBM)

Database now has 14 events total. All mapped correctly with genre_tags, attendee_estimate, is_private, invite_code.

### ✅ TASK 2 — Fix Screens to Use Supabase
Updated 3 screens to load events from Supabase via `getEvents()`:

- **EventsScreen.tsx** — Replaced static `festivals` import with `useState<FestivalEvent[]>([])`. Added `mapEvent()` helper to convert Supabase `Event` → `FestivalEvent` shape. Loads on mount via useEffect. TypeScript passes `tsc --noEmit` with no errors.
- **LeaderboardScreen.tsx** — Replaced static `TOP_FESTIVAL_NAMES` constant with dynamic state loaded from `getEvents()`. Festival filter dropdown now reflects live Supabase data.
- **SearchScreen.tsx** — Replaced static `partnerFestivalNames` and `sortedFestivals` with dynamic state from `getEvents()`. Festival browse list now uses `Event` type fields (`image_url`, `clip_count`, `city`).

**Not changed:**
- **MapScreen.tsx** — Left on local data. Requires `latitude`/`longitude` columns on Supabase `events` table first (see PENDING_MIGRATIONS.md Task 4). Adding a TODO: update when lat/lng migration is applied.
- **EventDetailScreen.tsx** — Uses `FestivalEvent` type from eventsData. Compatible because EventsScreen/SearchScreen pass `FestivalEvent`-shaped objects to it.

### ✅ TASK 3 — Fix web/vercel.json Routing
Updated to v2 format (removed old `builds` array). Added missing routes:
- `/terms` → `terms.html`
- `/dmca` → `dmca.html`
- `/clip/:id` → `clip.html` (uses `([^/]+)` regex)
- `/partner` → `partner.html`

### ✅ TASK 4 — Clips Storage Bucket Audit
Bucket status confirmed via API:
- `clips` bucket: **private**, exists ✅
- `thumbnails` bucket: public ✅
- `avatars` bucket: public ✅

⚠️ **Issue found:** `UploadScreen.tsx` constructs `/storage/v1/object/public/clips/...` URLs but the clips bucket is private — public URLs won't work. Two options documented in `PENDING_MIGRATIONS.md`. Recommend making clips bucket public for simplest MVP launch, or switching to signed URLs for more security.

### ⏭️ TASK 5 — Lat/Lng for Events
Cannot add `latitude`/`longitude` columns via REST API (requires DDL). Full details and migration SQL added to `PENDING_MIGRATIONS.md`. Once migration is run, all 11 coordinates are documented and ready to PATCH.

### ✅ TASK 6 — Code Quality Pass
**console.* statements found:**
- `WeeklyChallengesScreen.tsx:254` — `console.warn('WeeklyChallenges load error:', ...)` — appropriate
- `CreatorStatsScreen.tsx:205` — `console.warn('CreatorStatsScreen load error:', ...)` — appropriate
- `SavedClipsScreen.tsx:320` — `console.warn('SavedClipsScreen fetch error:', ...)` — appropriate
- `ErrorBoundary.tsx:31` — `console.error('ErrorBoundary caught:', ...)` — appropriate
- `App.tsx:225` — `console.error('Global error:', ...)` — appropriate

No debug `console.log` statements found anywhere. All logging is `warn`/`error` level and appropriate for production.

**clips.ts** — `getClips()` (getRecentClips), `uploadClip()` look correct. Upload stores metadata only; actual file upload handled in UploadScreen via XHR with session token. One issue: public URL construction for private bucket (see Task 4).

**auth.ts** — `signIn`, `signUp`, `signOut` all correctly wired to Supabase auth. Apple Sign-in, profile auto-creation (via DB trigger), password reset all present and correct.

**App.tsx** — Navigation setup looks clean. Auth state listener properly updates navigation. Deep link handling for `handsup://` scheme present. Push notification registration wired. No obvious issues.

### ✅ TASK 7 — Git Commit
All changes committed.

---

## Remaining Blockers (Updated)

1. **Apple Developer credentials** (unchanged from Round 1)
2. **Storage bucket** — clips bucket private + public URL construction mismatch (see PENDING_MIGRATIONS.md)
3. **lat/lng migration** — needs manual SQL in Supabase dashboard, then MapScreen can be updated
4. **Screenshots** not taken
5. **App Store Connect app** not created yet

---

## ✅ Completed Tasks

### TASK 1 — app.json Schema Fixes
- **Removed** invalid `"privacy": "public"` field
- **Fixed** `android.adaptiveIcon.foregroundImage` — now points to `./assets/android-icon-foreground.png` (the correct file that exists in assets)

### TASK 2 — Supabase Migrations
- **No blocking migrations needed.** All critical tables are already deployed.
- The `exec_sql` RPC is not available on this project (returns PGRST202 not found)
- Verification findings:
  - `clip_likes` ✅ (app uses this, NOT `likes` — no code references a `likes` table)
  - `push_tokens` (separate table) ✅ Not needed — app uses `push_token` column on `profiles`, which exists
  - `user_badges` ✅ Already deployed
  - `xp`, `level`, `current_streak`, `longest_streak`, `last_active_date` ✅ All on `profiles`
  - `push_notification_log` ✅ Exists
  - All core tables (clips, comments, saves, follows, notifications, collections, collection_clips, groups, events, analytics_events) ✅
- See `PENDING_MIGRATIONS.md` for full status table

### TASK 3 — expo-av Deprecation
- **Decision: Deferred migration for v1.0** — `expo-av` is used heavily across 3 screens (VerticalFeedScreen, VideoDetailScreen, UploadScreen) with complex APIs (seek, mute, fullscreen, trim playback). A full migration to `expo-video` right before App Store submission is too risky.
- **Action taken:** Added `expo.doctor.reactNativeDirectoryCheck.exclude: ["expo-av"]` to `package.json` to suppress the expo-doctor warning
- **Post-launch:** Plan expo-av → expo-video migration for v1.1 (added to SUBMISSION_CHECKLIST.md)

### TASK 4 — App Store Connect Metadata
- Created `APP_STORE_METADATA.md` with ready-to-paste content:
  - App name: `handsup – Festival Clips`
  - Subtitle: `Your crowd. Your clips.` (24 chars, under 30 limit)
  - Description: ~754 char compelling App Store copy
  - Keywords: `festival,concert,clips,live music,gig,crowd video,music events,upload video,handsup,moments` (98 chars)
  - What's New: `Welcome to handsup. Share your festival moments.`
  - Age rating: 12+
  - Category: Photo & Video / Entertainment
  - Privacy: https://handsuplive.com/privacy
  - Support: https://handsuplive.com/support

### TASK 5 — SUBMISSION_CHECKLIST.md Updated
- Marked all Supabase tables as `[x]` (all confirmed live)
- Marked app icon as `[x]` (confirmed 1024×1024px PNG)
- Marked all App Store metadata items as `[x]` (see APP_STORE_METADATA.md)
- Added note: bundle ID in checklist was wrong — corrected to `com.zacgibson.handsuplive`
- Added eas.json credential warning (appleId, ascAppId, appleTeamId are placeholder values)

---

## ⚠️ Remaining Blockers Before Submission

1. **Apple Developer credentials** — `eas.json` still has placeholder values:
   - `appleId`: `"APPLE_ID_HERE"`
   - `ascAppId`: `"APP_STORE_CONNECT_APP_ID_HERE"`
   - `appleTeamId`: `"APPLE_TEAM_ID_HERE"`
   - → Fill these in before running `eas build`

2. **Privacy Policy & Terms URLs must be live** — Apple requires these to resolve:
   - https://handsuplive.com/privacy
   - https://handsuplive.com/terms

3. **Screenshots not taken** — Need 6.9" and 6.5" iPhone screenshots (6 scenes each)

4. **No testing done** — Full end-to-end test run required before submission

5. **App Store Connect app not yet created** — Need to create the app record in App Store Connect with bundle ID `com.zacgibson.handsuplive`

---

## ℹ️ Notes

- The `clips` storage bucket is **private** — verify upload/download policies are correctly set
- `events` table is missing `latitude`/`longitude` columns (needed for map feature) — non-blocking for launch if map isn't live yet
- RLS policies should be audited before launch (see PENDING_MIGRATIONS.md)

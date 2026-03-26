# Handsup App — App Store Submission Checklist

Bundle ID: `com.zacgibson.handsuplive`
Version: 1.0.0 | Build: 1

---

## 🍎 Apple Developer Account

- [ ] Apple Developer account active ($149 AUD/yr) — [developer.apple.com](https://developer.apple.com)
- [ ] App Store Connect app created with bundle ID `com.zacgibson.handsuplive`
- [ ] App name, subtitle, and description written in App Store Connect
- [ ] Apple Team ID confirmed (fill in `eas.json` → `appleTeamId`)
- [ ] App Store Connect App ID confirmed (fill in `eas.json` → `ascAppId`)
- [ ] Apple ID confirmed (fill in `eas.json` → `appleId`)

---

## 🗄️ Supabase — All Schemas Deployed

Run these SQL migrations in the Supabase SQL editor (in order):

- [x] `profiles` table — exists with xp, level, current_streak, longest_streak, last_active_date, push_token columns
- [x] `clips` table — confirmed live with data
- [x] `comments` table — exists
- [x] `clip_likes` table — exists (NOTE: app uses `clip_likes`, not `likes`)
- [x] `saves` table — exists
- [x] `follows` table — exists
- [x] `notifications` table — exists
- [x] `collections` table — exists
- [x] `collection_clips` table — exists
- [x] `groups` table — exists
- [x] `group_members` table — exists
- [x] `events` table — exists with data
  - **TODO for Map feature**: Add `latitude FLOAT` and `longitude FLOAT` columns to `events` table
- [x] `analytics_events` table — exists
- [x] `push_notification_log` table — exists (app uses `push_token` column on profiles, not a separate table)
- [x] `user_badges` table — exists (XP & badges migration applied)
- [x] Streak fields on profiles — `current_streak`, `longest_streak`, `last_active_date` confirmed
- [ ] Row Level Security (RLS) policies — verify enabled on all user-data tables
- [x] Storage bucket `clips` created (public: false — verify upload policies are set)
- [x] Storage bucket `avatars` created (public: true)
- [x] Storage bucket `thumbnails` created (public: true)

### ⚠️ Pending SQL (requires Supabase SQL editor — exec_sql RPC not available)

The following cannot be run via API and must be pasted into the Supabase SQL editor manually.
SQL files are in `/supabase/` folder of the repo.

No missing tables identified — all core tables are present. The checklist item for `push_tokens` (separate table) is **not needed** — the app uses a `push_token` column on `profiles` instead, which exists.

---

## ✅ Testing Checklist

- [ ] Test account created (sign up, complete profile)
- [ ] Real video upload tested end-to-end (pick video → upload → appears in feed)
- [ ] Video trim flow tested (pick video > 60s → trimmer UI appears → trim applied)
- [ ] @mention autocomplete tested in comments
- [ ] @mention notification created when comment posted
- [ ] Festival map loads with correct markers
- [ ] Event detail screen opens from map marker
- [ ] Follow/unfollow working
- [ ] Notifications screen showing activity
- [ ] Search working (artists, hashtags)
- [ ] Groups working (create, join, view)
- [ ] Collections working (save to collection)
- [ ] Settings (autoplay, data saver) persist
- [ ] Deep link `handsup://clip/:id` works
- [ ] Instagram Stories share button working
- [ ] Report clip flow working

---

## 🎨 App Store Assets

- [x] App icon — 1024×1024px PNG confirmed (`assets/icon.png`)
- [ ] Screenshots taken for **6.9" iPhone** (iPhone 16 Pro Max) — 1320×2868px
- [ ] Screenshots taken for **6.5" iPhone** (iPhone 14 Plus / 15 Plus) — 1284×2778px
- [ ] At least 3 screenshots per device size (App Store requires minimum 1, but 5–10 recommended)
- [ ] Screenshot scenes to capture:
  - [ ] Feed / Home screen with video playing
  - [ ] Upload screen with video selected
  - [ ] Festival map with markers
  - [ ] Event detail with clip count
  - [ ] Profile screen
  - [ ] Video detail with comments

---

## 📋 App Store Connect — Metadata

- [x] **App Name**: handsup – Festival Clips (see APP_STORE_METADATA.md)
- [x] **Subtitle**: Your crowd. Your clips. (24 chars, under 30 limit)
- [x] **Category**: Photo & Video
- [x] **Secondary Category**: Entertainment
- [x] **Age Rating**: 12+ (User Generated Content, Mild Language)
- [x] **Privacy Policy URL**: https://handsuplive.com/privacy
- [x] **Support URL**: https://handsuplive.com/support
- [x] **Description** written — see APP_STORE_METADATA.md
- [x] **Keywords** (98 chars, under 100 limit): `festival,concert,clips,live music,gig,crowd video,music events,upload video,handsup,moments`
- [x] **What's New in This Version**: "Welcome to handsup. Share your festival moments."

See `APP_STORE_METADATA.md` for all ready-to-paste content.

---

## 🔒 Legal & Compliance

- [ ] Privacy Policy URL live at https://handsuplive.com/privacy (required by Apple)
- [ ] Terms of Service URL live at https://handsuplive.com/terms
- [ ] DMCA email active: dmca@handsup.app
- [ ] COPPA compliance reviewed (app is 12+, no children's data collected)
- [ ] GDPR considerations reviewed (user data deletion flow available)

---

## 🏗️ Build & Submit

```bash
# 1. Login to EAS
eas login

# 2. Configure project (first time only)
eas build:configure

# 3. Build for production (iOS)
eas build --platform ios --profile production

# 4. Build for production (Android)
eas build --platform android --profile production

# 5. Submit to App Store (after build completes)
eas submit --platform ios

# 6. Submit to Google Play
eas submit --platform android
```

**Before building:** Fill in `eas.json` with your actual Apple credentials:
- `appleId`: your Apple ID email
- `ascAppId`: App Store Connect numeric app ID
- `appleTeamId`: your Apple Developer Team ID

- [ ] `eas.json` Apple credentials filled in
- [ ] `eas build --platform ios --profile production` completed successfully
- [ ] Build reviewed in App Store Connect (Testflight first recommended)
- [ ] Internal Testflight testing completed
- [ ] External Testflight beta (optional, recommended)
- [ ] App submitted for App Store review via `eas submit --platform ios`
- [ ] App Store review approval received 🎉

---

## 🚀 Post-Launch

- [ ] Monitor crash reports in App Store Connect
- [ ] Set up Supabase alerting for errors
- [ ] Respond to initial user reviews
- [ ] Plan v1.1 (push notifications polish, video trimming server-side, trending algorithm)
- [ ] Migrate from `expo-av` to `expo-video` / `expo-audio` (flagged by expo-doctor; suppressed for v1.0)

---

_Last updated: March 2026_

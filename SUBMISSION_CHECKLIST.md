# Handsup App — App Store Submission Checklist

Bundle ID: `com.handsuplate.app`
Version: 1.0.0 | Build: 1

---

## 🍎 Apple Developer Account

- [ ] Apple Developer account active ($149 AUD/yr) — [developer.apple.com](https://developer.apple.com)
- [ ] App Store Connect app created with bundle ID `com.handsuplate.app`
- [ ] App name, subtitle, and description written in App Store Connect
- [ ] Apple Team ID confirmed (fill in `eas.json` → `appleTeamId`)
- [ ] App Store Connect App ID confirmed (fill in `eas.json` → `ascAppId`)
- [ ] Apple ID confirmed (fill in `eas.json` → `appleId`)

---

## 🗄️ Supabase — All Schemas Deployed

Run these SQL migrations in the Supabase SQL editor (in order):

- [ ] `profiles` table — `id`, `username`, `full_name`, `avatar_url`, `bio`, `is_verified`, `follower_count`, `clip_count`, `created_at`
- [ ] `clips` table — `id`, `uploader_id`, `artist`, `festival_name`, `location`, `clip_date`, `description`, `video_url`, `thumbnail_url`, `duration_seconds`, `view_count`, `download_count`, `created_at`
- [ ] `comments` table — `id`, `clip_id`, `user_id`, `text`, `created_at`
- [ ] `likes` table — `id`, `clip_id`, `user_id`, `created_at`
- [ ] `saves` table — `id`, `clip_id`, `user_id`, `saved_at`
- [ ] `follows` table — `id`, `follower_id`, `following_id`, `created_at`
- [ ] `notifications` table — `id`, `user_id`, `type` (like/comment/follow/mention), `actor_id`, `clip_id`, `read`, `created_at`
- [ ] `collections` table — `id`, `user_id`, `name`, `created_at`
- [ ] `collection_clips` table — `id`, `collection_id`, `clip_id`, `added_at`
- [ ] `groups` table — `id`, `name`, `description`, `created_by`, `created_at`
- [ ] `group_members` table — `id`, `group_id`, `user_id`, `joined_at`
- [ ] `events` table — `id`, `name`, `location`, `country`, `dates`, `description`, `clip_count`, `is_partner`, `created_at`
  - **TODO for Map feature**: Add `latitude FLOAT` and `longitude FLOAT` columns to `events` table
- [ ] `analytics_events` table — `id`, `event_name`, `user_id`, `properties`, `created_at`
- [ ] `push_tokens` table — `id`, `user_id`, `token`, `platform`, `created_at`
- [ ] Row Level Security (RLS) policies enabled on all user-data tables
- [ ] Storage bucket `clips` created with public read access
- [ ] `clips` storage bucket policies set (authenticated users can upload to own folder)

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
- [ ] Deep link `handsuplate://clip/:id` works
- [ ] Instagram Stories share button working
- [ ] Report clip flow working

---

## 🎨 App Store Assets

- [ ] App icon — 1024×1024px PNG, no transparency, no rounded corners (Apple adds them)
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

- [ ] **App Name**: Handsup - Festival Clips
- [ ] **Subtitle**: Share your festival moments (max 30 chars)
- [ ] **Category**: Photo & Video
- [ ] **Secondary Category**: Entertainment
- [ ] **Age Rating**: 12+ (User Generated Content, Mild Language)
- [ ] **Privacy Policy URL** live — required by Apple (e.g. https://handsup.live/privacy)
- [ ] **Support URL** (e.g. https://handsup.live/support)
- [ ] **Description** written (max 4000 chars)
- [ ] **Keywords** (max 100 chars total, comma-separated):

```
festival,concerts,music clips,live music,tiktok festivals,gigs,handsup,upload video,events
```

Top 10 keywords:
1. festival clips
2. concert videos
3. live music
4. festival moments
5. music events
6. gig videos
7. crowd clips
8. handsup
9. festival app
10. upload concert

- [ ] **What's New in This Version** written (for v1.0.0: "Welcome to Handsup! Share your festival moments.")

---

## 🔒 Legal & Compliance

- [ ] Privacy Policy URL live at https://handsup.live/privacy (required by Apple)
- [ ] Terms of Service URL live at https://handsup.live/terms
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

---

_Last updated: March 2026_

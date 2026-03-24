# 🙌 Handsup

> Be there. We'll film it.

A platform for music festival goers to share and discover video clips from events — so you can put your phone down and actually enjoy the show.

---

## ✨ Features

### Feed & Discovery
- **Home feed** — browse recent and trending clips with real-time updates via Supabase Realtime
- **For You / Following tabs** — personalised feed or clips from people you follow
- **Trending screen** — weekly top clips ranked by downloads
- **Vertical video feed** — swipe-up TikTok-style browsing
- **Search** — search by artist, festival, location, hashtag, or date
- **Artist pages** — dedicated pages per artist with all their clips

### Clips
- **Upload** — pick a video, tag with artist + festival + location + date + description
- **Video trimming** — trim clips longer than 60 seconds before upload
- **Download** — save clips to camera roll
- **Pinned clips** — long press to pin one clip to the top of your profile
- **Clip expiry warnings** — signed URL clips show a ⚠️ badge in Saved Clips
- **Save / Bookmark** — save clips locally and to Supabase
- **Collections** — organise saved clips into named collections
- **Download history** — see every clip you've downloaded

### Social
- **Follow / Unfollow** users
- **Mute** users (hides their clips from your feed)
- **Comments** — comment on clips with @mention support
- **Likes** — heart clips
- **Activity feed** — notifications for likes, comments, follows, mentions
- **Push notifications** — Expo push notifications for activity
- **Groups** — create and join groups around festivals or artists
- **Share** — share clips via iOS Share Sheet or Instagram Stories

### Profile
- **Profile page** — avatar (initials fallback), bio, stats (uploads, downloads, followers, following)
- **Pinned clip** — one clip pinned to the top of profile with 📌 badge
- **Profile completion prompt** — nudge to add bio + photo
- **Edit profile** — update display name, bio, avatar
- **Creator stats** — views, downloads, top clips dashboard
- **Verified badge** — ⚡ for verified creators

### Events
- **Events directory** — browse upcoming festivals
- **Event detail** — info + all clips from that event
- **Add event** — submit new events
- **Festival map** — map view with markers for events (requires lat/lng on events table)

### App
- **Onboarding** — first-run walkthrough
- **Auth** — Supabase email/password (magic link-ready)
- **Settings** — autoplay, data saver mode, notification preferences
- **Report clip** — copyright, inappropriate, duplicate, spam, poor quality, wrong info
- **Admin panel** — moderation queue for verified admins
- **Dark theme** — full black (#000) with electric purple (#8B5CF6) accents
- **Deep links** — `handsuplate://clip/:id` opens a specific clip
- **Pull-to-refresh** — all screens with consistent purple RefreshControl
- **Skeleton loaders** — smooth loading states
- **Error boundaries** — global crash protection

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- [Expo Go](https://expo.dev/go) on your iPhone or Android (or use a simulator)
- A [Supabase](https://supabase.com) project with the schema deployed (see below)

### Setup

```bash
cd handsup
npm install
```

Create `.env` (or `app.config.js`) with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Start the dev server:

```bash
npx expo start
```

Scan the QR code in Expo Go. That's it.

### Run on iOS Simulator
```bash
npx expo start --ios
```

### Run on Android Emulator
```bash
npx expo start --android
```

### Run in browser (web, limited)
```bash
npx expo start --web
```

---

## 🗄️ Supabase Setup

Create a project at [supabase.com](https://supabase.com), then run these SQL files in order in the **SQL Editor**:

| # | File | What it creates |
|---|------|-----------------|
| 1 | `supabase/schema.sql` | Core tables: `profiles`, `clips`, `saves`, `reports`, `push_tokens`, `analytics_events` |
| 2 | `supabase/likes_schema.sql` | `likes` table |
| 3 | `supabase/comments_schema.sql` | `comments` table with @mention support |
| 4 | `supabase/follows_schema.sql` | `follows` + `muted_users` tables |
| 5 | `supabase/groups_schema.sql` | `groups` + `group_members` tables |
| 6 | `supabase/notifications_schema.sql` | `notifications` table |
| 7 | `supabase/collections_schema.sql` | `collections` + `collection_clips` tables |
| 8 | `supabase/analytics_schema.sql` | Analytics events table |
| 9 | `supabase/private_events_migration.sql` | Private events support |
| 10 | `supabase/tags_note.sql` | Hashtag/tags support notes |

### Storage

Create a storage bucket named `clips` with **public read access**, then set a policy to allow authenticated users to upload to their own folder (`user_id/*`).

### RLS

Enable Row Level Security on all tables. Basic policies:
- Users can read all approved clips
- Users can only insert/update/delete their own rows
- Saves, likes, follows: read own, insert/delete own

---

## 📱 App Store Submission

See [`SUBMISSION_CHECKLIST.md`](./SUBMISSION_CHECKLIST.md) for the full step-by-step guide.

Quick summary:

```bash
# 1. Login
eas login

# 2. Production build (iOS)
eas build --platform ios --profile production

# 3. Submit
eas submit --platform ios
```

Bundle ID: `com.handsuplate.app`

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Framework | [Expo](https://expo.dev) (React Native) |
| Language | TypeScript |
| Navigation | React Navigation (bottom tabs + native stack) |
| Backend | [Supabase](https://supabase.com) (Postgres + Auth + Storage + Realtime) |
| Video | expo-av (playback), expo-image-picker (upload) |
| Media | expo-media-library (download to camera roll) |
| Push Notifications | Expo Push Notifications |
| Haptics | expo-haptics |
| Storage | AsyncStorage (local), Supabase (cloud) |
| Animations | React Native Animated |
| Icons | @expo/vector-icons (Ionicons) |
| Gradients | expo-linear-gradient |
| Build/Deploy | [EAS Build](https://docs.expo.dev/eas/) |

---

## Project Structure

```
handsup/
├── App.tsx                          # Root navigation + auth
├── app.json                         # Expo config
├── eas.json                         # EAS build profiles
├── assets/                          # Logo, icons, splash
├── supabase/                        # SQL migration files
└── src/
    ├── components/                  # Shared UI components
    │   ├── ErrorBoundary.tsx
    │   ├── SkeletonCard.tsx
    │   └── SwipeableClipCard.tsx
    ├── hooks/                       # Custom hooks
    │   └── useSavedClips.ts
    ├── screens/                     # All app screens
    │   ├── HomeScreen.tsx
    │   ├── SearchScreen.tsx
    │   ├── UploadScreen.tsx
    │   ├── ProfileScreen.tsx
    │   ├── UserProfileScreen.tsx
    │   ├── VideoDetailScreen.tsx
    │   ├── ArtistScreen.tsx
    │   ├── EventsScreen.tsx
    │   ├── EventDetailScreen.tsx
    │   ├── SavedClipsScreen.tsx
    │   ├── TrendingScreen.tsx
    │   ├── ActivityScreen.tsx
    │   ├── CreatorStatsScreen.tsx
    │   ├── SettingsScreen.tsx
    │   ├── EditProfileScreen.tsx
    │   ├── ReportScreen.tsx
    │   ├── AdminScreen.tsx
    │   └── ... (more)
    ├── services/                    # Supabase + API calls
    │   ├── supabase.ts
    │   ├── auth.ts
    │   ├── clips.ts
    │   ├── follows.ts
    │   ├── notifications.ts
    │   └── ...
    ├── types/                       # TypeScript types
    │   └── index.ts
    └── utils/                       # Helpers (cache, etc.)
```

---

## Design

- Background: `#000000` (full black)
- Accent: `#8B5CF6` (electric purple)
- Dark cards, rounded corners, concert energy
- Consistent tab bar safe area for iPhone home indicator

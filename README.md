# 🙌 Handsup

> Be there. We'll film it.

A platform for music festival goers to share and download video clips from events — so you can put your phone down and actually enjoy the show.

---

## What it does

- **Browse** a feed of clips tagged by artist, festival, location and date
- **Search** for any artist or event
- **Download** clips straight to your camera roll
- **Upload** your own clips and tag them for others to find

---

## Running locally

### Prerequisites
- Node.js 18+
- Expo Go app on your phone (iOS or Android) — install from the App Store / Play Store

### Setup

```bash
cd handsup
npm install
npx expo start
```

Scan the QR code in Expo Go on your phone. That's it.

### Run in browser (web)
```bash
npx expo start --web
```

---

## Project structure

```
handsup/
├── App.tsx                     # Root navigation
├── src/
│   ├── data/
│   │   └── mockData.ts         # Mock video clips (replace with Supabase later)
│   └── screens/
│       ├── HomeScreen.tsx      # Feed of recent clips
│       ├── SearchScreen.tsx    # Search by artist / location / date
│       ├── VideoDetailScreen.tsx  # Individual clip view + download
│       ├── UploadScreen.tsx    # Upload + tag a new clip
│       └── ProfileScreen.tsx   # Your uploads and downloads
```

---

## Next steps (when ready)

1. **Supabase** — sign up at supabase.com, create a project, add `.env` with keys
2. **Real video playback** — swap mock player for `expo-av`
3. **Real downloads** — use `expo-media-library` + `expo-file-system`
4. **Camera upload** — use `expo-image-picker` for real video selection
5. **Auth** — Supabase Auth (email/magic link or social login)

---

## Design

- Background: `#0D0D0D`
- Accent: `#8B5CF6` (electric purple)
- Dark cards, rounded corners, concert energy

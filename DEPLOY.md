# Handsup — Deployment Guide

---

## 🌐 Website (handsup.app) — Deploy in 5 minutes, free

The landing page + privacy + support pages live in `web/`.

### Option A: Vercel (recommended)

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click "Add New Project"
3. Connect your GitHub account and select the `handsup` repo
4. Set **Root Directory** to `web`
5. Click Deploy

That's it. Vercel gives you a free `.vercel.app` URL instantly.

To connect your own domain (handsup.app):
- Buy the domain at [Namecheap](https://namecheap.com) or [Cloudflare](https://cloudflare.com) (~$15 AUD/year)
- In Vercel → Project Settings → Domains → Add `handsup.app`
- Update your DNS records as instructed (takes ~5 minutes)

### Option B: Netlify (also free)

1. Go to [netlify.com](https://netlify.com) and sign up
2. Drag the `web/` folder onto the deploy zone
3. Done — live URL in 30 seconds

---

## 📱 App — Running Locally

```bash
cd ~/.openclaw/workspace/handsup
npm install
npx expo start
```

Scan the QR code in **Expo Go** (download from App Store / Play Store).

### Run in browser
```bash
npx expo start --web
```

---

## 📱 App — Publishing to App Store / Play Store

### Prerequisites
- Apple Developer account ($149 AUD/year) — [developer.apple.com](https://developer.apple.com)
- Google Play Developer account ($30 AUD one-time) — [play.google.com/console](https://play.google.com/console)
- EAS CLI: `npm install -g eas-cli`

### Build for iOS
```bash
eas build --platform ios
```

### Build for Android
```bash
eas build --platform android
```

### Submit to stores
```bash
eas submit --platform ios
eas submit --platform android
```

---

## 🗄️ Backend — Supabase Setup

1. Sign up at [supabase.com](https://supabase.com) (free tier is generous)
2. Create a new project (choose Sydney region for AU users)
3. Go to **SQL Editor** → paste contents of `supabase/schema.sql` → Run
4. Go to **Storage** → create three buckets:
   - `clips` (private)
   - `thumbnails` (public)
   - `avatars` (public)
5. Go to **Settings → API** → copy your `URL` and `anon key`
6. Create `.env` in the handsup root:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

7. Install the Supabase client:
```bash
npm install @supabase/supabase-js
```

The schema is fully set up — tables, RLS, triggers, seed data all ready to go.

---

## 📧 Email Setup

For a professional email (hello@handsup.app, festivals@handsup.app, dmca@handsup.app):

- **Free option:** [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/) — forward @handsup.app to any Gmail
- **Paid option:** Google Workspace ($10 AUD/month) — proper Gmail interface with your domain

---

## Checklist Before Launch

- [ ] Domain purchased (handsup.app)
- [ ] Website deployed to Vercel
- [ ] Supabase project created + schema deployed
- [ ] Email forwarding set up
- [ ] App updated to use real Supabase backend (replace mock data)
- [ ] Apple Developer account active
- [ ] App submitted to TestFlight for beta testing
- [ ] First festival partnership confirmed
- [ ] Social accounts created (@handsup on TikTok + Instagram)

# Handsup — App Store Submission Guide
> Step-by-step walkthrough to get from code to published app on iOS App Store + Google Play.

---

## Overview

| Step | Platform | Est. Time |
|---|---|---|
| Apple Developer Account | iOS | 15 min (+ 1–2 days approval) |
| App Store Connect setup | iOS | 30 min |
| Build & upload via Expo | Both | 30–60 min |
| TestFlight internal test | iOS | Same day |
| App Store Review | iOS | 1–7 days (usually 24–48h) |
| Google Play setup | Android | 30 min |
| Google Play Review | Android | 1–3 days |

---

## Part 1 — Prerequisites

### 1.1 Apple Developer Account
- Sign up at https://developer.apple.com/programs/enroll/
- Cost: **$149 AUD/year**
- You'll need a credit card and to verify your identity
- Takes 1–2 business days to activate

### 1.2 Google Play Developer Account
- Sign up at https://play.google.com/console/signup
- One-time fee: **$30 USD**
- Usually activates within 24 hours

### 1.3 Expo Account (if not already set up)
```bash
npx expo login
```

### 1.4 EAS CLI (Expo Application Services)
```bash
npm install -g eas-cli
eas login
```

---

## Part 2 — App Configuration

### 2.1 Update `app.json`
Make sure these fields are set correctly:

```json
{
  "expo": {
    "name": "Handsup",
    "slug": "handsup",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0D0D0D"
    },
    "ios": {
      "bundleIdentifier": "com.handsup.app",
      "buildNumber": "1",
      "supportsTablet": false,
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "Handsup needs access to save clips to your camera roll.",
        "NSPhotoLibraryAddUsageDescription": "Handsup needs access to save clips to your camera roll.",
        "NSCameraUsageDescription": "Handsup uses your camera to record and upload clips.",
        "NSMicrophoneUsageDescription": "Handsup uses your microphone to record audio with video clips."
      }
    },
    "android": {
      "package": "com.handsup.app",
      "versionCode": 1,
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "CAMERA",
        "RECORD_AUDIO"
      ]
    }
  }
}
```

### 2.2 Create `eas.json`
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## Part 3 — Assets Required

### 3.1 App Icon
- **iOS:** `assets/icon.png` — 1024×1024px, PNG, no transparency, no rounded corners (Apple rounds them)
- **Android:** Same file works, or provide adaptive icon

### 3.2 Splash Screen
- `assets/splash.png` — 1284×2778px (iPhone 14 Pro Max), dark background `#0D0D0D`, logo centred

### 3.3 Screenshots (required for App Store)
Take on a **real device** or in Xcode Simulator:
- iPhone 6.7" (iPhone 15 Pro Max): 1290×2796px — 3 minimum, up to 10
- iPhone 6.5" (iPhone 14 Plus): 1242×2688px
- iPad 12.9" (if supporting tablets): 2048×2732px

**Screens to screenshot:**
1. Home feed — `"Every set. Every stage. Every moment."`
2. Search results — `"Find any artist. Any festival. Any night."`
3. Events tab — `"Browse festivals. Discover what was captured."`
4. Video detail + download button — `"Download to your camera roll. It's yours."`
5. Leaderboard / Profile — `"Upload. Climb the board. Win prizes."`
6. Onboarding slide — `"Put your phone down. Someone else got the shot."`

---

## Part 4 — iOS Build & Upload

### 4.1 Configure your Apple credentials
```bash
eas credentials
```
Select iOS → set up provisioning profile and distribution certificate.

### 4.2 Build production IPA
```bash
eas build --platform ios --profile production
```
This uploads to Expo's build servers and takes ~10–20 minutes. You'll get a download link.

### 4.3 Submit to App Store Connect
```bash
eas submit --platform ios --latest
```
Or manually download the `.ipa` and upload via **Transporter** (free Mac app from App Store).

---

## Part 5 — App Store Connect Setup

Go to https://appstoreconnect.apple.com

### 5.1 Create New App
- Platform: iOS
- Name: `Handsup – Festival Video`
- Bundle ID: `com.handsup.app`
- SKU: `handsup-app-001`

### 5.2 Fill in App Information

**App Store tab:**

| Field | Value |
|---|---|
| Name | `Handsup – Festival Video` |
| Subtitle | `Put your phone down. We got it.` |
| Category (Primary) | Music |
| Category (Secondary) | Entertainment |
| Age Rating | 4+ |

**Description:** *(copy from `APP_STORE_LISTING.md`)*

**Keywords (max 100 chars):**
```
festival,concert,live music,video,clips,download,tame impala,laneway,coachella,splendour
```

**URLs:**
- Support: `https://handsup.app/support`
- Marketing: `https://handsup.app`
- Privacy Policy: `https://handsup.app/privacy`

### 5.3 Upload Screenshots
Upload via drag-and-drop in the App Store Connect media section. Order them intentionally — first screenshot is your hero shot.

### 5.4 Review Information
- Sign-in Required: No (app has guest/browse mode)
- Demo Account: Not required
- Notes for reviewer:
  ```
  This app allows users to search and download concert/festival video clips.
  Upload and download functions are demonstrated with sample content.
  Real media library access is requested to save clips to camera roll.
  ```

### 5.5 Version Release
- Select: "Manually release this version" ← lets you control launch day
- Or: "Automatically release after approval"

---

## Part 6 — TestFlight (Internal Testing First)

Before submitting for App Store review, test via TestFlight:

1. In App Store Connect → TestFlight tab
2. Add internal testers (up to 100, any Apple ID)
3. Add external testers: create a group, add emails, submit for TestFlight review (usually same day)
4. Share TestFlight link with beta users

**Test checklist before submission:**
- [ ] Onboarding flow works end to end
- [ ] Search returns results
- [ ] Video playback works
- [ ] Download to camera roll works
- [ ] Upload flow works
- [ ] Profile screen loads
- [ ] No crashes on cold launch
- [ ] Splash screen displays correctly
- [ ] No broken navigation

---

## Part 7 — Android Build & Google Play

### 7.1 Build AAB (Android App Bundle)
```bash
eas build --platform android --profile production
```

### 7.2 Google Play Console Setup
1. Go to https://play.google.com/console
2. Create app → Android → Free → Not containing ads → Create app
3. Fill in Store listing:
   - **App name:** `Handsup – Festival & Concert Video`
   - **Short description:** `Find & download clips from festivals and concerts. Put your phone down. 🙌`
   - **Full description:** *(same as iOS, copy from `APP_STORE_LISTING.md`)*
   - **Category:** Music & Audio
4. Upload screenshots (phone: 1080×1920px min, tablet optional)
5. Upload the `.aab` file to Production track
6. Complete content rating questionnaire → Everyone

### 7.3 Submit
Send to review. Google Play typically reviews in 1–3 days.

---

## Part 8 — Post-Submission

### What happens during review
- Apple reviewers will open the app and test it
- They check: guidelines compliance, privacy policy, crash-free, no placeholder content
- Most rejections: missing permissions descriptions, broken demo flow, missing privacy policy

### Common rejection reasons + fixes
| Rejection | Fix |
|---|---|
| Privacy policy missing | Make sure `handsup.app/privacy` is live before submitting |
| Guideline 4.2 (minimum functionality) | Add more real content/screens |
| Permission string missing | Add all NSUsageDescription strings to `app.json` |
| App crashes on launch | Test on real device, not just simulator |
| Demo login doesn't work | Provide working test account in review notes |

---

## Part 9 — Launch Day Checklist

- [ ] Apple Developer account active ($149 AUD paid)
- [ ] Google Play account active ($30 USD paid)
- [ ] `handsup.app` domain live with `/privacy`, `/support`, `/terms` pages
- [ ] App icon 1024×1024px ready
- [ ] Splash screen asset ready
- [ ] Screenshots taken on real device
- [ ] Description and keywords finalized
- [ ] TestFlight internal test passed
- [ ] Supabase backend connected (real data, not mock)
- [ ] Video upload/download working end-to-end
- [ ] Push notification entitlements configured
- [ ] App Store listing submitted for review
- [ ] Google Play listing submitted for review
- [ ] Launch announcement ready (social, email, festival partners)

---

## Quick Reference — Key Commands

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure project
eas build:configure

# Build iOS (production)
eas build --platform ios --profile production

# Build Android (production)
eas build --platform android --profile production

# Submit iOS to App Store
eas submit --platform ios --latest

# Submit Android to Google Play
eas submit --platform android --latest

# Build both platforms at once
eas build --platform all --profile production
```

---

*Document version: March 2026. Check Expo EAS docs for latest CLI changes: https://docs.expo.dev/build/introduction/*

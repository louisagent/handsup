# Handsup — App Store Screenshots Guide

> Version 1.0 | March 2026
> Brand ref: BRAND.md | Listing ref: APP_STORE_LISTING.md

---

## Required sizes

| Device | Resolution | Status |
|---|---|---|
| **6.7" iPhone** (iPhone 15 Pro Max) | 1290 × 2796 px | ✅ REQUIRED |
| **6.5" iPhone** (iPhone 11 Pro Max / XS Max) | 1242 × 2688 px | ✅ REQUIRED (or 6.7") |
| **6.1" iPhone** (iPhone 15) | 1179 × 2556 px | Optional (Apple accepts 6.7" for all 6.x") |
| **5.5" iPhone** (iPhone 8 Plus) | 1242 × 2208 px | Recommended (older devices) |
| **iPad Pro 12.9"** | 2048 × 2732 px | Required if supporting iPad |

> **Minimum:** Submit 6.7" (or 6.5") screenshots. Apple will scale them for smaller devices unless you provide specific sizes.

---

## Screenshots needed (5 minimum, 10 maximum)

### Screenshot 1 — Hero / First Impression
**Screen:** Home feed with clip cards and trending strip
**Headline:** "Every set. Every stage. Every moment."
**Sub:** "Discover and download live music clips from festivals worldwide"
**Visual:** Home feed showing 2–3 clip cards with artist names, festival badges, gradient thumbnails
**Design notes:**
- This is your money shot — make it feel like being inside a venue
- Use the Brand Glow gradient as background: `radial-gradient(ellipse at center bottom, #8B5CF6 0%, #0D0D0D 70%)`
- Show real-looking artist names (Tame Impala, Fisher, Chris Liebing)

---

### Screenshot 2 — Video Player
**Screen:** VideoDetailScreen playing a clip
**Headline:** "Watch. Download. It's yours."
**Sub:** "HD clips saved directly to your camera roll. No watermark."
**Visual:** Full-screen video player with artist name, festival badge, download button highlighted in Electric Purple (#8B5CF6)
**Design notes:**
- Show the download button in its active/highlighted state
- Overlay a gradient so text is legible over the video thumbnail
- Artist: "Tame Impala" | Festival: "Laneway Festival Sydney"

---

### Screenshot 3 — Discovery & Search
**Screen:** SearchScreen with trending tags + suggested results
**Headline:** "Find any artist. Any festival. Any night."
**Sub:** "Search by artist, festival, city or date. Your intent — instantly."
**Visual:** Search screen with "Tame Impala" typed in the search bar, results showing matching clips
**Design notes:**
- Show the search bar focused with a query typed in
- Display 2–3 result cards below to show immediate utility

---

### Screenshot 4 — Events & Festivals
**Screen:** EventFeedScreen or EventDetailScreen
**Headline:** "Browse festivals. Discover what was captured."
**Sub:** "From Laneway to Coachella — every event, every clip."
**Visual:** Events tab showing festival cards (Laneway, Coachella, Splendour in the Grass)
**Design notes:**
- Festival cards with gradient overlays and location tags
- Use familiar Australian and international festival names for recognition

---

### Screenshot 5 — Upload & Create
**Screen:** UploadScreen with fields filled in
**Headline:** "Film something great? Tag it. Share it forever."
**Sub:** "Upload in seconds. Earn credits. Get recognised by the community."
**Visual:** Upload screen with video thumbnail selected, artist/festival fields filled, upload progress bar active
**Design notes:**
- Show the form in a completed state (not empty) — shows ease of use
- Progress bar should be ~60% to imply it's fast

---

### Screenshot 6 — Onboarding / Value Prop (bonus)
**Screen:** Onboarding slide 1 or a styled marketing screen
**Headline:** "Be there. We'll film it."
**Sub:** "Put your phone down. Someone else got the shot."
**Visual:** Dark screen with the handsup wordmark + tagline, hands emoji, subtle brand glow
**Design notes:**
- Use this as screenshot 1 OR 6 — it works as an opener or closer
- Keep it minimal — headline + logo + glow. No UI chrome needed.
- Most emotional screenshot. Let the copy do the work.

---

## Design guidelines for screenshots

### Layout structure
```
┌─────────────────────────────┐
│  [top 28%] Headline + Sub   │  ← Dark background, text overlay
│  [bottom 72%] App UI        │  ← Device frame with real app screens
└─────────────────────────────┘
```

### Text overlay style
| Element | Style |
|---|---|
| Headline | Bold, white (#FFFFFF), 48–64pt equivalent, SF Pro Display |
| Subheading | Regular, Soft Purple (#A78BFA), 24–28pt equivalent |
| Background | #0D0D0D or radial glow gradient from brand |
| Position | Top 28% of the screenshot |

### Colour scheme
- **App background:** `#0D0D0D` (Void)
- **Primary accent:** `#8B5CF6` (Electric Purple)
- **Secondary accent:** `#A78BFA` (Soft Purple)
- **Card backgrounds:** `#161616`
- **Text:** White on dark, Electric Purple for festival/artist labels

### Device frame
- **Preferred:** iPhone 15 Pro in Black Titanium
- **Acceptable:** iPhone 15 Pro in Natural Titanium, iPhone 14 Pro in Deep Purple
- Frame colour should complement the dark app UI — avoid white/silver frames

---

## Headline copy options (A/B test these)

### Option A — Festival-focused (matches APP_STORE_LISTING.md)
1. "Every set. Every stage. Every moment."
2. "Watch. Download. It's yours."
3. "Find any artist. Any festival. Any night."
4. "Browse festivals. Discover what was captured."
5. "Film something great? Tag it. Share it forever."

### Option B — Emotion-focused
1. "Be there. We'll film it."
2. "Put your phone down. We got the shot."
3. "Your festival. Someone captured it."
4. "The memory you didn't know you'd want."
5. "Upload. Get recognised. 🙌"

### Option C — Direct / functional
1. "Festival video, on demand."
2. "Search. Find. Download. Done."
3. "Every clip. No watermark. Free."
4. "Built for people who actually go to shows."
5. "Melbourne-built. Festival-tested."

---

## Recommended tools

| Tool | Use | Cost |
|---|---|---|
| [Previewed](https://previewed.app) | Device frames + text overlays | Free / Paid |
| [AppLaunchpad](https://theapplaunchpad.com) | Full screenshot builder | Free trial |
| [Figma](https://figma.com) | Custom layouts, free device mockup frames available | Free |
| [DaVinci Resolve](https://blackmagicdesign.com) | Video screen capture + compositing | Free |
| Xcode Simulator | Take real device screenshots | Free (requires Mac + Xcode) |

### Quick screenshot with Simulator
```bash
# Boot the right simulator first
xcrun simctl boot "iPhone 15 Pro Max"

# Take a screenshot
xcrun simctl io booted screenshot screenshot.png

# Or set a specific device
xcrun simctl io "iPhone 15 Pro Max" screenshot ~/Desktop/screenshot-home.png
```

---

## App Store metadata (paired with screenshots)

| Field | Value |
|---|---|
| **App Name** | Handsup – Festival Video |
| **Subtitle** | Put your phone down. We got it. |
| **Category** | Music (primary), Entertainment (secondary) |
| **Age Rating** | 4+ |
| **Keywords** | festival, concert, live music, video, clips, download, tame impala, laneway, coachella, splendour |

> Full description copy: see `APP_STORE_LISTING.md`

---

## Production checklist

- [ ] Run app on iPhone 15 Pro Max (real device or Simulator)
- [ ] Navigate to each screen and take screenshots using Xcode
- [ ] Export raw screenshots at device resolution (1290×2796)
- [ ] Import into Figma / Previewed and apply device frames
- [ ] Add headline/sub overlays using the text style spec above
- [ ] Export final screenshots at 1290×2796 (6.7") and 1242×2688 (6.5")
- [ ] Upload to App Store Connect under each app version
- [ ] A/B test headline copy using Apple's Product Page Optimization (PPO)

---

*Reference SVG wireframes are in `assets/screenshots/`. Use them as layout guides, not final assets.*

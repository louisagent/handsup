# Screenshots Directory

This directory contains screenshot wireframe assets for the Handsup App Store listing.

## SVG Wireframes (design references)

| File | Screen | Headline |
|---|---|---|
| `screenshot-1-home.svg` | Home feed with clip cards | "Every set. Every stage. Every moment." |
| `screenshot-2-player.svg` | Full-screen video player | "Watch. Download. It's yours." |
| `screenshot-3-search.svg` | Search with results + tags | "Find any artist. Any festival. Any night." |
| `screenshot-4-events.svg` | Events/festivals browse | "Browse festivals. Discover what was captured." |
| `screenshot-5-upload.svg` | Upload form with progress | "Film something great? Tag it. Share it forever." |

These SVGs are **wireframe mockups** — layout and copy references only. Final screenshots should use real device captures.

## Full screenshot guide

→ See `../APP_STORE_SCREENSHOTS.md` for:
- Required resolutions (6.7", 6.5", 5.5", iPad)
- Design guidelines (colours, fonts, layout spec)
- Headline copy options (A/B test variants)
- Recommended tools (Previewed, Figma, AppLaunchpad)
- App Store metadata

---

## How to generate final screenshots

### Step 1 — Take device screenshots

```bash
# Boot iPhone 15 Pro Max simulator
xcrun simctl boot "iPhone 15 Pro Max"

# Open Simulator.app and navigate to each screen, then:
xcrun simctl io booted screenshot ~/Desktop/handsup-screen-home.png

# Or with a specific device UDID
xcrun simctl io <UDID> screenshot screenshot.png
```

**Or use a real device:**
1. Connect iPhone 15 Pro Max via USB
2. Open the Handsup app and navigate to the target screen
3. Press Side button + Volume Up to take a screenshot
4. AirDrop or cable-transfer to Mac

### Step 2 — Apply device frames + overlays

**Option A — Previewed (easiest)**
1. Go to [previewed.app](https://previewed.app)
2. Upload your screenshot PNG
3. Select iPhone 15 Pro (Black Titanium) frame
4. Add headline text in top 28% using the brand colours
5. Export at 1290×2796

**Option B — Figma**
1. Download a free iPhone 15 Pro Figma frame (search Figma Community)
2. Place screenshot inside device frame
3. Add dark background (#0D0D0D) above the device
4. Add headline text: White, 64pt, ExtraBold
5. Add sub text: #A78BFA, 28pt, Regular
6. Export frame at 1290×2796

**Option C — AppLaunchpad**
1. Go to [theapplaunchpad.com](https://theapplaunchpad.com)
2. Use their template builder
3. Upload screenshots, add copy, export batch

### Step 3 — Export sizes

| Size | Device | Required? |
|---|---|---|
| 1290 × 2796 | 6.7" iPhone 15 Pro Max | ✅ Yes |
| 1242 × 2688 | 6.5" iPhone 11 Pro Max | ✅ Yes (or 6.7") |
| 1242 × 2208 | 5.5" iPhone 8 Plus | Recommended |

Upload to **App Store Connect** → your app → Screenshots section.

---

## Brand colours reference

```
Background:     #0D0D0D  (Void)
Primary accent: #8B5CF6  (Electric Purple)
Secondary:      #A78BFA  (Soft Purple)
Card bg:        #161616
Border:         #222222
Body text:      #AAAAAA
White:          #FFFFFF
```

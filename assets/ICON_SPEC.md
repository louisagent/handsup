# Handsup App Icon Spec

## Concept
Raised hand with sound waves + musical note. Festival energy meets music discovery.

## Sizes needed for App Store submission
- iOS App Store: 1024x1024 PNG (no alpha, no rounded corners — Apple applies mask)
- iOS app icon: 180x180 (iPhone), 152x152 (iPad), 120x120, 87x87, 80x80, 76x76, 58x58, 40x40, 29x29
- Android adaptive icon foreground: 432x432 PNG with safe zone of 264x264 in center
- Android Play Store: 512x512 PNG

## Brand colours
- Background gradient: #1a0a2e → #0d0d0d (top-left to bottom-right)
- Hand: #A78BFA → #7C3AED gradient
- Sound waves: #8B5CF6 → #C4B5FD
- Note accent: #8B5CF6

## Generation tool
Use the SVG at assets/icon-source.svg as the source.
Recommended tools:
- Figma (paste SVG, export at each size)
- Sketch
- svgexport CLI: `npx svgexport icon-source.svg icon.png 1024:1024`
- ImageMagick: `convert -size 1024x1024 icon-source.svg icon.png`

## Notes
- No text in the icon (too small to read at small sizes)
- Icon should be recognisable at 29x29 (just the hand shape + purple)
- Rounded corners are applied automatically by iOS — don't pre-round

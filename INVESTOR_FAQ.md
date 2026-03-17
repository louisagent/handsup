# 🙌 Handsup — Investor FAQ

> Sharp answers to the questions every investor asks.
> Version 1.0 | March 2026

---

## The Problem & Market

**Q: What problem are you actually solving?**

At music festivals, people spend half the show staring at a phone screen filming badly. The footage is shaky, unusable, and goes nowhere. Meanwhile, the people nearby are annoyed — and the person filming missed the moment they were trying to capture.

The deeper problem: everyone *wants* the footage after. They just don't want to be the one filming. There's no platform designed to solve this — to take crowd-sourced concert footage and make it actually findable, downloadable, and worth something.

---

**Q: How big is the market?**

Global live music revenue was $26.8B in 2023 and is forecast to exceed $40B by 2030. There are approximately 32 million music festival attendees in the US alone each year, plus comparable numbers across Europe and Australia.

That's the audience. Handsup doesn't need to monetise all of them — it needs to become the default destination for live music video, the way Bandcamp became the default destination for independent music downloads.

---

**Q: Isn't this just TikTok or YouTube for concerts?**

No. TikTok and YouTube are discovery platforms built around algorithms. You find content they decide to show you. Handsup is intent-based: you search for "Tame Impala, Laneway Melbourne, January 2026" and find every clip uploaded from that specific set. No algorithm. No doom-scrolling. Just the footage you're looking for.

It's the difference between Google and Instagram. One is a search tool; the other is a feed.

---

**Q: Why hasn't this been built already?**

The timing wasn't right until recently. Three things have converged:

1. Smartphone video quality is now genuinely watchable — even from a crowd
2. "Phone-free" festival culture is accelerating (Yondr pouches, artist requests, audience frustration) — creating cultural pressure that makes an alternative feel needed
3. Short-form video has trained hundreds of millions of people to share and watch this kind of content

The behaviour exists. The content exists. The infrastructure exists. What's missing is the dedicated home for it.

---

## The Product

**Q: What does Handsup actually do?**

Users browse and download video clips from music festivals and concerts, searchable by artist, event, location, and date. Anyone who attended and filmed can upload their clips. Anyone who wants the footage can download it — free, directly to their camera roll.

The product philosophy: raw and real. No editing, no filters, no social graph. Just the moment, as it happened, from someone who was there.

---

**Q: What's the upload/download experience?**

Upload: tag your clip with the artist, event, date, and stage. Takes 60 seconds. Your clip is now discoverable by everyone who searched for that set.

Download: tap the clip, tap download. It saves to your camera roll. Done.

No account required to browse. Account required to upload (so we can attribute clips and run the creator rewards programme in Phase 2).

---

**Q: How do you handle copyright?**

Users upload crowd-sourced footage they filmed themselves — not official recordings or broadcast content. This sits in the same legal territory as any user-generated social media content.

We'll implement DMCA-compliant takedown processes from day one. Artist teams and festival organisers can request removal of specific clips. Long-term, we want to be the opposite of a piracy problem — a platform festivals *want* to exist because it extends their reach and gives them content analytics.

---

**Q: What's the content moderation strategy?**

Phase 1: lightweight human review for flagged content + automated checks for known copyrighted material via hashing. Phase 2: dedicated trust & safety tooling as the platform scales.

The content type is inherently low-risk. This isn't a general social platform — 99% of uploads are concert footage. The moderation surface area is much narrower than a typical UGC platform.

---

## Business Model

**Q: How do you make money?**

Three revenue streams, activated in phases:

**Phase 1 (current): Free.** Build the library. Build the user base. Zero monetisation.

**Phase 2 (Month 9–18): Festival Partnerships.** Festivals pay $2,000–$10,000 per event for:
- Branded event pages with their logo and editorial
- Analytics dashboard (clip count, downloads, top moments, audience reach)
- Verified uploader badges for their official crew
- Featured placement in the Events tab

**Phase 3 (Month 18+): Platform Revenue.** Premium downloads ($2.99/month for HD quality + early access), ticketing integrations (affiliate commission), and a creator rewards programme funded by festival partners.

---

**Q: What's the path to $1M ARR?**

100 festival partnerships at $10,000/event = $1M. Australia alone has 200+ festivals annually. The UK and US markets are 10x larger.

The more conservative path: 50 partnerships averaging $5,000 + $500K in premium subscriptions from a 50,000-user base with 2% conversion. Both are achievable within 36 months of launch with proper festival partnership traction.

---

**Q: Why would festivals pay for this?**

Because right now they get nothing from crowd footage. Their attendees are filming, uploading to TikTok and Instagram, and the festival has no visibility, no analytics, and no control.

Handsup gives them:
- A dedicated home for their event's footage with their branding
- Aggregate analytics: which artists generated the most clips, which moments went viral, how far the content reached
- A post-event engagement channel — attendees come back to Handsup for weeks after the festival

For a festival spending $500K–$5M on production, $5,000 for that analytics layer is a rounding error.

---

## Competition & Moat

**Q: What if TikTok or YouTube builds this feature?**

They won't. Their entire product is built around algorithmic content distribution. Adding event-native search and a download-first mechanic contradicts their core business model (maximise time on platform, serve ads, own the content). Handsup's model is built on the opposite principle: get you the content quickly and get out of your way.

Niche, intent-based platforms consistently beat general platforms for specific use cases. Discogs beat Amazon for vinyl collectors. Bandcamp beat iTunes for independent music. Handsup can own live music video.

---

**Q: What's the moat?**

Content network effects. Every clip uploaded makes Handsup more valuable for the next searcher. Every festival partnership seeds thousands of clips overnight. Once a festival community adopts Handsup as the place to go for their event footage, competitors face a cold-start problem that's extremely hard to overcome.

Secondary moat: festival partnerships. A festival that's built their branded event page and analytics dashboard on Handsup has a switching cost. If we execute the partnership model well, these become multi-year relationships.

---

**Q: Who are your competitors?**

**Direct:** Nobody. There is no platform specifically for searchable, downloadable crowd-sourced concert footage.

**Indirect:**
- YouTube/TikTok (content exists there but isn't searchable by event or downloadable)
- Setlist.fm (does event data well; no video)
- Bandsintown/Songkick (ticketing/event discovery; no UGC content)

The absence of a direct competitor is the opportunity and the risk — we're creating a new category, not competing for share in an existing one.

---

## Team & Traction

**Q: What stage are you at?**

App built and functional (React Native, Expo, Supabase backend). Brand, product, and go-to-market strategy complete. Actively seeking first festival partnership for pilot season.

---

**Q: Why are you the right person to build this?**

*(Personalise this answer — insert your background, relevant experience, and connection to live music culture.)*

---

**Q: What are the key risks?**

**Content supply:** If not enough people upload, the search experience is empty. Mitigation: seed content aggressively for launch events via designated filmers and direct outreach to existing YouTube/TikTok uploaders.

**Festival partnership timing:** Revenue depends on festival buy-in. Mitigation: phase the business model — don't need revenue until Month 9; use Phase 1 to prove the concept.

**Copyright risk:** Large-scale DMCA claims could threaten the platform. Mitigation: DMCA compliance from day one, proactive artist/label outreach to get ahead of takedowns, and a clear policy that positions Handsup as a partner, not a piracy vehicle.

**Platform risk:** App Store policy changes could affect distribution. Mitigation: invest in web (PWA) as an equal distribution channel from early on.

---

## The Ask

**Q: What are you raising and what's it for?**

*(Placeholder — fill in your raise amount, valuation, and use of funds when ready.)*

Rough use of funds framework:
- **50%** — Engineering: backend infrastructure for scale, CDN for video delivery, web app development
- **25%** — Festival partnerships: sales, travel, events, relationship building
- **15%** — Marketing: content creation, launch campaigns, press
- **10%** — Operations: legal, compliance, tooling

---

**Q: What does success look like in 18 months?**

- 3 confirmed festival partnerships (1 anchor + 2 supporting)
- 25,000 registered users
- 10,000 clips in the catalogue
- First revenue: $50K ARR from partnerships
- Series A pitch: a proven content flywheel with clear unit economics and a replicable partnership model ready to scale internationally

---

*Questions not covered here? Reach out: hello@handsup.app*

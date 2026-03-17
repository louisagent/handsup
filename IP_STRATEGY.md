# Handsup — IP & Copyright Strategy
> Version 1.0 | March 2026
> This document is for internal strategic use. Get formal legal advice before launch.

---

## The Core Problem

Concert footage involves multiple stacked copyrights:
1. **The musical composition** — owned by the songwriter / publisher
2. **The sound recording** — owned by the record label
3. **The live performance** — performers have independent rights
4. **Stage visuals, lighting design, choreography** — potentially additional rights

A fan recording a set from the crowd captures all of these at once. Uploading it to a platform exposes both the uploader *and* the platform to infringement claims.

---

## The Australian Context (differs significantly from the US)

### No "fair use" in Australia
Australia uses **fair dealing**, which is narrower and exhaustive. The permitted purposes are:
- Research or study
- Criticism or review
- Parody or satire
- Reporting the news
- Judicial proceedings

**"I filmed it because I was there" does not qualify.** Personal enjoyment is not a protected purpose under Australian law. This is stricter than the US fair use doctrine.

### Safe harbour is more limited in Australia
The DMCA safe harbour (which protects YouTube, TikTok, Instagram) is a **US law**. Australia's equivalent under the Copyright Act 1968 (Part V, Division 2AA) was originally designed for ISPs only — not content hosting platforms. Extension to broader platforms has been proposed but not fully enacted.

**This means Handsup cannot simply rely on "we remove content when notified" to avoid liability.** Australian courts have found platforms liable as publishers of infringing content even without DMCA-equivalent protection.

### What this means practically
- Handsup is operating in a higher-risk legal environment than a US-based platform
- Rights holders can pursue the platform directly, not just uploaders
- A proactive rights management strategy is not optional — it's essential

---

## What the Proposed Limits Actually Achieve

### 1-Minute Video Cap

**What it helps:**
- Reduces the "amount taken" factor in copyright analysis — one of the four fair dealing considerations
- A 60-second clip of a 3-minute song = 33% of the work. Still significant, but courts weigh this alongside other factors
- Makes the platform less attractive as a destination for full bootleg recordings
- Signals to rights holders that Handsup is not trying to substitute for official recordings

**What it doesn't fix:**
- A 60-second clip of a chorus or a famous drop is the "heart" of the work — courts have found even short clips infringing when they capture the most valuable portion
- It doesn't remove the underlying copyright infringement; it reduces the severity
- Rights holders can still request removal of any clip, regardless of length

**Verdict:** A 1-minute cap is a sensible platform policy. It reduces exposure and signals good faith, but it is **not a legal shield on its own.**

### 10 Uploads Per User Per Event

**What it helps:**
- Limits total infringing content volume from any single actor
- Reduces potential for bad-faith mass uploading to game the system
- Keeps content quality signal higher (10 curated clips vs. 200 bulk uploads)
- Reduces storage costs

**What it doesn't fix:**
- Doesn't address whether any individual clip infringes
- Doesn't prevent 1,000 users each uploading 10 clips from the same event

**Verdict:** Good platform hygiene and reduces abuse surface. Not primarily an IP solution, but it helps.

---

## Recommended Full IP Strategy (Beyond the Limits)

### Tier 1 — Do These Before Launch (Non-Negotiable)

**1. Engage an IP lawyer (Australia-based)**
Get a legal opinion on:
- Platform liability under the Copyright Act 1968
- Whether an explicit content licence from uploaders provides any protection
- DMCA-style takedown process design under Australian law
- Terms of Service language

Estimated cost: $2,000–$5,000 AUD for a startup-focused IP firm. Worth every cent.

**2. Build a robust DMCA-style takedown system**
Even without safe harbour protection, demonstrating a good-faith takedown process is critical for:
- Reducing court exposure
- Building trust with rights holders
- App Store compliance (Apple and Google both require this)

System should include:
- A dedicated email: `dmca@handsup.app`
- A web form at `handsup.app/dmca`
- 48-hour response commitment
- Clear process for counter-notices

**3. Write airtight uploader Terms of Service**
Uploaders must:
- Confirm they personally filmed the content
- Confirm they are not uploading official recordings, bootlegs from mixing boards, or third-party content
- Grant Handsup a licence to host and display the clip
- Accept liability for any infringement they cause

**4. Implement audio fingerprinting**
Tools like ACRCloud or AudD can scan uploaded audio and flag known copyrighted music. This is how YouTube's ContentID works. Implementing this:
- Demonstrates active compliance effort
- Enables automatic flagging/muting before content goes live
- Makes the proactive rights management story credible to festival partners

Cost: ACRCloud API has a free tier; paid plans from ~$100 USD/month.

---

### Tier 2 — Do Within 90 Days of Launch

**5. Proactively approach major Australian music industry bodies**
Contact:
- **APRA AMCOS** (Australian Performing Rights Association) — licensing body for musical works
- **ARIA** (Australian Recording Industry Association) — represents record labels
- **Sounds Australia** — government body, can facilitate introductions

Frame it as: *"We want to build something that works with the industry, not against it. Here's our model. Here's how we protect rights. Here's what we want."*

Getting ahead of enforcement is far cheaper than defending against it.

**6. Explore a blanket licence with APRA AMCOS**
APRA AMCOS licences music for digital services. A blanket licence would allow clips containing licensed music to be hosted legally. Cost is based on revenue and usage. In Phase 1 (no revenue), this may be low or negotiable. This is how radio stations, gyms, and streaming services operate legally.

This would be a genuine competitive moat — no competitor has done this for UGC concert footage.

**7. Partner language with festival deals**
When signing festival partners, include:
- Festival confirms attendees are permitted to film at their event
- Festival indemnifies Handsup for content uploaded from their event (within reason)
- Festival agrees to promote Handsup only for content they have rights to encourage

This shifts some liability to the festival and aligns incentives.

---

### Tier 3 — Medium Term

**8. Artist opt-in/opt-out system**
Build a database of artists who have explicitly:
- ✅ Permitted fan filming and upload
- ❌ Requested no filming (e.g. phone-free artists)

This lets Handsup flag or block uploads from restricted artists proactively, and demonstrate a permission-based approach to rights holders.

**9. Revenue sharing with rights holders (long-term)**
If Handsup reaches scale, explore a model where a percentage of premium download revenue flows to APRA AMCOS for distribution to rights holders. This is how Spotify operates and turns a liability into a partnership.

---

## The Short Answer on the 1-Minute + 10 Upload Limits

**Both are good policies. Neither is sufficient on their own.**

They reduce exposure, signal good faith, and improve platform quality — but they don't make Handsup legally bulletproof. The real protection comes from:
1. IP legal advice before launch
2. A DMCA-style takedown system
3. Audio fingerprinting
4. Proactive APRA AMCOS engagement
5. Tight uploader Terms of Service

The Mentor was right: **draw the line before someone draws it for you.** The 1-minute cap and upload limit are a good start. Build the rest of the stack around them.

---

## Immediate Action Items

| Priority | Action | Owner | Timeline |
|---|---|---|---|
| 🔴 Critical | Engage IP lawyer for legal opinion | Zach | Pre-launch |
| 🔴 Critical | Build DMCA takedown form + process | Dev | Pre-launch |
| 🔴 Critical | Write uploader ToS with liability clauses | Lawyer | Pre-launch |
| 🟡 High | Implement audio fingerprinting (ACRCloud) | Dev | Within 60 days |
| 🟡 High | Enforce 1-min video cap + 10 uploads/event in app | Dev | This sprint |
| 🟡 High | Contact APRA AMCOS for introductory meeting | Zach | Within 30 days |
| 🟢 Medium | Festival partner indemnity clauses | Lawyer | With first deal |
| 🟢 Medium | Artist opt-in/opt-out database | Dev | Month 3 |

---

*Not legal advice. Get a lawyer.*

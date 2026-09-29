# Redesign phase 1: building blocks + homepage

> **For Claude:** executed in-session (Chris pre-approved, away). Design: `2026-09-29-site-redesign-design.md`.

**Goal:** Rebuild the homepage on the Looplair glass system with cover-lit colour, plus the
shared pieces every later page uses. Local only, branch `redesign`.

**Architecture:** New presentational components live in `src/components/ssc/`. Cover colours
are extracted server-side with `sharp` and cached with `unstable_cache`, then passed to
components as a CSS variable (`--glow`). Existing data logic (packs, user state, checkout via
`SubscribeCTA`, `hidePaths`, JSON-LD) is kept; only presentation changes.

**Tech:** Next.js 14 App Router, Tailwind, next/font (Unbounded, Archivo expanded, Inter), sharp.

There is no test runner in this repo; each task is verified with `npx tsc --noEmit`, the
local dev server on :3457, and screenshots at 1440px and 390px.

### Task 1: Foundation
- `npm i sharp`
- `src/lib/fonts.ts`: `display` (Unbounded 700/800), `displayWide` (Archivo, wdth 125, 800/900),
  exported with CSS variables `--font-display`, `--font-display-alt`.
- `src/app/globals.css`: `.ssc-glass` (edge, radius, tint, blur, 3 shadows using `--glow`),
  `.ssc-pill`, `.ssc-label`, display/body helpers, `prefers-reduced-motion` guard.

### Task 2: Cover colour
- `src/lib/cover-color.ts`: `getCoverColor(url)` downsizes the cover to 24x24, picks the most
  saturated bright-enough average, returns `r,g,b`; cached per URL for 30 days;
  falls back to a neutral warm grey. `withCoverColors(packs)` maps a list.

### Task 3: Building blocks (`src/components/ssc/`)
GlassBox, Pill, SectionHead, PackCard (cover-lit), Rail (client: named tabs, arrows,
snap-scroll, synced), FaqList (client: one open, first open, grid-rows expand),
OfferCards (monthly + yearly via SubscribeCTA), CtaBlock, SiteFooter.

### Task 4: Navbar
Floating glass bar, same props and behaviour (auth menu, notifications, mobile nav),
"New release" chip with this week's cover.

### Task 5: Homepage sections
Hero (fanned covers + highlight reel), This week's pack, Releases rail (tabs: New,
Returning, top genres), Why SSC (4 boxes), Proof (artists + quotes), App & plugin,
Pricing, FAQ, closing CTA, footer. Remove the fake MembershipCounter from the homepage.

### Task 6: Verify and report
tsc clean; screenshots desktop + phone for both display faces; commit on `redesign`.

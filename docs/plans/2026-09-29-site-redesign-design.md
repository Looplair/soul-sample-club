# Soul Sample Club site redesign: design

Date: 2026-09-29. Branch: `redesign` (local only until approved; revert by deleting the branch).

## Goal

Make soulsampleclub.com feel current and premium, built on the Looplair page design
system (glass boxes, pill eyebrows, three type roles, horizontal rails), while reading
clearly as its own brand.

## Brand split from Looplair

- **Cover-lit.** Chrome is black and white only. Each pack's glass box glows in a colour
  taken from its own cover, so the catalog is coloured by the artwork. Looplair uses one
  fixed copper accent; SSC has none. Buttons are white.
- Display face: compare Unbounded (Looplair's) with a wide heavy face closer to the SSC
  wordmark in the first homepage build, then pick one.
- Glow is kept to the glass box treatment (soft cover-coloured bleed). No flat gradient
  backgrounds, no fades, no grain or vignettes.

## System (from the Looplair doc)

- Pure black background; contrast floor: headings #FFF, body 75% white, meta 55% white,
  nothing lower.
- Glass box: 1px 8% white edge, 18 to 28px radius, faint top-down white tint, backdrop
  blur, float shadow + cover-colour glow bleed + inset top light edge. One idea per box.
- Every section opens with pill label, headline, body.
- Three type roles: Display (heavy uppercase, tight tracking), Body (light 300),
  Label (semibold small uppercase, wide tracking). Sizes via clamp().
- Horizontal rails with named tabs and arrows for sets of equivalents; vertical for story.
- One shared audio player. Reveal-on-scroll from a visible resting state. Respect
  prefers-reduced-motion. Works down to 400px wide.

## Shared building blocks

GlassBox, Pill, SectionHeader, PackCard (cover-lit), Rail (tabs, arrows, swipe),
SampleRow (app-style: play, name, pack, waveform, BPM, key, download), PlayerBar
(glass, pinned), OfferCard, FaqList, CtaBlock, floating glass Navbar, Footer.
Cover colours are extracted per pack and stored so pages don't compute them at runtime.

## Pages

**Homepage** (cold visitors): floating glass menu; hero with headline, three latest
covers fanned and floating, highlight-reel play; this week's pack box with tracklist;
releases rail with named tabs (New, Returning, genres); Why SSC as four separate boxes
with small visuals (pre-cleared, stems, weekly drops, real musicians); proof (artists,
member quotes); app and plugin; pricing offer cards; FAQ; closing CTA; footer.

**Catalog (/feed)**: Packs / Samples tabs sharing one glass filter bar (search, key, BPM,
genre, sort). Packs tab = cover-lit rails. Samples tab = desktop-app list. Glass player
bar pinned at the bottom.

**Pack page**: large cover with its colour behind it, display-face name, chips
(compositions, stems, BPM range, keys, style), download and status (new / expires / vote
to bring back), app-style sample list in a glass box, "More like this" rail.

**Second pass**: subscribe, /free and /free/offer, guides, genre pages, Drum Vault, app,
account, library, login/signup, legal.

## Copy rules

No em dashes, no rhetorical triplets, no "dusty", "compositions" not "records", avoid
"loops" in visible copy, no competitor names, never feature bonus packs, don't claim
specific instruments. Genre pages stay low-key publicly.

## Guardrails

Data passed to client components still goes through `hidePaths`. Existing behaviour
(auth, downloads, free funnel, tracking, SEO metadata) is unchanged; this is a visual
rebuild. Nothing is pushed to main without Chris's approval.

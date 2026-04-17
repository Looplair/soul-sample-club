# Drum Vault — Design Specification
**Date:** 2026-03-11
**Status:** Approved for implementation
**Mockup:** `.superpowers/brainstorm/32190-1773223088/vault-final.html`

---

## Overview

The Drum Vault is a gamified, members-only collection feature for Soul Sample Club. Members browse a curated library of original drum breaks, preview them freely, and "collect" them — permanently owning the download as long as they collected while subscribed. New breaks are added to the vault on a rolling basis, creating a recurring incentive to stay subscribed and return to the vault.

---

## Core Concept

> **"Collect before it's gone."**
> Active members can collect any break in the vault. Once collected, the break is theirs forever — even if they later cancel. The vault grows over time, always giving members something new to hunt.

---

## Access & Expiry Logic

| Scenario | Can preview | Can collect | Keeps collected breaks |
|---|---|---|---|
| Active subscriber | ✅ | ✅ | ✅ |
| Cancelled subscriber | ✅ | ❌ | ✅ (already collected) |
| Non-member / logged out | ❌ (locked) | ❌ | — |

- **Preview**: Streaming audio preview, available to all active subscribers (no collect required)
- **Collect**: Triggers permanent download entitlement; requires `has_active_subscription()` = true
- **Download**: Available forever for collected breaks, regardless of future subscription status
- **No time-based expiry**: Breaks stay in the vault indefinitely. The lock is subscription status, not a countdown.

---

## UI Design

### Layout
Full-viewport, no page scroll. Body is a flex column:
1. **Hero** — Apple-style large heading, stats block, progress bar + milestones
2. **Picker bar** — Section label ("All Breaks — N total"), new-since-last-visit count
3. **Vault picker** — Scroll-snap slot machine. Rows snap to vertical center as you scroll. Top/bottom fades. Center selection band (iOS picker style).
4. **Footer** — "Members-only drum breaks — sourced, cleaned and added to the vault on a rolling basis. Every break is yours to keep forever once collected." + "Updated regularly" tag.

### Hero
- **Heading**: "Drum / Vault." — large (clamp 48px–80px), shimmer animation, font-weight 800
- **Sub**: "Members-only drum breaks, hand-picked and added to the vault regularly."
- **Stats block**: Collected · Total · % Complete
- **Progress bar**: White fill, glowing dot at head
- **Milestones**: ★ 10 breaks unlocked · ★ 25 breaks · ★ Complete the vault (turn green `#22C55E` when reached)

### Vault Picker (Slot Machine)
- `scroll-snap-type: y mandatory` on scroll container
- `scroll-snap-align: center` on each row
- JS focal effect: rows away from center scale down (`scale(0.90)`) and fade (`opacity 0.50`). Center row is full size and opacity.
- Top 28% and bottom 28% of picker faded to `#0C0C0C` using `::before`/`::after` gradients
- Center selection band: two `rgba(255,255,255,0.055)` hairlines ~68px apart (iOS picker indicator)

### Each Row
```
[row-num]  [name + BPM + badge]  [▶ play]  [████ waveform ████]  [Collect]
```
- **Row num**: Dark grey `#1C1C1C`, 18px bold
- **Name**: `#888`, 13px semi-bold; BPM: `#252525`, 11px
- **Badge**: "New" (green) or "Exclusive" (gold) — small uppercase pill
- **Play button**: 32px circle, works on ANY break (no collect required to preview)
- **Waveform**: Full-width, chunky solid bars (3px wide, no gaps), dark uncollected `#111`, bright played `#C0C0C0 → #fff`. Waveform is also clickable to play/pause.
- **Collect button**: Dark ghost button → on hover goes white/black → on collect: light sweep animation then turns green "✓ Collected"

### Collect Animation
1. CSS light sweep (`linear-gradient` translateX from -100% to +200%) over 500ms
2. After 260ms: row gains `.collected-row` class
3. Button becomes "✓ Collected" in green `#22C55E`
4. Slide-up toast: "[Break name] collected" + "N of 47 breaks collected"
5. Stats and progress bar update live

### Color Palette (monochrome)
| Token | Hex | Usage |
|---|---|---|
| Body | `#0C0C0C` | Page background |
| Row bg | `#0C0C0C` | Explicit row background |
| Waveform unplayed | `#111` | Bar default |
| Waveform played | `#C0C0C0` | Played bars |
| Waveform head | `#fff` | Playhead bar |
| Borders | `#111`–`#181818` | Dividers |
| Text primary | `#fff` | Headings |
| Text secondary | `#888` | Row names |
| Text muted | `#252525`–`#3A3A3A` | BPM, labels |
| Success | `#22C55E` | Collected, milestones, New badge |
| Gold | `#C0A860` | Exclusive badge |

---

## Navigation & Entry Points

### Navbar (Desktop + Mobile)
- Add a **Vault icon** (trophy or vault SVG) to the top-right of `Navbar.tsx`, before the notification bell
- Icon links to `/vault`
- On mobile, add to `MobileBottomNav.tsx` as a fourth icon between Library and Account

### Catalog Page (`/feed`) Integration
- Add a **Drum Vault teaser banner** on the `/feed` page
- Shows locked/preview state for non-subscribers: "Members-only breaks — subscribe to unlock"
- Shows "X new breaks added" for subscribers with a CTA to open vault

---

## New Database Tables

### `drum_breaks`
```sql
CREATE TABLE drum_breaks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  bpm           INTEGER,
  file_path     TEXT,           -- Supabase Storage path (full download)
  preview_path  TEXT,           -- Supabase Storage path (preview audio)
  waveform_peaks JSONB,         -- array of peak values 0–1
  is_published  BOOLEAN DEFAULT false,
  is_exclusive  BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `break_collections`
```sql
CREATE TABLE break_collections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  break_id     UUID REFERENCES drum_breaks(id) ON DELETE CASCADE,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, break_id)
);
```

### RLS Policies
- `drum_breaks`: SELECT for authenticated users (active subscribers only via function check, or all authenticated for preview metadata); INSERT/UPDATE/DELETE for admins only
- `break_collections`: SELECT/INSERT for authenticated user on their own rows only; no delete (permanent ownership)

---

## New API Routes

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/drum-vault` | List all published breaks + user's collection status | Active subscriber |
| POST | `/api/drum-vault/[id]/collect` | Mark break as collected (creates break_collections row) | Active subscriber |
| GET | `/api/drum-vault/[id]/download` | Return signed URL for full break file | Must own break (break_collections row) |
| GET | `/api/drum-vault/[id]/preview` | Return signed URL for preview audio | Active subscriber |

### Admin API Routes
| Method | Route | Purpose |
|---|---|---|
| GET/POST | `/api/admin/drum-breaks` | List / create breaks |
| GET/PUT/DELETE | `/api/admin/drum-breaks/[id]` | Edit / delete break |
| POST | `/api/admin/drum-breaks/presign` | Get signed upload URL (mirrors existing presign pattern) |
| POST | `/api/admin/drum-breaks/[id]/generate-peaks` | Generate waveform peaks from uploaded audio |

---

## New Pages / Routes

| Route | Type | Description |
|---|---|---|
| `/vault` | Protected (active subscriber) | Full Drum Vault UI — slot machine picker |
| `/admin/drum-vault` | Admin | List all breaks, publish/unpublish, stats |
| `/admin/drum-vault/new` | Admin | Upload new break (name, BPM, file upload, exclusive flag) |
| `/admin/drum-vault/[id]` | Admin | Edit break metadata |

---

## "New Since Last Visit" Logic
- Store `vault_last_visited` timestamp in `profiles` table (new column, nullable)
- On vault page load: compare break `created_at` against `vault_last_visited`
- After render: update `vault_last_visited` to `NOW()` via a server action
- Breaks with `created_at > vault_last_visited` get the "New" badge

---

## Admin Upload Flow
Mirrors existing `stems` presigned URL pattern:
1. Admin fills form: name, BPM, exclusive flag
2. Selects audio file → POST to `/api/admin/drum-breaks/presign` → get signed URL + token
3. Browser uploads directly to Supabase Storage
4. POST to `/api/admin/drum-breaks` with token to finalize (store path in DB)
5. Trigger peak generation: POST to `/api/admin/drum-breaks/[id]/generate-peaks`
6. Admin publishes when ready

---

## Files to Create / Modify

### New Files
```
src/app/vault/page.tsx
src/app/vault/VaultClient.tsx
src/app/(admin)/admin/drum-vault/page.tsx
src/app/(admin)/admin/drum-vault/new/page.tsx
src/app/(admin)/admin/drum-vault/[id]/page.tsx
src/app/api/drum-vault/route.ts
src/app/api/drum-vault/[id]/collect/route.ts
src/app/api/drum-vault/[id]/download/route.ts
src/app/api/drum-vault/[id]/preview/route.ts
src/app/api/admin/drum-breaks/route.ts
src/app/api/admin/drum-breaks/[id]/route.ts
src/app/api/admin/drum-breaks/presign/route.ts
src/app/api/admin/drum-breaks/[id]/generate-peaks/route.ts
src/components/vault/VaultHero.tsx
src/components/vault/VaultPicker.tsx
src/components/vault/BreakRow.tsx
src/components/vault/BreakWaveform.tsx
src/components/vault/VaultFooter.tsx
src/components/admin/DrumBreakForm.tsx
supabase/migrations/007_drum_vault.sql
```

### Modified Files
```
src/types/database.ts              — add DrumBreak, BreakCollection types
src/components/layout/Navbar.tsx   — add vault icon
src/components/layout/MobileBottomNav.tsx  — add vault tab
src/app/feed/page.tsx              — add vault teaser banner
src/middleware.ts                  — ensure /vault is protected
```

---

## Gamification Summary
| Feature | Behaviour |
|---|---|
| Progress bar | Live updates on collect, shows X / Total |
| Milestones | 10 breaks, 25 breaks, complete vault — turn green when hit |
| Toast | Slide-up on every collect; special milestone toast |
| New badge | Green pill on breaks added since last visit |
| Exclusive badge | Gold pill for curator-flagged breaks |
| Slot machine picker | Scroll-snap focal effect — feels like selecting in a game console |
| Collect animation | Light sweep + instant green state change |

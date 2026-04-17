# Drum Vault Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

> ⛔ **DEPLOYMENT HOLD**: Do NOT deploy to production or push to a live environment at any point. All work stays in development (`npm run dev` locally) until the owner has reviewed and approved. Final task in this plan is an explicit sign-off checkpoint.

**Goal:** Build the Drum Vault — a gamified members-only drum break collection feature with a slot-machine scroll UI, subscription-gated collect/download, admin upload flow, and navigation integration.

**Architecture:** Three-layer feature: (1) Supabase DB tables + RLS for data ownership and subscription gating, (2) Next.js API routes mirroring the existing download/preview/presign patterns exactly, (3) Client-side `VaultClient` component implementing the approved slot-machine UI from the mockup at `.superpowers/brainstorm/32190-1773223088/vault-final.html`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + Storage + RLS), Tailwind CSS, Lucide icons, Framer Motion (already installed)

---

## Reference Files (read these before starting)

- `src/app/api/download/[sampleId]/route.ts` — subscription check pattern, signed URL pattern
- `src/app/api/preview/[sampleId]/route.ts` — public URL preview pattern
- `src/app/api/admin/stems/presign/route.ts` — presigned upload URL pattern
- `src/app/api/admin/samples/generate-peaks/route.ts` — peak generation (mirror this exactly)
- `src/app/(dashboard)/library/page.tsx` — dashboard page + data fetch pattern
- `src/components/layout/Navbar.tsx` — navbar structure to modify
- `src/components/layout/MobileBottomNav.tsx` — mobile nav to modify
- `src/types/database.ts` — type format to follow
- `.superpowers/brainstorm/32190-1773223088/vault-final.html` — approved UI mockup

---

## File Map

### New Files

| File | Responsibility |
|---|---|
| `supabase/migrations/007_drum_vault.sql` | Create `drum_breaks`, `break_collections` tables; add `vault_last_visited` to profiles; RLS policies |
| `src/types/database.ts` | Add `DrumBreak`, `BreakCollection` types (modify existing) |
| `src/app/api/drum-vault/route.ts` | GET: list published breaks + per-user collection status |
| `src/app/api/drum-vault/[id]/collect/route.ts` | POST: collect a break (requires active subscription) |
| `src/app/api/drum-vault/[id]/download/route.ts` | GET: signed download URL (requires ownership via break_collections) |
| `src/app/api/drum-vault/[id]/preview/route.ts` | GET: public preview URL (requires active subscription) |
| `src/app/api/admin/drum-breaks/route.ts` | GET: list all breaks (admin); POST: create break record |
| `src/app/api/admin/drum-breaks/[id]/route.ts` | GET/PUT/DELETE: manage a single break (admin only) |
| `src/app/api/admin/drum-breaks/presign/route.ts` | POST: generate signed upload URL for audio file |
| `src/app/api/admin/drum-breaks/[id]/generate-peaks/route.ts` | POST: generate waveform peaks (mirror existing generate-peaks route) |
| `src/app/vault/page.tsx` | Server component: own auth+subscription gate + data fetch + last-visited update (NOT inside dashboard route group — its full-viewport layout is incompatible with the dashboard wrapper) |
| `src/app/vault/VaultClient.tsx` | Client component: full slot-machine vault UI |
| `src/components/vault/VaultHero.tsx` | Hero: title shimmer, stats block, progress bar, milestones |
| `src/components/vault/VaultPicker.tsx` | Scroll-snap picker container + focal JS effect |
| `src/components/vault/BreakRow.tsx` | Single break row: play, waveform, collect, badges |
| `src/components/vault/BreakWaveform.tsx` | Waveform bar renderer from `waveform_peaks` data |
| `src/components/vault/VaultFooter.tsx` | Footer descriptor |
| `src/app/(admin)/admin/drum-vault/page.tsx` | Admin: list all breaks with publish/unpublish |
| `src/app/(admin)/admin/drum-vault/new/page.tsx` | Admin: create new break |
| `src/app/(admin)/admin/drum-vault/[id]/page.tsx` | Admin: edit break |
| `src/components/admin/DrumBreakForm.tsx` | Shared upload form (create + edit) |

### Modified Files

| File | Change |
|---|---|
| `src/types/database.ts` | Append DrumBreak + BreakCollection types |
| `src/components/layout/Navbar.tsx` | Add Vault icon button before NotificationBell in right-side user area |
| `src/components/layout/MobileBottomNav.tsx` | Add Vault tab (4th item) |
| `src/app/feed/page.tsx` | Add VaultTeaser banner component at top of feed |
| `src/middleware.ts` | Ensure `/vault` is in protected routes (redirects to /login if unauthenticated) |

---

## Chunk 1: Database Foundation

### Task 1: Write DB migration

**Files:**
- Create: `supabase/migrations/007_drum_vault.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/007_drum_vault.sql

-- ── drum_breaks ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drum_breaks (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  bpm            INTEGER,
  file_path      TEXT,          -- Supabase Storage path in 'samples' bucket (drum-breaks/...)
  preview_path   TEXT,          -- lower-quality preview path (mp3 preferred)
  waveform_peaks JSONB,         -- array of numbers 0–1, e.g. [0.2, 0.8, 0.5, ...]
  is_published   BOOLEAN NOT NULL DEFAULT false,
  is_exclusive   BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── break_collections ────────────────────────────────────────────────────────
-- Records which users have collected which breaks (permanent, subscription-independent)
CREATE TABLE IF NOT EXISTS break_collections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  break_id     UUID NOT NULL REFERENCES drum_breaks(id) ON DELETE CASCADE,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, break_id)
);

-- ── vault_last_visited on profiles ───────────────────────────────────────────
-- Used to determine "New since your last visit" badge
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vault_last_visited TIMESTAMPTZ;

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_drum_breaks_published ON drum_breaks(is_published);
CREATE INDEX IF NOT EXISTS idx_break_collections_user ON break_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_break_collections_break ON break_collections(break_id);

-- ── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE drum_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_collections ENABLE ROW LEVEL SECURITY;

-- drum_breaks: any authenticated user can read published breaks
-- (API layer enforces subscription check before returning file URLs)
CREATE POLICY "Published drum breaks are viewable by authenticated users"
  ON drum_breaks FOR SELECT
  TO authenticated
  USING (is_published = true);

-- drum_breaks: admins can do everything
CREATE POLICY "Admins can manage drum_breaks"
  ON drum_breaks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- break_collections: users can only read their own collections
CREATE POLICY "Users can view own collections"
  ON break_collections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- break_collections: users can insert their own collections (API enforces subscription check)
CREATE POLICY "Users can insert own collections"
  ON break_collections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- No UPDATE or DELETE on break_collections (ownership is permanent)
```

- [ ] **Step 2: Run the migration**

```bash
cd /Users/looplair/Documents/soul-sample-club
npx supabase db push
# OR if using local Supabase:
npx supabase migration up
```

Expected: migration applies cleanly with no errors.

- [ ] **Step 3: Verify tables exist in Supabase dashboard**

Check https://supabase.com/dashboard → your project → Table Editor. Confirm:
- `drum_breaks` table has all columns
- `break_collections` table has all columns
- `profiles` has `vault_last_visited` column

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/007_drum_vault.sql
git commit -m "feat(vault): add drum_breaks and break_collections tables with RLS"
```

---

### Task 2: Add TypeScript types

**Files:**
- Modify: `src/types/database.ts` (append at end, after existing types)

- [ ] **Step 1: Read current end of database.ts to find where to append**

Look at the bottom of the file — find the last exported type (likely `type Announcement = ...` or similar).

- [ ] **Step 2: Append new types**

Add at the end of `src/types/database.ts`:

```typescript
// ── Drum Vault ───────────────────────────────────────────────────────────────

export type DrumBreak = {
  id: string;
  name: string;
  bpm: number | null;
  file_path: string | null;
  preview_path: string | null;
  waveform_peaks: number[] | null;
  is_published: boolean;
  is_exclusive: boolean;
  created_at: string;
  updated_at: string;
};

export type BreakCollection = {
  id: string;
  user_id: string;
  break_id: string;
  collected_at: string;
};

// DrumBreak with is_collected flag — returned by GET /api/drum-vault
export type DrumBreakWithStatus = DrumBreak & {
  is_collected: boolean;
  is_new: boolean; // true if created_at > user's vault_last_visited
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/looplair/Documents/soul-sample-club
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "feat(vault): add DrumBreak, BreakCollection, DrumBreakWithStatus types"
```

---

## Chunk 2: Core API Routes

### Task 3: GET /api/drum-vault — list breaks

**Files:**
- Create: `src/app/api/drum-vault/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/drum-vault/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DrumBreak, DrumBreakWithStatus } from "@/types/database";

export async function GET() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Subscription check (Stripe OR Patreon)
    const now = new Date().toISOString();
    const [stripeResult, patreonResult] = await Promise.all([
      adminSupabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"])
        // NOTE: do NOT add .gte("current_period_end", now) — matches canonical download route
        // which avoids race conditions with Stripe renewal webhooks
        .limit(1),
      adminSupabase
        .from("patreon_links")
        .select("is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single(),
    ]);

    const hasAccess =
      (stripeResult.data?.length ?? 0) > 0 || !!patreonResult.data;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Active subscription required" },
        { status: 403 }
      );
    }

    // Fetch user's last vault visit (for "New" badge)
    const profileResult = await adminSupabase
      .from("profiles")
      .select("vault_last_visited")
      .eq("id", user.id)
      .single();
    const lastVisited = (profileResult.data as { vault_last_visited: string | null } | null)
      ?.vault_last_visited ?? null;

    // Fetch all published breaks
    const breaksResult = await adminSupabase
      .from("drum_breaks")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (breaksResult.error) {
      console.error("Error fetching drum breaks:", breaksResult.error);
      return NextResponse.json({ error: "Failed to fetch breaks" }, { status: 500 });
    }

    // Fetch user's collections
    const collectionsResult = await adminSupabase
      .from("break_collections")
      .select("break_id")
      .eq("user_id", user.id);

    const collectedIds = new Set(
      (collectionsResult.data ?? []).map((c: { break_id: string }) => c.break_id)
    );

    // Merge is_collected + is_new flag
    const breaks: DrumBreakWithStatus[] = (breaksResult.data as DrumBreak[]).map((b) => ({
      ...b,
      waveform_peaks: b.waveform_peaks as number[] | null,
      is_collected: collectedIds.has(b.id),
      is_new: lastVisited ? new Date(b.created_at) > new Date(lastVisited) : false,
    }));

    // Stats
    const total = breaks.length;
    const collected = breaks.filter((b) => b.is_collected).length;

    return NextResponse.json({ breaks, stats: { collected, total } });
  } catch (error) {
    console.error("Vault list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Manual test**

Start dev server (`npm run dev`), then:
```bash
# While logged in as a subscriber, open browser devtools and run:
fetch('/api/drum-vault').then(r => r.json()).then(console.log)
# Expected: { breaks: [], stats: { collected: 0, total: 0 } }
# (empty because no breaks exist yet — will be populated by admin UI)
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/drum-vault/route.ts
git commit -m "feat(vault): add GET /api/drum-vault list endpoint"
```

---

### Task 4: POST /api/drum-vault/[id]/collect

**Files:**
- Create: `src/app/api/drum-vault/[id]/collect/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/drum-vault/[id]/collect/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid break ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Subscription check — MUST be active to collect
    const now = new Date().toISOString();
    const [stripeResult, patreonResult] = await Promise.all([
      adminSupabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"])
        // NOTE: do NOT add .gte("current_period_end", now) — matches canonical download route
        // which avoids race conditions with Stripe renewal webhooks
        .limit(1),
      adminSupabase
        .from("patreon_links")
        .select("is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single(),
    ]);

    const hasAccess =
      (stripeResult.data?.length ?? 0) > 0 || !!patreonResult.data;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Active subscription required to collect breaks" },
        { status: 403 }
      );
    }

    // Verify the break exists and is published
    const breakResult = await adminSupabase
      .from("drum_breaks")
      .select("id, name")
      .eq("id", id)
      .eq("is_published", true)
      .single();

    if (breakResult.error || !breakResult.data) {
      return NextResponse.json({ error: "Break not found" }, { status: 404 });
    }

    // Insert collection (UNIQUE constraint handles duplicates gracefully)
    const { error: insertError } = await adminSupabase
      .from("break_collections")
      .insert({ user_id: user.id, break_id: id });

    if (insertError) {
      // 23505 = unique_violation — already collected, that's fine
      if (insertError.code === "23505") {
        return NextResponse.json({ success: true, already_collected: true });
      }
      console.error("Error inserting collection:", insertError);
      return NextResponse.json({ error: "Failed to collect break" }, { status: 500 });
    }

    return NextResponse.json({ success: true, already_collected: false });
  } catch (error) {
    console.error("Collect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/drum-vault/[id]/collect/route.ts
git commit -m "feat(vault): add POST /api/drum-vault/[id]/collect endpoint"
```

---

### Task 5: GET /api/drum-vault/[id]/download

**Files:**
- Create: `src/app/api/drum-vault/[id]/download/route.ts`

- [ ] **Step 1: Create the route** (mirrors existing download route pattern)

```typescript
// src/app/api/drum-vault/[id]/download/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid break ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ownership check — must have collected this break
    const collectionResult = await adminSupabase
      .from("break_collections")
      .select("id")
      .eq("user_id", user.id)
      .eq("break_id", id)
      .single();

    if (collectionResult.error || !collectionResult.data) {
      return NextResponse.json(
        { error: "You have not collected this break" },
        { status: 403 }
      );
    }

    // Get break file path
    const breakResult = await adminSupabase
      .from("drum_breaks")
      .select("name, file_path")
      .eq("id", id)
      .single();

    if (breakResult.error || !breakResult.data) {
      return NextResponse.json({ error: "Break not found" }, { status: 404 });
    }

    const drumBreak = breakResult.data as { name: string; file_path: string | null };

    if (!drumBreak.file_path) {
      return NextResponse.json({ error: "File not available" }, { status: 404 });
    }

    // Generate signed download URL (valid 60 seconds)
    const { data: signedUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUrl(drumBreak.file_path, 60, {
        download: `${drumBreak.name}.wav`,
      });

    if (urlError || !signedUrl) {
      console.error("Error generating signed URL:", urlError);
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (error) {
    console.error("Vault download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/drum-vault/[id]/download/route.ts
git commit -m "feat(vault): add GET /api/drum-vault/[id]/download endpoint"
```

---

### Task 6: GET /api/drum-vault/[id]/preview

**Files:**
- Create: `src/app/api/drum-vault/[id]/preview/route.ts`

- [ ] **Step 1: Create the route** (mirrors existing preview route — uses public URL for streaming)

```typescript
// src/app/api/drum-vault/[id]/preview/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid break ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Auth + subscription check (subscribers can preview any break)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date().toISOString();
    const [stripeResult, patreonResult] = await Promise.all([
      adminSupabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"])
        // NOTE: do NOT add .gte("current_period_end", now) — matches canonical download route
        // which avoids race conditions with Stripe renewal webhooks
        .limit(1),
      adminSupabase
        .from("patreon_links")
        .select("is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single(),
    ]);

    const hasAccess =
      (stripeResult.data?.length ?? 0) > 0 || !!patreonResult.data;
    if (!hasAccess) {
      return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
    }

    // Get break audio path (prefer preview_path for smaller file)
    const breakResult = await adminSupabase
      .from("drum_breaks")
      .select("preview_path, file_path")
      .eq("id", id)
      .eq("is_published", true)
      .single();

    if (breakResult.error || !breakResult.data) {
      return NextResponse.json({ error: "Break not found" }, { status: 404 });
    }

    const br = breakResult.data as { preview_path: string | null; file_path: string | null };
    let audioPath = br.preview_path || br.file_path;

    if (!audioPath) {
      return NextResponse.json({ error: "Audio not available" }, { status: 404 });
    }

    audioPath = audioPath.replace(/^\/+/, "");

    // Use public URL for streaming (same reason as existing preview route)
    const { data: publicUrlData } = adminSupabase.storage
      .from("samples")
      .getPublicUrl(audioPath);

    if (!publicUrlData?.publicUrl) {
      return NextResponse.json({ error: "Failed to generate audio URL" }, { status: 500 });
    }

    const isMP3 = audioPath.toLowerCase().endsWith(".mp3");
    return NextResponse.json({ url: publicUrlData.publicUrl, format: isMP3 ? "mp3" : "wav" });
  } catch (error) {
    console.error("Vault preview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/drum-vault/[id]/preview/route.ts
git commit -m "feat(vault): add GET /api/drum-vault/[id]/preview endpoint"
```

---

## Chunk 3: Admin API Routes

### Task 7: Admin drum-breaks CRUD + presign

**Files:**
- Create: `src/app/api/admin/drum-breaks/route.ts`
- Create: `src/app/api/admin/drum-breaks/[id]/route.ts`
- Create: `src/app/api/admin/drum-breaks/presign/route.ts`
- Create: `src/app/api/admin/drum-breaks/[id]/generate-peaks/route.ts`

**Admin auth helper** — all four routes use this exact pattern (copy from presign route):
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { data: profile } = await adminSupabase
  .from("profiles").select("is_admin").eq("id", user.id).single();
if (!(profile as { is_admin: boolean } | null)?.is_admin) {
  return NextResponse.json({ error: "Admin access required" }, { status: 403 });
}
```

- [ ] **Step 1: Create admin/drum-breaks/route.ts (GET list + POST create)**

```typescript
// src/app/api/admin/drum-breaks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await adminSupabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!(profile as { is_admin: boolean } | null)?.is_admin) return null;
  return user;
}

export async function GET() {
  try {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("drum_breaks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Count collections per break
    const breakIds = (data ?? []).map((b: { id: string }) => b.id);
    const { data: collectionCounts } = await adminSupabase
      .from("break_collections")
      .select("break_id")
      .in("break_id", breakIds);

    const countMap: Record<string, number> = {};
    (collectionCounts ?? []).forEach((c: { break_id: string }) => {
      countMap[c.break_id] = (countMap[c.break_id] ?? 0) + 1;
    });

    const breaksWithCounts = (data ?? []).map((b: { id: string }) => ({
      ...b,
      collection_count: countMap[b.id] ?? 0,
    }));

    return NextResponse.json({ breaks: breaksWithCounts });
  } catch (error) {
    console.error("Admin drum-breaks GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await request.json();
    const { name, bpm, file_path, preview_path, is_exclusive } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("drum_breaks")
      .insert({
        name,
        bpm: bpm ?? null,
        file_path: file_path ?? null,
        preview_path: preview_path ?? null,
        is_exclusive: is_exclusive ?? false,
        is_published: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ break: data }, { status: 201 });
  } catch (error) {
    console.error("Admin drum-breaks POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create admin/drum-breaks/[id]/route.ts (GET/PUT/DELETE)**

```typescript
// src/app/api/admin/drum-breaks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await adminSupabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!(profile as { is_admin: boolean } | null)?.is_admin) return null;
  return user;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("drum_breaks").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ break: data });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await request.json();
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("drum_breaks")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ break: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("drum_breaks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create admin/drum-breaks/presign/route.ts** (mirrors stems presign exactly)

```typescript
// src/app/api/admin/drum-breaks/presign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await adminSupabase
      .from("profiles").select("is_admin").eq("id", user.id).single();
    if (!(profile as { is_admin: boolean } | null)?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { fileName, type } = body; // type: 'full' | 'preview'

    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    const prefix = type === "preview" ? "drum-breaks/previews" : "drum-breaks/full";
    const storagePath = `${prefix}/${Date.now()}-${fileName}`;

    const { data: uploadUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUploadUrl(storagePath);

    if (urlError || !uploadUrl) {
      console.error("Error creating signed upload URL:", urlError);
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: uploadUrl.signedUrl,
      token: uploadUrl.token,
      path: storagePath,
    });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create admin/drum-breaks/[id]/generate-peaks/route.ts**

Adapted from the existing `generate-peaks` route — ID comes from URL params, table is `drum_breaks`:

```typescript
// src/app/api/admin/drum-breaks/[id]/generate-peaks/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const breakResult = await adminSupabase
      .from("drum_breaks")
      .select("id, file_path, preview_path")
      .eq("id", id)
      .single();

    const drumBreak = breakResult.data as { id: string; file_path: string | null; preview_path: string | null } | null;
    if (breakResult.error || !drumBreak) {
      return NextResponse.json({ error: "Break not found" }, { status: 404 });
    }

    const filePath = drumBreak.preview_path || drumBreak.file_path;
    if (!filePath) {
      return NextResponse.json({ error: "No audio file uploaded yet" }, { status: 400 });
    }

    const { data: fileData, error: downloadError } = await adminSupabase.storage
      .from("samples").download(filePath);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: "Failed to download audio file" }, { status: 500 });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const peaks = extractPeaksFromWav(arrayBuffer);
    if (!peaks) {
      return NextResponse.json({ error: "Failed to extract peaks (file may not be WAV)" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (adminSupabase as any)
      .from("drum_breaks").update({ waveform_peaks: peaks }).eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to save peaks" }, { status: 500 });
    }

    return NextResponse.json({ success: true, peakCount: peaks.length });
  } catch (error) {
    console.error("Error generating peaks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Identical to /api/admin/samples/generate-peaks/route.ts — copy this function verbatim
function extractPeaksFromWav(arrayBuffer: ArrayBuffer): number[] | null {
  try {
    const view = new DataView(arrayBuffer);
    const riff = String.fromCharCode(view.getUint8(0),view.getUint8(1),view.getUint8(2),view.getUint8(3));
    if (riff !== "RIFF") return null;
    let offset = 12, numChannels = 2, bitsPerSample = 16, dataOffset = 0, dataSize = 0;
    while (offset < arrayBuffer.byteLength - 8) {
      const chunkId = String.fromCharCode(view.getUint8(offset),view.getUint8(offset+1),view.getUint8(offset+2),view.getUint8(offset+3));
      const chunkSize = view.getUint32(offset+4, true);
      if (chunkId === "fmt ") { numChannels = view.getUint16(offset+10,true); bitsPerSample = view.getUint16(offset+22,true); }
      else if (chunkId === "data") { dataOffset = offset+8; dataSize = chunkSize; break; }
      offset += 8 + chunkSize; if (chunkSize % 2 !== 0) offset++;
    }
    if (!dataOffset || !dataSize) return null;
    const bytesPerSample = bitsPerSample / 8;
    const totalSamples = Math.floor(dataSize / (bytesPerSample * numChannels));
    const samplesPerPeak = Math.max(1, Math.floor(totalSamples / 300));
    const peaks: number[] = [];
    const maxVal = Math.pow(2, bitsPerSample - 1);
    for (let i = 0; i < totalSamples; i += samplesPerPeak) {
      let maxPeak = 0;
      for (let j = i; j < Math.min(i + samplesPerPeak, totalSamples); j++) {
        const so = dataOffset + j * bytesPerSample * numChannels;
        let sv = 0;
        if (bitsPerSample === 16) sv = view.getInt16(so, true);
        else if (bitsPerSample === 24) { sv = (view.getInt8(so+2) << 16) | (view.getUint8(so+1) << 8) | view.getUint8(so); }
        else if (bitsPerSample === 32) sv = view.getInt32(so, true);
        const n = Math.abs(sv) / maxVal;
        if (n > maxPeak) maxPeak = n;
      }
      peaks.push(Math.min(1, Math.max(0, maxPeak)));
    }
    return peaks;
  } catch { return null; }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/drum-breaks/
git commit -m "feat(vault): add admin drum-breaks CRUD, presign, and generate-peaks routes"
```

---

## Chunk 4: Vault Page UI

### Task 8: Vault server page + VaultClient scaffold

**Files:**
- Create: `src/app/vault/page.tsx`
- Create: `src/app/vault/VaultClient.tsx`

The design reference is the approved mockup: `.superpowers/brainstorm/32190-1773223088/vault-final.html`.
Translate the HTML/CSS directly to React + Tailwind. The mockup is the source of truth for all visual decisions.

- [ ] **Step 1: Create vault/page.tsx (server component)**

```typescript
// src/app/vault/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VaultClient } from "./VaultClient";
import type { DrumBreakWithStatus } from "@/types/database";

export const metadata = {
  title: "Drum Vault | Soul Sample Club",
  description: "Members-only drum breaks, yours to keep forever.",
};

export default async function VaultPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // Auth gate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Subscription gate
  const now = new Date().toISOString();
  const [stripeResult, patreonResult] = await Promise.all([
    adminSupabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .gte("current_period_end", now)
      .limit(1),
    adminSupabase
      .from("patreon_links")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single(),
  ]);

  const hasAccess =
    (stripeResult.data?.length ?? 0) > 0 || !!patreonResult.data;
  if (!hasAccess) redirect("/subscribe");

  // Fetch breaks + collection status (reuse GET /api/drum-vault logic directly)
  const [breaksResult, collectionsResult, profileResult] = await Promise.all([
    adminSupabase
      .from("drum_breaks")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("break_collections")
      .select("break_id")
      .eq("user_id", user.id),
    adminSupabase
      .from("profiles")
      .select("vault_last_visited")
      .eq("id", user.id)
      .single(),
  ]);

  const lastVisited = (profileResult.data as { vault_last_visited: string | null } | null)
    ?.vault_last_visited ?? null;

  const collectedIds = new Set(
    (collectionsResult.data ?? []).map((c: { break_id: string }) => c.break_id)
  );

  const breaks: DrumBreakWithStatus[] = (breaksResult.data ?? []).map((b: {
    id: string; name: string; bpm: number | null; file_path: string | null;
    preview_path: string | null; waveform_peaks: number[] | null;
    is_published: boolean; is_exclusive: boolean; created_at: string; updated_at: string;
  }) => ({
    ...b,
    is_collected: collectedIds.has(b.id),
    is_new: lastVisited ? new Date(b.created_at) > new Date(lastVisited) : false,
  }));

  // Update vault_last_visited (fire and forget — don't block render)
  adminSupabase
    .from("profiles")
    .update({ vault_last_visited: now })
    .eq("id", user.id)
    .then(() => {})
    .catch((err: Error) => console.warn("vault_last_visited update failed:", err));

  const stats = {
    collected: breaks.filter((b) => b.is_collected).length,
    total: breaks.length,
  };

  return <VaultClient breaks={breaks} stats={stats} />;
}
```

- [ ] **Step 2: Create VaultClient.tsx scaffold**

```typescript
// src/app/vault/VaultClient.tsx
"use client";

import { useState, useCallback } from "react";
import { VaultHero } from "@/components/vault/VaultHero";
import { VaultPicker } from "@/components/vault/VaultPicker";
import { VaultFooter } from "@/components/vault/VaultFooter";
import type { DrumBreakWithStatus } from "@/types/database";

interface VaultClientProps {
  breaks: DrumBreakWithStatus[];
  stats: { collected: number; total: number };
}

export interface Toast {
  message: string;
  sub: string;
  key: number;
}

export function VaultClient({ breaks: initialBreaks, stats: initialStats }: VaultClientProps) {
  const [breaks, setBreaks] = useState<DrumBreakWithStatus[]>(initialBreaks);
  const [stats, setStats] = useState(initialStats);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, sub: string) => {
    setToast({ message, sub, key: Date.now() });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const handleCollect = useCallback(async (breakId: string) => {
    const drumBreak = breaks.find((b) => b.id === breakId);
    if (!drumBreak || drumBreak.is_collected) return;

    // Optimistic update
    setBreaks((prev) =>
      prev.map((b) => (b.id === breakId ? { ...b, is_collected: true } : b))
    );
    const newCount = stats.collected + 1;
    setStats((prev) => ({ ...prev, collected: newCount }));

    try {
      const res = await fetch(`/api/drum-vault/${breakId}/collect`, { method: "POST" });
      if (!res.ok) throw new Error("Collect failed");

      const milestoneMsgs: Record<number, string> = {
        [Math.min(10, stats.total)]: "Milestone — 10 breaks collected",
        25: "Milestone — 25 breaks collected",
        [stats.total]: "Vault complete.",
      };
      const milestoneMsg = milestoneMsgs[newCount];
      showToast(
        milestoneMsg ?? `${drumBreak.name} collected`,
        milestoneMsg ? "★ Milestone unlocked" : `${newCount} of ${stats.total} breaks collected`
      );
    } catch {
      // Revert on failure
      setBreaks((prev) =>
        prev.map((b) => (b.id === breakId ? { ...b, is_collected: false } : b))
      );
      setStats((prev) => ({ ...prev, collected: prev.collected - 1 }));
      showToast("Couldn't collect", "Check your connection and try again");
    }
  }, [breaks, stats, showToast]);

  const handleDownload = useCallback(async (breakId: string) => {
    const res = await fetch(`/api/drum-vault/${breakId}/download`);
    if (!res.ok) return;
    const { url } = await res.json();
    window.location.href = url;
  }, []);

  return (
    <div
      className="flex flex-col bg-[#0C0C0C] text-white"
      style={{ height: "100dvh", overflow: "hidden" }}
    >
      <VaultHero stats={stats} />

      <hr className="border-t border-[#141414] flex-shrink-0" />

      {/* Picker bar */}
      <div className="flex-shrink-0 border-b border-[#141414]">
        <div className="max-w-[860px] mx-auto px-10 py-3 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2E2E2E]">
            All Breaks — {stats.total} total
          </span>
          {breaks.some((b) => b.is_new) && (
            <span className="text-[11px] font-semibold text-[#22C55E] tracking-[0.06em]">
              ↑ {breaks.filter((b) => b.is_new).length} new since your last visit
            </span>
          )}
        </div>
      </div>

      <VaultPicker
        breaks={breaks}
        onCollect={handleCollect}
        onDownload={handleDownload}
      />

      <VaultFooter />

      {/* Toast */}
      {toast && (
        <div
          key={toast.key}
          className="fixed bottom-7 left-1/2 -translate-x-1/2 bg-[#181818] border border-[#2A2A2A] rounded-xl px-5 py-3 z-50 animate-fade-in-up"
          // animate-fade-in-up is defined in tailwind.config.ts — no plugin required
        >
          <div className="text-[13px] font-semibold tracking-tight">{toast.message}</div>
          <div className="text-[11px] text-[#444] mt-0.5">{toast.sub}</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/vault/
git commit -m "feat(vault): add vault page server component and VaultClient scaffold"
```

---

### Task 9: Vault UI components

**Files:**
- Create: `src/components/vault/VaultHero.tsx`
- Create: `src/components/vault/VaultPicker.tsx`
- Create: `src/components/vault/BreakRow.tsx`
- Create: `src/components/vault/BreakWaveform.tsx`
- Create: `src/components/vault/VaultFooter.tsx`

Translate the approved mockup directly. Use inline styles where Tailwind utilities don't precisely match (e.g., exact hex colors `#0C0C0C`, `#1C1C1C`, animations).

- [ ] **Step 1: Create VaultHero.tsx**

```typescript
// src/components/vault/VaultHero.tsx
"use client";

interface VaultHeroProps {
  stats: { collected: number; total: number };
}

export function VaultHero({ stats }: VaultHeroProps) {
  const pct = stats.total > 0 ? Math.round((stats.collected / stats.total) * 100) : 0;

  return (
    <div className="relative overflow-hidden flex-shrink-0" style={{ padding: "44px 40px 32px" }}>
      {/* Ambient top glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 100%)",
        }}
      />
      <div className="relative z-10 max-w-[860px] mx-auto">
        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#3A3A3A] mb-3">
          Soul Sample Club
        </div>
        <h1
          className="font-extrabold leading-none mb-3"
          style={{
            fontSize: "clamp(48px, 8vw, 80px)",
            letterSpacing: "-0.04em",
            background: "linear-gradient(90deg,#fff 0%,#fff 35%,#666 50%,#fff 65%,#fff 100%)",
            backgroundSize: "250% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "shimmer 6s linear infinite",
          }}
        >
          Drum<br /><span className="font-light">Vault.</span>
        </h1>
        <style>{`@keyframes shimmer { from{background-position:100% 0} to{background-position:-100% 0} }`}</style>

        <p className="text-sm text-[#3A3A3A] mb-5 max-w-[420px] leading-relaxed">
          Members-only drum breaks, hand-picked and added to the vault regularly.
        </p>

        {/* Stats */}
        <div
          className="flex items-stretch overflow-hidden w-fit mb-5 rounded-[13px]"
          style={{ gap: "1px", background: "#181818", border: "1px solid #181818" }}
        >
          {[
            { n: stats.collected, unit: "collected", label: "Your haul" },
            { n: stats.total, unit: "total", label: "In the vault" },
            { n: `${pct}`, unit: "%", label: "Complete" },
          ].map((s, i) => (
            <div
              key={i}
              className="flex flex-col gap-0.5"
              style={{ padding: "10px 20px", background: "#111", borderLeft: i > 0 ? "1px solid #181818" : undefined }}
            >
              <div className="text-[18px] font-bold tracking-tight text-white">
                {s.n} <span className="text-[12px] font-normal text-[#333]">{s.unit}</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.1em] text-[#333] font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="flex justify-between mb-1.5 max-w-[480px]">
          <span className="text-[11px] text-[#2E2E2E] font-medium tracking-[0.04em]">Collection progress</span>
          <span className="text-[12px] font-bold text-[#444]">{pct}%</span>
        </div>
        <div className="max-w-[480px] h-[3px] rounded-full relative" style={{ background: "#181818" }}>
          <div
            className="h-full rounded-full relative transition-all duration-700"
            style={{ background: "#fff", width: `${pct}%` }}
          >
            <div
              className="absolute -right-px top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-white"
              style={{ boxShadow: "0 0 10px rgba(255,255,255,.7)" }}
            />
          </div>
        </div>
        <div className="flex gap-5 mt-2">
          {[
            { n: 10, label: "10 breaks" },
            { n: 25, label: "25 breaks" },
            { n: stats.total, label: "Complete the vault" },
          ].map((m) => (
            <div
              key={m.n}
              className="text-[10px] flex items-center gap-1"
              style={{ color: stats.collected >= m.n ? "#22c55e" : "#282828" }}
            >
              ★ {m.label}{stats.collected >= m.n ? " — unlocked" : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create BreakWaveform.tsx**

```typescript
// src/components/vault/BreakWaveform.tsx
"use client";

import { useMemo } from "react";

interface BreakWaveformProps {
  peaks: number[] | null;
  seed: number;           // fallback for random generation if peaks is null
  playedFraction: number; // 0–1, how much is "played"
  isCollected: boolean;
  onClick: () => void;
}

// Deterministic pseudo-random for fallback waveform generation
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateFallbackPeaks(seed: number, count = 80): number[] {
  const rng = lcg(seed);
  const raw: number[] = [];
  for (let i = 0; i < count; i++) {
    const base = 0.1 + rng() * 0.2;
    const spike = rng() > 0.65 ? 0.4 + rng() * 0.6 : rng() * 0.1;
    raw.push(base + spike);
  }
  const smoothed = raw.map((v, i) =>
    ((raw[i - 1] ?? v) + v + (raw[i + 1] ?? v)) / 3
  );
  const max = Math.max(...smoothed);
  return smoothed.map((v) => v / max);
}

export function BreakWaveform({ peaks, seed, playedFraction, isCollected, onClick }: BreakWaveformProps) {
  const normalizedPeaks = useMemo(() => {
    if (peaks && peaks.length > 0) return peaks;
    return generateFallbackPeaks(seed);
  }, [peaks, seed]);

  const playedCount = Math.floor(normalizedPeaks.length * playedFraction);

  return (
    <div
      className="flex-1 flex items-center overflow-hidden cursor-pointer"
      style={{ height: 48 }}
      onClick={onClick}
    >
      {normalizedPeaks.map((p, i) => {
        const height = Math.max(4, Math.round(p * 46));
        const isPlayed = i < playedCount;
        const isHead = i === playedCount;
        let bg = isCollected ? "#1E1E1E" : "#111";
        if (isPlayed) bg = "#C0C0C0";
        if (isHead) bg = "#fff";
        return (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: 3,
              height,
              background: bg,
              boxShadow: isHead ? "0 0 6px rgba(255,255,255,.5)" : undefined,
              transition: "background 0.04s",
            }}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create BreakRow.tsx**

```typescript
// src/components/vault/BreakRow.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { BreakWaveform } from "./BreakWaveform";
import type { DrumBreakWithStatus } from "@/types/database";

interface BreakRowProps {
  drumBreak: DrumBreakWithStatus;
  index: number;
  onCollect: (id: string) => void;
  onDownload: (id: string) => void;
}

export function BreakRow({ drumBreak, index, onCollect, onDownload }: BreakRowProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playedFraction, setPlayedFraction] = useState(0);
  const [isSweeping, setIsSweeping] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
    setPlayedFraction(0);
  }, []);

  const handlePlay = useCallback(async () => {
    if (isPlaying) { stopAudio(); return; }

    // Fetch preview URL
    const res = await fetch(`/api/drum-vault/${drumBreak.id}/preview`);
    if (!res.ok) return;
    const { url } = await res.json();

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(console.error);
    setIsPlaying(true);

    const tick = () => {
      if (!audio.duration) { rafRef.current = requestAnimationFrame(tick); return; }
      setPlayedFraction(audio.currentTime / audio.duration);
      if (!audio.paused && !audio.ended) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setIsPlaying(false);
        setPlayedFraction(0);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    audio.onended = () => { setIsPlaying(false); setPlayedFraction(0); };
  }, [isPlaying, stopAudio, drumBreak.id]);

  const handleCollect = useCallback(() => {
    if (drumBreak.is_collected) return;
    setIsSweeping(true);
    setTimeout(() => setIsSweeping(false), 600);
    onCollect(drumBreak.id);
  }, [drumBreak.is_collected, drumBreak.id, onCollect]);

  return (
    <div
      className="flex items-center gap-5 relative overflow-hidden"
      style={{
        padding: "18px 0",
        borderBottom: "1px solid #111",
        background: "#0C0C0C",
        scrollSnapAlign: "center",
        transformOrigin: "center center",
        willChange: "transform, opacity",
        transition: "transform 0.12s cubic-bezier(.4,0,.2,1), opacity 0.12s cubic-bezier(.4,0,.2,1)",
      }}
    >
      {/* Sweep layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,.15) 50%, transparent 80%)",
          transform: isSweeping ? "translateX(200%)" : "translateX(-100%)",
          transition: isSweeping ? "transform .5s cubic-bezier(.4,0,.2,1)" : "none",
        }}
      />

      {/* Row number */}
      <div
        className="flex-shrink-0 text-right font-black"
        style={{ width: 32, fontSize: 18, color: "#1C1C1C", letterSpacing: "-0.03em" }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Info */}
      <div className="flex-shrink-0" style={{ width: 120 }}>
        <div className="text-[13px] font-semibold" style={{ color: drumBreak.is_collected ? "#aaa" : "#888" }}>
          {drumBreak.name}
        </div>
        <div className="text-[11px] font-medium mt-0.5" style={{ color: "#252525" }}>
          {drumBreak.bpm} BPM
        </div>
        {drumBreak.is_new && (
          <div className="text-[9px] font-bold uppercase tracking-[0.1em] rounded px-1.5 py-0.5 w-fit mt-1"
            style={{ color: "#22c55e", background: "#22c55e0E", border: "1px solid #22c55e20" }}>
            New
          </div>
        )}
        {drumBreak.is_exclusive && !drumBreak.is_new && (
          <div className="text-[9px] font-bold uppercase tracking-[0.1em] rounded px-1.5 py-0.5 w-fit mt-1"
            style={{ color: "#C0A860", background: "#C0A8600E", border: "1px solid #C0A86020" }}>
            Exclusive
          </div>
        )}
      </div>

      {/* Play button */}
      <button
        onClick={handlePlay}
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{ width: 32, height: 32, border: "1px solid #1E1E1E", background: "#111" }}
      >
        {isPlaying ? (
          <div className="flex gap-0.5">
            <div className="bg-white rounded-sm" style={{ width: 2.5, height: 9 }} />
            <div className="bg-white rounded-sm" style={{ width: 2.5, height: 9 }} />
          </div>
        ) : (
          <div style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "4px 0 4px 8px",
            borderColor: "transparent transparent transparent #555", marginLeft: 2 }} />
        )}
      </button>

      {/* Waveform */}
      <BreakWaveform
        peaks={drumBreak.waveform_peaks}
        seed={(index + 1) * 6113 + 9}
        playedFraction={playedFraction}
        isCollected={drumBreak.is_collected}
        onClick={handlePlay}
      />

      {/* Collect / Download button */}
      {drumBreak.is_collected ? (
        <button
          onClick={() => onDownload(drumBreak.id)}
          className="flex-shrink-0 text-[12px] font-semibold px-5 py-2 rounded-lg"
          style={{ color: "#22c55e", border: "1px solid #22c55e18", background: "transparent",
            letterSpacing: "0.05em", whiteSpace: "nowrap" }}
        >
          ↓ Download
        </button>
      ) : (
        <button
          onClick={handleCollect}
          className="flex-shrink-0 text-[12px] font-semibold px-5 py-2 rounded-lg transition-all"
          style={{ color: "#2E2E2E", border: "1px solid #1A1A1A", background: "transparent",
            letterSpacing: "0.05em", whiteSpace: "nowrap" }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = "#fff";
            (e.target as HTMLButtonElement).style.color = "#000";
            (e.target as HTMLButtonElement).style.borderColor = "#fff";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = "transparent";
            (e.target as HTMLButtonElement).style.color = "#2E2E2E";
            (e.target as HTMLButtonElement).style.borderColor = "#1A1A1A";
          }}
        >
          Collect
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create VaultPicker.tsx**

```typescript
// src/components/vault/VaultPicker.tsx
"use client";

import { useRef, useEffect, useCallback } from "react";
import { BreakRow } from "./BreakRow";
import type { DrumBreakWithStatus } from "@/types/database";

interface VaultPickerProps {
  breaks: DrumBreakWithStatus[];
  onCollect: (id: string) => void;
  onDownload: (id: string) => void;
}

export function VaultPicker({ breaks, onCollect, onDownload }: VaultPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Focal (slot machine) effect
  const updateFocal = useCallback(() => {
    const scroll = scrollRef.current;
    const rows = listRef.current?.querySelectorAll<HTMLDivElement>("[data-row]");
    if (!scroll || !rows) return;

    const rect = scroll.getBoundingClientRect();
    const center = rect.top + rect.height / 2;

    rows.forEach((row) => {
      const rc = row.getBoundingClientRect();
      const rowCenter = rc.top + rc.height / 2;
      const dist = Math.abs(rowCenter - center);
      const t = Math.min(dist / (rect.height * 0.4), 1);
      row.style.transform = `scale(${(1 - t * 0.1).toFixed(4)})`;
      row.style.opacity = (1 - t * 0.5).toFixed(4);
    });
  }, []);

  // Init padding so first/last rows can reach center
  useEffect(() => {
    const scroll = scrollRef.current;
    const list = listRef.current;
    const firstRow = list?.querySelector<HTMLDivElement>("[data-row]");
    if (!scroll || !list || !firstRow) return;

    const pad = Math.max(0, scroll.clientHeight / 2 - firstRow.offsetHeight / 2);
    list.style.paddingTop = `${pad}px`;
    list.style.paddingBottom = `${pad}px`;
    updateFocal();
  }, [updateFocal, breaks.length]);

  // Scroll listener
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    let pending = false;
    const onScroll = () => {
      if (!pending) {
        pending = true;
        rafRef.current = requestAnimationFrame(() => { updateFocal(); pending = false; });
      }
    };
    scroll.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroll.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateFocal]);

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none z-10"
        style={{ height: "28%", background: "linear-gradient(to bottom, #0C0C0C 0%, transparent 100%)" }} />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
        style={{ height: "28%", background: "linear-gradient(to top, #0C0C0C 0%, transparent 100%)" }} />
      {/* Center selection band */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none z-10"
        style={{ height: 68, borderTop: "1px solid rgba(255,255,255,0.055)", borderBottom: "1px solid rgba(255,255,255,0.055)" }} />

      {/* Scroll container */}
      {/* scrollbar-hide is already defined in globals.css — no extra styles needed */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-scroll scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" } as React.CSSProperties}
      >
        <div ref={listRef} className="max-w-[860px] mx-auto px-10">
          {breaks.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-center">
              <div>
                <div className="text-[13px] font-semibold mb-1" style={{ color: "#444" }}>
                  No breaks in the vault yet
                </div>
                <div className="text-[11px]" style={{ color: "#2A2A2A" }}>
                  Check back soon — new breaks are added regularly.
                </div>
              </div>
            </div>
          ) : breaks.map((b, i) => (
            <div key={b.id} data-row="">
              <BreakRow
                drumBreak={b}
                index={i}
                onCollect={onCollect}
                onDownload={onDownload}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create VaultFooter.tsx**

```typescript
// src/components/vault/VaultFooter.tsx
export function VaultFooter() {
  return (
    <div
      className="flex-shrink-0"
      style={{ borderTop: "1px solid #111", padding: "18px 40px 22px" }}
    >
      <div className="max-w-[860px] mx-auto flex items-baseline justify-between gap-6">
        <p className="text-[11px] leading-[1.7] tracking-[0.02em]" style={{ color: "#222" }}>
          <strong style={{ color: "#2E2E2E", fontWeight: 600 }}>Members-only drum breaks</strong>{" "}
          — sourced, cleaned and added to the vault on a rolling basis.
          <br />Every break is yours to keep forever once collected.
        </p>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.14em] whitespace-nowrap flex-shrink-0"
          style={{ color: "#1C1C1C" }}
        >
          Updated regularly
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify vault page renders with `npm run dev`**

Navigate to `http://localhost:3000/vault` while logged in as a subscriber.

Expected:
- Full-viewport layout, no page scroll
- Hero with stats + progress bar visible
- Slot machine picker shows "No breaks yet" if vault is empty (this is expected before admin uploads)
- Scroll snap is working once breaks exist

- [ ] **Step 7: Commit**

```bash
git add src/components/vault/ src/app/vault/
git commit -m "feat(vault): add VaultClient, VaultHero, VaultPicker, BreakRow, BreakWaveform, VaultFooter"
```

---

## Chunk 5: Admin UI

### Task 10: Admin drum vault pages

**Files:**
- Create: `src/components/admin/DrumBreakForm.tsx`
- Create: `src/app/(admin)/admin/drum-vault/page.tsx`
- Create: `src/app/(admin)/admin/drum-vault/new/page.tsx`
- Create: `src/app/(admin)/admin/drum-vault/[id]/page.tsx`

**Pattern note:** Look at `src/app/(admin)/admin/packs/page.tsx` and `src/app/(admin)/admin/packs/new/page.tsx` for exact layout, component patterns, and styling to follow.

- [ ] **Step 1: Read existing admin pack pages** to understand the exact layout/component structure used in this codebase. Mirror it exactly.

- [ ] **Step 2: Create DrumBreakForm.tsx**

Key props: `defaultValues?: Partial<DrumBreak>`, `onSubmit: (data) => Promise<void>`, `mode: 'create' | 'edit'`

Fields:
- `name` (text, required)
- `bpm` (number, optional)
- `is_exclusive` (checkbox)
- `is_published` (checkbox — only show in edit mode)
- Audio file upload (full WAV/MP3): calls `/api/admin/drum-breaks/presign` with `type: 'full'`, uploads directly to Storage, stores path
- Preview file upload (MP3 recommended): calls `/api/admin/drum-breaks/presign` with `type: 'preview'`, same flow
- "Generate waveform peaks" button: POST to `/api/admin/drum-breaks/[id]/generate-peaks` (only in edit mode after file uploaded)

Follow the exact upload pattern from `src/components/admin/` existing form components.

- [ ] **Step 3: Create admin/drum-vault/page.tsx** (list all breaks)

```
Table columns: Name | BPM | Exclusive | Published | Collections | Created | Actions (Edit, Delete, Publish toggle)
```

- [ ] **Step 4: Create admin/drum-vault/new/page.tsx**

Render `<DrumBreakForm mode="create" />` with submit handler that:
1. POSTs to `/api/admin/drum-breaks` with name, bpm, file_path, preview_path, is_exclusive
2. Redirects to `/admin/drum-vault/[id]` after creation so admin can generate peaks + publish

- [ ] **Step 5: Create admin/drum-vault/[id]/page.tsx**

Fetch break data, render `<DrumBreakForm mode="edit" defaultValues={break} />` with PUT handler.

- [ ] **Step 6: Verify admin can upload a break end-to-end**

1. Go to `http://localhost:3000/admin/drum-vault/new`
2. Fill in name + BPM
3. Upload a WAV file
4. Save → redirected to edit page
5. Click "Generate waveform peaks"
6. Toggle is_published → true → Save
7. Go to `/vault` — break should appear

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/DrumBreakForm.tsx src/app/(admin)/admin/drum-vault/
git commit -m "feat(vault): add admin drum vault management pages and DrumBreakForm"
```

---

## Chunk 6: Navigation & Integration

### Task 11: Add Vault icon to Navbar

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Add vault icon import**

In `Navbar.tsx`, add `Vault` or `Trophy` to the lucide-react import. Check which icon is available:
```bash
grep -r "from 'lucide-react'" src/components/layout/Navbar.tsx
# Then check: Trophy is available in lucide-react
```

Use `Trophy` if available, otherwise `Layers` or `Archive` as fallback.

- [ ] **Step 2: Add vault icon button in the user area**

In the `{user && (...)}` block, add the vault link **before** `<NotificationBell`:

```tsx
{/* Vault icon */}
<Link
  href="/vault"
  className={cn(
    "flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200",
    pathname === "/vault"
      ? "text-white bg-white/10"
      : "text-text-muted hover:text-white hover:bg-grey-800"
  )}
  title="Drum Vault"
>
  <Trophy className="w-4 h-4" />
</Link>
```

- [ ] **Step 3: Add to mobile menu navLinks**

Add to the `navLinks` array:
```typescript
{ href: "/vault", label: "Drum Vault", icon: Trophy },
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat(vault): add vault icon to navbar"
```

---

### Task 12: Add Vault tab to MobileBottomNav

**Files:**
- Modify: `src/components/layout/MobileBottomNav.tsx`

- [ ] **Step 1: Add vault nav item**

Import `Trophy` from lucide-react. Add to `navItems` array:
```typescript
{ href: "/vault", label: "Vault", icon: Trophy },
```

Insert between Library and Account.

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/MobileBottomNav.tsx
git commit -m "feat(vault): add vault tab to mobile bottom nav"
```

---

### Task 13: Add Vault teaser to /feed catalog

**Files:**
- Modify: `src/app/feed/page.tsx`

- [ ] **Step 1: Read feed/page.tsx** to understand the current layout structure.

- [ ] **Step 2: Add vault teaser banner**

Add this near the top of the feed page content (below the feed header, above the pack grid):

For subscribers — shows break count + CTA:
```tsx
{/* Only show to authenticated subscribers — check user in server component */}
<Link
  href="/vault"
  className="block mb-8 group rounded-xl overflow-hidden border border-grey-700 hover:border-grey-600 transition-all bg-grey-800/30 hover:bg-grey-800/50"
>
  <div className="flex items-center justify-between p-5">
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-1">
        Members Exclusive
      </div>
      <div className="text-white font-bold text-lg tracking-tight">Drum Vault</div>
      <div className="text-text-muted text-sm mt-0.5">
        Members-only drum breaks — collect yours forever.
      </div>
    </div>
    <div className="text-text-muted group-hover:text-white transition-colors">→</div>
  </div>
</Link>
```

Only render if user is authenticated + subscribed (you already have the user object in the feed page server component — add the subscription check or pass via props).

- [ ] **Step 3: Ensure /vault is in middleware protected routes**

Open `src/middleware.ts`. Find where public routes are defined. Confirm `/vault` is NOT in the public routes list (it should redirect unauthenticated users to `/login`). The vault page performs its own redirect, but the middleware should also protect it. Add `/vault` to the protected routes list if needed. Verify by visiting `/vault` while logged out — should redirect to `/login`.

- [ ] **Step 4: Commit**

```bash
git add src/app/feed/page.tsx src/middleware.ts
git commit -m "feat(vault): add vault teaser to feed page and verify middleware protection"
```

---

## Chunk 7: Dev Review Checkpoint ⛔

### Task 14: End-to-end dev verification

**This is the mandatory review checkpoint before any deployment consideration.**

- [ ] **Step 1: Start dev server**

```bash
cd /Users/looplair/Documents/soul-sample-club
npm run dev
```

- [ ] **Step 2: Full build check**

```bash
npm run build
```

Expected: zero TypeScript errors, zero build errors.

- [ ] **Step 3: Walk through the full user flow**

1. Log in as an active subscriber
2. See vault teaser on `/feed`
3. Click vault teaser → arrives at `/vault`
4. Hero shows correct collected/total stats
5. Scroll through picker — slot machine effect works
6. Click play on any break → audio starts, waveform animates
7. Click Collect → sweep animation → "✓ Collected" / "↓ Download" state
8. Toast appears with correct message
9. Progress bar updates live

- [ ] **Step 4: Walk through admin flow**

1. Log in as admin
2. Go to `/admin/drum-vault`
3. Create a new break at `/admin/drum-vault/new`
4. Upload WAV file
5. Generate waveform peaks
6. Publish the break
7. Return to `/vault` as subscriber — new break visible

- [ ] **Step 5: Test subscription gating**

1. Log out → visit `/vault` → redirected to `/login` ✓
2. Log in as non-subscriber → visit `/vault` → redirected to `/subscribe` ✓
3. Collect as non-subscriber via API: `POST /api/drum-vault/[id]/collect` → 403 ✓

- [ ] **Step 6: ⛔ STOP — hand off to owner for review**

```
🛑 DEPLOYMENT HOLD

All development work is complete. The feature is running locally at localhost:3000.

The owner must review the full user experience in the development environment before
any deployment to production is considered. Do not push to production or staging.

Owner review checklist:
- [ ] Vault UI matches approved mockup
- [ ] Slot machine scroll feel is correct
- [ ] Play → Collect → Download flow works end-to-end
- [ ] Admin can upload and publish breaks
- [ ] Navigation (vault icon, mobile nav) looks right
- [ ] Feed teaser appears on catalog page
- [ ] No unexpected errors in browser console

Only proceed to deployment after explicit owner sign-off.
```

---

## Final commit tally

By end of implementation, git log should show commits matching roughly:

```
feat(vault): add drum_breaks and break_collections tables with RLS
feat(vault): add DrumBreak, BreakCollection, DrumBreakWithStatus types
feat(vault): add GET /api/drum-vault list endpoint
feat(vault): add POST /api/drum-vault/[id]/collect endpoint
feat(vault): add GET /api/drum-vault/[id]/download endpoint
feat(vault): add GET /api/drum-vault/[id]/preview endpoint
feat(vault): add admin drum-breaks CRUD, presign, and generate-peaks routes
feat(vault): add vault page server component and VaultClient scaffold
feat(vault): add VaultClient, VaultHero, VaultPicker, BreakRow, BreakWaveform, VaultFooter
feat(vault): add admin drum vault management pages and DrumBreakForm
feat(vault): add vault icon to navbar
feat(vault): add vault tab to mobile bottom nav
feat(vault): add vault teaser to feed page and verify middleware protection
```

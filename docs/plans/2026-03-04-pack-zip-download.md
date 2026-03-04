# Pack ZIP Download Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an optional "Download All (ZIP)" button to pack pages that lets subscribers download the full pack as a single ZIP file uploaded by the admin.

**Architecture:** Store a `pack_zip_path` column on the `packs` table (null = no button shown). Upload uses the existing presign→uploadToSignedUrl→finalize pattern from stems. Download uses a new API route with the same auth/expiry checks as individual sample downloads.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase Storage (`samples` bucket), react-dropzone, Tailwind CSS v4

---

### Task 1: Add `pack_zip_path` to the database types

**Files:**
- Modify: `src/types/database.ts` (packs Row/Insert/Update blocks, ~lines 160–205)

No migration SQL needed yet — add to TypeScript types first so the rest of the code type-checks. The Supabase column will be added manually in the dashboard in Task 2.

**Step 1: Add the field to the `packs` Row type**

In `src/types/database.ts`, find the `packs` → `Row` block and add:

```typescript
pack_zip_path: string | null;
```

Add it after `cover_image_url: string | null;` (line ~165).

**Step 2: Add the field to `Insert` and `Update` types**

In the `Insert` block, add:
```typescript
pack_zip_path?: string | null;
```

In the `Update` block, add:
```typescript
pack_zip_path?: string | null;
```

**Step 3: Run TypeScript check**

```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build 2>&1 | tail -20
```
Expected: build succeeds (or only pre-existing errors, none new).

**Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add pack_zip_path to database types"
```

---

### Task 2: Add the column in Supabase dashboard

**Files:** None (manual step)

**Step 1: Go to Supabase dashboard → Table Editor → `packs` table**

**Step 2: Add column**
- Name: `pack_zip_path`
- Type: `text`
- Default: `NULL`
- Nullable: yes

**Step 3: Save**

No code change needed — the TypeScript type added in Task 1 already matches.

---

### Task 3: Create presign API route for pack ZIP upload

**Files:**
- Create: `src/app/api/admin/pack-zip/presign/route.ts`

This is an admin-only route that generates a signed upload URL for the `samples` bucket. Mirrors `src/app/api/admin/stems/presign/route.ts` exactly, but for packs not samples.

**Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const profileData = profile as { is_admin: boolean } | null;
    if (!profileData?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { packId } = body;

    if (!packId) {
      return NextResponse.json({ error: "Missing packId" }, { status: 400 });
    }

    const zipPath = `pack-zips/${packId}/${Date.now()}-full-pack.zip`;

    const { data: uploadUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUploadUrl(zipPath);

    if (urlError || !uploadUrl) {
      console.error("Error creating signed upload URL:", urlError);
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    return NextResponse.json({
      token: uploadUrl.token,
      path: zipPath,
    });
  } catch (error) {
    console.error("Pack zip presign error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: TypeScript check**

```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build 2>&1 | tail -20
```
Expected: no new errors.

**Step 3: Commit**

```bash
git add src/app/api/admin/pack-zip/presign/route.ts
git commit -m "feat: add pack zip presign API route"
```

---

### Task 4: Create finalize API route for pack ZIP upload

**Files:**
- Create: `src/app/api/admin/pack-zip/finalize/route.ts`

Mirrors `src/app/api/admin/stems/finalize/route.ts` but updates `packs.pack_zip_path` instead of `samples.stems_path`.

**Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const profileData = profile as { is_admin: boolean } | null;
    if (!profileData?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { packId, zipPath } = body;

    if (!packId || !zipPath) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updateData, error: dbError } = await (adminSupabase as any)
      .from("packs")
      .update({ pack_zip_path: zipPath })
      .eq("id", packId)
      .select();

    if (dbError) {
      console.error("Pack zip database update error:", dbError);
      return NextResponse.json({ error: "Failed to update database", details: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      pack_zip_path: zipPath,
      pack: updateData?.[0],
    });
  } catch (error) {
    console.error("Pack zip finalize error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: TypeScript check**

```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add src/app/api/admin/pack-zip/finalize/route.ts
git commit -m "feat: add pack zip finalize API route"
```

---

### Task 5: Create the pack ZIP download API route

**Files:**
- Create: `src/app/api/download/pack/[packId]/route.ts`

Mirrors `src/app/api/download/[sampleId]/route.ts` but takes a `packId`, fetches `pack_zip_path` from the `packs` table, and generates a signed download URL for it. Same auth and expiry checks.

**Step 1: Create the file**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPackExpiredWithEndDate } from "@/lib/utils";
import type { Pack } from "@/types/database";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ packId: string }> }
) {
  try {
    const { packId } = await params;

    if (!UUID_REGEX.test(packId)) {
      return NextResponse.json({ error: "Invalid pack ID format" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check subscription
    const now = new Date().toISOString();
    const subscriptionResult = await adminSupabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .gte("current_period_end", now)
      .limit(1);

    const hasSubscription = (subscriptionResult.data?.length ?? 0) > 0;

    // Check Patreon
    const patreonResult = await adminSupabase
      .from("patreon_links")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    const hasPatreon = !!patreonResult.data;

    if (!hasSubscription && !hasPatreon) {
      return NextResponse.json(
        { error: "Active subscription or Patreon membership required" },
        { status: 403 }
      );
    }

    // Fetch pack
    const packResult = await adminSupabase
      .from("packs")
      .select("id, name, release_date, end_date, is_published, pack_zip_path, is_returned")
      .eq("id", packId)
      .single();

    const pack = packResult.data as (Pack & { pack_zip_path: string | null }) | null;

    if (packResult.error || !pack) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    }

    if (!pack.is_published) {
      return NextResponse.json({ error: "Pack not available" }, { status: 404 });
    }

    if (!pack.pack_zip_path) {
      return NextResponse.json({ error: "No ZIP available for this pack" }, { status: 404 });
    }

    // Check expiry — same logic as pack page
    const isReturned = pack.is_returned ?? false;
    const endDate = pack.end_date ?? null;
    const isExpired = isReturned
      ? (endDate ? isPackExpiredWithEndDate(pack.release_date, endDate) : false)
      : isPackExpiredWithEndDate(pack.release_date, endDate);

    if (isExpired) {
      return NextResponse.json(
        { error: "Pack has been archived and is no longer available for download" },
        { status: 403 }
      );
    }

    // Generate signed URL (valid for 300 seconds — larger file needs more time to start)
    const { data: signedUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUrl(pack.pack_zip_path, 300, {
        download: `${pack.name} - Full Pack.zip`,
      });

    if (urlError || !signedUrl) {
      console.error("Error generating pack zip signed URL:", urlError);
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (error) {
    console.error("Pack zip download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: TypeScript check**

```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add src/app/api/download/pack/[packId]/route.ts
git commit -m "feat: add pack ZIP download API route"
```

---

### Task 6: Add ZIP upload section to PackForm

**Files:**
- Modify: `src/components/admin/PackForm.tsx`

Add a "Full Pack ZIP" upload section following the same presign→upload→finalize flow as stems in SampleManager. Add state, a dropzone, progress bar, and finalize call. Do NOT touch any existing form logic.

**Step 1: Add new imports at the top of the file**

After the existing imports, add `PackageOpen` to the lucide-react import (alongside existing icons):

```typescript
import { Upload, X, AlertCircle, CheckCircle, Gift, Calendar, RotateCcw, PackageOpen } from "lucide-react";
```

**Step 2: Add ZIP-related state inside the `PackForm` component, after existing state declarations**

```typescript
const [zipFile, setZipFile] = useState<File | null>(null);
const [zipPath, setZipPath] = useState<string | null>(pack?.pack_zip_path || null);
const [isUploadingZip, setIsUploadingZip] = useState(false);
const [zipUploadProgress, setZipUploadProgress] = useState(0);
const [zipError, setZipError] = useState<string | null>(null);
```

**Step 3: Add the ZIP dropzone config after the existing `useDropzone` block (after line ~52)**

```typescript
const {
  getRootProps: getZipRootProps,
  getInputProps: getZipInputProps,
  isDragActive: isZipDragActive,
} = useDropzone({
  accept: { "application/zip": [".zip"], "application/x-zip-compressed": [".zip"] },
  maxFiles: 1,
  onDrop: (acceptedFiles) => {
    if (acceptedFiles[0]) setZipFile(acceptedFiles[0]);
  },
});
```

**Step 4: Add the ZIP upload handler function after `removeCover`**

```typescript
const handleZipUpload = async () => {
  if (!zipFile || !pack?.id) return;
  setIsUploadingZip(true);
  setZipUploadProgress(0);
  setZipError(null);

  try {
    // Step 1: Presign
    const presignRes = await fetch("/api/admin/pack-zip/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId: pack.id }),
    });
    if (!presignRes.ok) {
      const err = await presignRes.json();
      throw new Error(err.error || "Failed to get upload URL");
    }
    const { token, path: uploadPath } = await presignRes.json();

    // Step 2: Upload with fake progress
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
      fakeProgress = Math.min(90, fakeProgress + (90 - fakeProgress) * 0.1);
      setZipUploadProgress(fakeProgress);
    }, 500);

    try {
      const { error: uploadError } = await supabase.storage
        .from("samples")
        .uploadToSignedUrl(uploadPath, token, zipFile);

      clearInterval(progressInterval);
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
    } catch (err) {
      clearInterval(progressInterval);
      throw err;
    }

    setZipUploadProgress(95);

    // Step 3: Finalize
    const finalizeRes = await fetch("/api/admin/pack-zip/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId: pack.id, zipPath: uploadPath }),
    });
    if (!finalizeRes.ok) {
      const err = await finalizeRes.json();
      throw new Error(err.error || "Failed to save ZIP path");
    }

    setZipPath(uploadPath);
    setZipFile(null);
    setZipUploadProgress(100);
    router.refresh();
  } catch (err: any) {
    setZipError(err.message || "ZIP upload failed");
  } finally {
    setIsUploadingZip(false);
  }
};
```

**Step 5: Add the ZIP upload UI section inside the form's `<CardContent>`, after the cover image section and before the Name input**

```tsx
{/* Full Pack ZIP - only shown when editing an existing pack */}
{isEditing && (
  <div>
    <label className="label">Full Pack ZIP</label>
    <p className="text-caption text-snow/40 mb-8">
      Optional — enables the "Download All" button on the pack page
    </p>

    {zipError && (
      <div className="bg-error/10 border border-error/50 rounded-button p-8 text-error text-body-sm flex items-center gap-8 mb-8">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {zipError}
      </div>
    )}

    {zipPath ? (
      <div className="flex items-center gap-12 p-12 bg-success/10 border border-success/30 rounded-button">
        <PackageOpen className="w-5 h-5 text-success flex-shrink-0" />
        <span className="text-body-sm text-success flex-1">ZIP uploaded</span>
        <button
          type="button"
          onClick={() => setZipFile(null)}
          className="text-body-sm text-snow/40 hover:text-snow underline"
        >
          Replace
        </button>
      </div>
    ) : zipFile ? (
      <div className="space-y-8">
        <div className="flex items-center gap-12 p-12 bg-steel/30 border border-steel rounded-button">
          <PackageOpen className="w-5 h-5 text-snow/60 flex-shrink-0" />
          <span className="text-body-sm text-snow/80 flex-1 truncate">{zipFile.name}</span>
          <button type="button" onClick={() => setZipFile(null)}>
            <X className="w-4 h-4 text-snow/40 hover:text-snow" />
          </button>
        </div>

        {isUploadingZip && (
          <div className="w-full bg-steel rounded-full h-2">
            <div
              className="bg-velvet h-2 rounded-full transition-all duration-500"
              style={{ width: `${zipUploadProgress}%` }}
            />
          </div>
        )}

        <Button
          type="button"
          size="sm"
          onClick={handleZipUpload}
          isLoading={isUploadingZip}
          disabled={isUploadingZip}
        >
          {isUploadingZip ? `Uploading... ${Math.round(zipUploadProgress)}%` : "Upload ZIP"}
        </Button>
      </div>
    ) : (
      <div
        {...getZipRootProps()}
        className={`
          border-2 border-dashed rounded-button p-16 text-center cursor-pointer transition-colors
          ${isZipDragActive ? "border-velvet bg-velvet/10" : "border-steel hover:border-velvet/50"}
        `}
      >
        <input {...getZipInputProps()} />
        <PackageOpen className="w-6 h-6 text-snow/30 mx-auto mb-8" />
        <p className="text-body-sm text-snow/60">
          {isZipDragActive ? "Drop ZIP here" : "Drag & drop or click to select ZIP"}
        </p>
      </div>
    )}
  </div>
)}
```

**Step 6: TypeScript check**

```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build 2>&1 | tail -30
```
Expected: no new errors.

**Step 7: Commit**

```bash
git add src/components/admin/PackForm.tsx
git commit -m "feat: add full pack ZIP upload to PackForm"
```

---

### Task 7: Add "Download All" button to the pack page

**Files:**
- Modify: `src/app/packs/[id]/page.tsx`

Add a "Download All (ZIP)" button inside the existing "Ready to download" green banner. Only render it when `pack.pack_zip_path` is truthy and `canDownload` is true. No changes to existing download logic.

**Step 1: Add `DownloadAllButton` client component**

Create: `src/components/packs/DownloadAllButton.tsx`

```tsx
"use client";

import { useState } from "react";
import { PackageOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

interface DownloadAllButtonProps {
  packId: string;
}

export function DownloadAllButton({ packId }: DownloadAllButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/download/pack/${packId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Download failed");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || "Download failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleDownload}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <PackageOpen className="w-4 h-4 mr-2" />
        )}
        {isLoading ? "Preparing..." : "Download All (ZIP)"}
      </Button>
      {error && (
        <p className="text-body-sm text-error mt-2">{error}</p>
      )}
    </div>
  );
}
```

**Step 2: Import `DownloadAllButton` in the pack page**

In `src/app/packs/[id]/page.tsx`, add to the imports near the top:

```typescript
import { DownloadAllButton } from "@/components/packs/DownloadAllButton";
```

**Step 3: Add the button inside the "Ready to download" banner**

Find the green "Ready to download" section (~line 586–597):

```tsx
) : (
  <div className="bg-success/10 border border-success/30 rounded-card p-4 flex items-start sm:items-center gap-3">
    <Play className="w-5 h-5 text-success flex-shrink-0 mt-0.5 sm:mt-0" />
    <div>
      <p className="text-body text-text-secondary font-medium">
        Ready to download
      </p>
      <p className="text-body-sm text-text-muted mt-1">
        All {pack.samples.length} tracks are available for download.
      </p>
    </div>
  </div>
)}
```

Replace with:

```tsx
) : (
  <div className="bg-success/10 border border-success/30 rounded-card p-4 flex items-start sm:items-center gap-3">
    <Play className="w-5 h-5 text-success flex-shrink-0 mt-0.5 sm:mt-0" />
    <div className="flex-1">
      <p className="text-body text-text-secondary font-medium">
        Ready to download
      </p>
      <p className="text-body-sm text-text-muted mt-1">
        All {pack.samples.length} tracks are available for download.
      </p>
    </div>
    {pack.pack_zip_path && (
      <DownloadAllButton packId={pack.id} />
    )}
  </div>
)}
```

**Step 4: TypeScript check**

```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build 2>&1 | tail -30
```
Expected: clean build.

**Step 5: Commit**

```bash
git add src/components/packs/DownloadAllButton.tsx src/app/packs/[id]/page.tsx
git commit -m "feat: add Download All ZIP button to pack page"
```

---

### Task 8: Push and verify on Vercel

**Step 1: Push to main**

```bash
cd /Users/looplair/Documents/soul-sample-club && git push
```

**Step 2: Manual verification checklist**

1. Go to admin → edit any pack → confirm "Full Pack ZIP" section appears
2. Upload a test ZIP → confirm progress bar shows → confirm "ZIP uploaded" green state appears
3. Go to that pack's page as a subscribed user → confirm "Download All (ZIP)" button appears in the green banner
4. Click it → confirm ZIP download starts
5. Go to a pack with no ZIP → confirm button is NOT shown
6. Go to an expired pack → confirm button is NOT shown (canDownload is false)
7. Log out → go to same pack → confirm button is NOT shown

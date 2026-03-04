# Pack ZIP Download Feature Design

**Date:** 2026-03-04
**Status:** Approved

## Overview

Add a "Download All" button to pack pages that lets subscribers download the entire pack as a single ZIP file. The ZIP is optionally uploaded by the admin — the button only appears when a ZIP has been uploaded for that pack.

## Architecture

### Database
- Add `pack_zip_path: string | null` column to the `packs` table
- `null` = no ZIP uploaded = button not shown
- Update TypeScript types in `src/types/database.ts`

### Storage
- Reuse existing `samples` Supabase Storage bucket
- Path prefix: `pack-zips/[packId]/[timestamp]-full-pack.zip`
- Consistent with how stems ZIPs are stored

### API Routes (3 new files)
- `POST /api/admin/pack-zip/presign` — admin-only, returns signed upload token + storage path
- `POST /api/admin/pack-zip/finalize` — admin-only, writes `pack_zip_path` to `packs` table
- `GET /api/download/pack/[packId]` — checks auth + active subscription/Patreon + pack not expired, returns 60s signed download URL

### Admin Upload (PackForm.tsx)
- New "Full Pack ZIP" section added below cover image
- Dropzone accepts `.zip` only, no size limit enforced client-side
- Upload flow: presign → `uploadToSignedUrl` → finalize (mirrors stems pattern)
- Shows fake progress bar during upload
- Shows "Replace ZIP" if one already exists

### Pack Page (packs/[id]/page.tsx)
- "Download All (ZIP)" button renders in the "Ready to download" green banner
- Only shown when `pack.pack_zip_path` is truthy AND `canDownload` is true
- Clicking hits `/api/download/pack/[packId]`, redirects to signed URL
- No changes to existing individual track download logic

## Access Rules
Same as individual downloads:
- Must be authenticated
- Must have active subscription (active/trialing/past_due) OR active Patreon link
- Pack must not be expired

## Retroactive Compatibility
- Existing packs without a ZIP uploaded will have `pack_zip_path = null`
- Button simply won't appear — no changes needed to existing packs

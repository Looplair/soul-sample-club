# Announcements Feature Design

**Date:** 2026-03-06
**Status:** Approved

## Overview

A members-only announcements section for flexible content that doesn't fit elsewhere — separate drops, news, updates. Admin-controlled with full CRUD and a one-click notification trigger.

## Database

New `announcements` table:
- `id` (uuid, primary key)
- `title` (text)
- `slug` (text, unique — auto-generated from title, used in URLs)
- `body` (text — plain text with line breaks)
- `cover_image_url` (text, nullable)
- `is_published` (boolean, default false)
- `published_at` (timestamptz, nullable — set when first published)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

TypeScript types added to `src/types/database.ts`.

## Admin Routes

### `/admin/announcements`
- List all announcements (draft + published)
- Shows title, date, published badge, Edit + Delete buttons
- "New Announcement" CTA at top
- Matches existing admin table style

### `/admin/announcements/new`
- AnnouncementForm component (new mode)
- Fields: title, body (textarea), cover image (dropzone), published toggle, published_at date

### `/admin/announcements/[id]`
- AnnouncementForm component (edit mode)
- Same fields as new
- "Send Notification" button — only shown when announcement is published
  - Inserts row into existing `notifications` table
  - type: `"announcement"`, links to `/announcements/[slug]`
  - Shows confirmation on success

## Public Routes

### `/announcements` (members only)
- Redirects non-members to `/login`
- Shows published announcements newest first
- Card layout: cover image, title, date, body preview (first 120 chars)
- Each card links to `/announcements/[slug]`
- Premium dark aesthetic matching rest of site

### `/announcements/[slug]` (members only)
- Redirects non-members to `/login`
- Cover image as full-width banner (if set)
- Title, published date, full body with paragraph formatting
- Back link to `/announcements`
- Same header/nav as pack detail pages

## Notification Integration

Reuses existing `notifications` table — no schema changes needed.
- `type`: `"announcement"`
- `title`: announcement title
- `message`: first 100 chars of body
- Notification links to `/announcements/[slug]`
- Existing bell icon picks it up automatically

## Access Control

- Public listing + detail pages: check active subscription OR active Patreon link
- Non-members see `/login` redirect
- Uses same `getUserAccess()` pattern as pack pages

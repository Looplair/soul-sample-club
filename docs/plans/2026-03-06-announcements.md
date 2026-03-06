# Announcements Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a members-only announcements section with admin CRUD, cover image upload, and one-click notification dispatch.

**Architecture:** New `announcements` Supabase table, admin routes under `/admin/announcements`, public member-only routes at `/announcements` and `/announcements/[slug]`. Notification dispatch reuses the existing `notifications` table (type: "announcement" already exists).

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (DB + Storage), react-dropzone, Tailwind CSS v4, lucide-react

---

### Task 1: Add TypeScript types for announcements

**Files:**
- Modify: `src/types/database.ts` — add after the `packs` block (~line 206)

**Step 1: Add the announcements table types**

Find the closing `};` of the `packs` block and insert after it:

```typescript
      announcements: {
        Row: {
          id: string;
          title: string;
          slug: string;
          body: string;
          cover_image_url: string | null;
          is_published: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          body: string;
          cover_image_url?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          body?: string;
          cover_image_url?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
```

**Step 2: Add the export type at the bottom of database.ts**

Find where the other export types are (~line 404+) and add:

```typescript
export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
```

**Step 3: TypeScript check**

```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build 2>&1 | tail -10
```
Expected: clean build or only pre-existing errors.

**Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add announcements TypeScript types"
```

---

### Task 2: Create the announcements table in Supabase (manual)

**Files:** None (Supabase dashboard)

**Step 1: Go to Supabase → Table Editor → New Table**

Name: `announcements`

Columns:
| Name | Type | Default | Nullable |
|------|------|---------|----------|
| id | uuid | gen_random_uuid() | No |
| title | text | — | No |
| slug | text | — | No |
| body | text | — | No |
| cover_image_url | text | NULL | Yes |
| is_published | bool | false | No |
| published_at | timestamptz | NULL | Yes |
| created_at | timestamptz | now() | No |
| updated_at | timestamptz | now() | No |

**Step 2: Add unique constraint on `slug`**

In the table editor, mark `slug` as Unique.

**Step 3: RLS**

Enable RLS on the table. Add a policy: "Allow authenticated read of published" — `auth.role() = 'authenticated'` for SELECT where `is_published = true`. Admin writes will use the admin client (bypasses RLS).

---

### Task 3: Add Announcements to admin sidebar

**Files:**
- Modify: `src/components/layout/AdminSidebar.tsx`

**Step 1: Add Megaphone to lucide imports**

```typescript
import {
  LayoutDashboard,
  Package,
  Users,
  TrendingUp,
  Settings,
  ArrowLeft,
  Plus,
  Menu,
  X,
  CreditCard,
  Bell,
  Megaphone,
} from "lucide-react";
```

**Step 2: Add announcements link to adminLinks array**

Insert after the Notifications entry:

```typescript
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
```

**Step 3: TypeScript check**

```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build 2>&1 | tail -10
```

**Step 4: Commit**

```bash
git add src/components/layout/AdminSidebar.tsx
git commit -m "feat: add announcements to admin sidebar"
```

---

### Task 4: Create admin announcements list page

**Files:**
- Create: `src/app/(admin)/admin/announcements/page.tsx`

**Step 1: Create the file**

```typescript
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Plus, Edit, Megaphone } from "lucide-react";
import { Card, CardContent, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Announcement } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Announcements | Soul Sample Club Admin",
};

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminSupabase as any)
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  const announcements = (data ?? []) as Announcement[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="text-sm text-text-muted mt-1">
            Members-only posts for drops, news, and updates.
          </p>
        </div>
        <Link
          href="/admin/announcements/new"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {announcements.length === 0 ? (
            <div className="py-16 text-center">
              <Megaphone className="w-10 h-10 text-text-subtle mx-auto mb-3" />
              <p className="text-text-muted">No announcements yet.</p>
              <Link href="/admin/announcements/new" className="text-velvet text-sm mt-2 inline-block hover:underline">
                Create your first one
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-grey-700">
                  <th className="text-left text-label text-text-muted px-6 py-3">Title</th>
                  <th className="text-left text-label text-text-muted px-6 py-3 hidden sm:table-cell">Date</th>
                  <th className="text-left text-label text-text-muted px-6 py-3">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a.id} className="border-b border-grey-700/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-body text-white font-medium">{a.title}</td>
                    <td className="px-6 py-4 text-body text-text-muted hidden sm:table-cell">
                      {formatDate(a.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      {a.is_published ? (
                        <Badge variant="success">Published</Badge>
                      ) : (
                        <Badge variant="default">Draft</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/announcements/${a.id}`}
                        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-white transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: TypeScript check**

```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build 2>&1 | tail -10
```

**Step 3: Commit**

```bash
git add src/app/\(admin\)/admin/announcements/page.tsx
git commit -m "feat: add admin announcements list page"
```

---

### Task 5: Create AnnouncementForm component

**Files:**
- Create: `src/components/admin/AnnouncementForm.tsx`

This is the shared form used by both new and edit pages. Handles cover image upload to Supabase `covers` bucket, slug auto-generation, published toggle, and the "Send Notification" button (edit mode only, published only).

**Step 1: Create the file**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { Upload, X, AlertCircle, CheckCircle, Megaphone, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card, CardContent } from "@/components/ui";
import type { Announcement } from "@/types/database";

interface AnnouncementFormProps {
  announcement?: Announcement;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function AnnouncementForm({ announcement }: AnnouncementFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!announcement;

  const [title, setTitle] = useState(announcement?.title ?? "");
  const [slug, setSlug] = useState(announcement?.slug ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [isPublished, setIsPublished] = useState(announcement?.is_published ?? false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(announcement?.cover_image_url ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setCoverImage(file);
        setCoverPreview(URL.createObjectURL(file));
      }
    },
  });

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEditing) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      let coverImageUrl = announcement?.cover_image_url ?? null;

      if (coverImage) {
        const fileExt = coverImage.name.split(".").pop();
        const fileName = `announcements/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("covers")
          .upload(fileName, coverImage);

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from("covers")
          .getPublicUrl(fileName);

        coverImageUrl = publicUrl.publicUrl;
      }

      const announcementData = {
        title,
        slug,
        body,
        is_published: isPublished,
        cover_image_url: coverImageUrl,
        published_at: isPublished ? (announcement?.published_at ?? new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: dbError } = await (supabase.from("announcements") as any)
          .update(announcementData)
          .eq("id", announcement.id);
        if (dbError) throw dbError;
        setSuccess(true);
        router.refresh();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: dbError } = await (supabase.from("announcements") as any)
          .insert({ ...announcementData, created_at: new Date().toISOString() })
          .select()
          .single();
        if (dbError) throw dbError;
        router.push(`/admin/announcements/${data.id}`);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to save announcement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!announcement) return;
    setIsSendingNotif(true);
    setNotifSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: notifError } = await (supabase.from("notifications") as any).insert({
        title: announcement.title,
        message: announcement.body.slice(0, 100),
        type: "announcement",
        link_url: `/announcements/${announcement.slug}`,
        link_new_tab: false,
        created_by: user?.id ?? null,
      });

      if (notifError) throw notifError;
      setNotifSuccess(true);
    } catch (err: any) {
      setError(err.message ?? "Failed to send notification");
    } finally {
      setIsSendingNotif(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="mb-24">
        <CardContent className="space-y-24">
          {error && (
            <div className="bg-error/10 border border-error/50 rounded-button p-12 text-error text-body flex items-center gap-8">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-success/10 border border-success/50 rounded-button p-12 text-success text-body flex items-center gap-8">
              <CheckCircle className="w-4 h-4" />
              Announcement saved
            </div>
          )}

          {/* Cover Image */}
          <div>
            <label className="label">Cover Image</label>
            <p className="text-caption text-snow/40 mb-8">Optional — shown as banner on the announcement page</p>
            {coverPreview ? (
              <div className="relative w-full max-w-lg aspect-video rounded-card overflow-hidden">
                <Image src={coverPreview} alt="Cover preview" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverImage(null); setCoverPreview(announcement?.cover_image_url ?? null); }}
                  className="absolute top-8 right-8 w-8 h-8 rounded-full bg-error flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-card p-16 text-center cursor-pointer transition-colors max-w-lg aspect-video flex flex-col items-center justify-center ${
                  isDragActive ? "border-velvet bg-velvet/10" : "border-steel hover:border-velvet/50"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 text-snow/30 mb-8" />
                <p className="text-body text-snow/60">{isDragActive ? "Drop the image here" : "Drag & drop or click"}</p>
                <p className="text-caption text-snow/40 mt-4">JPG, PNG or WebP, max 5MB</p>
              </div>
            )}
          </div>

          {/* Title */}
          <Input
            label="Title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g., Exclusive Drop: Summer Series"
            required
          />

          {/* Slug */}
          <div>
            <Input
              label="Slug (URL)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., exclusive-drop-summer-series"
              required
            />
            <p className="text-caption text-snow/40 mt-4">
              URL: /announcements/{slug || "..."}
            </p>
          </div>

          {/* Body */}
          <div>
            <label className="label">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your announcement here..."
              rows={10}
              className="input resize-none"
              required
            />
          </div>

          {/* Published toggle */}
          <div className="flex items-center gap-12">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-steel rounded-full peer peer-checked:bg-velvet transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <span className="text-body text-snow">{isPublished ? "Published" : "Draft"}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-16 flex-wrap">
        <Button type="submit" isLoading={isLoading}>
          {isEditing ? "Save Changes" : "Create Announcement"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>

        {/* Send Notification — only on published existing announcements */}
        {isEditing && announcement.is_published && (
          <div className="ml-auto flex items-center gap-12">
            {notifSuccess && (
              <span className="text-success text-body-sm flex items-center gap-4">
                <CheckCircle className="w-4 h-4" />
                Notification sent
              </span>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={handleSendNotification}
              isLoading={isSendingNotif}
            >
              <Bell className="w-4 h-4 mr-8" />
              Send Notification
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
```

**Step 2: TypeScript check**

```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build 2>&1 | tail -15
```

**Step 3: Commit**

```bash
git add src/components/admin/AnnouncementForm.tsx
git commit -m "feat: add AnnouncementForm admin component"
```

---

### Task 6: Create admin new + edit announcement pages

**Files:**
- Create: `src/app/(admin)/admin/announcements/new/page.tsx`
- Create: `src/app/(admin)/admin/announcements/[id]/page.tsx`

**Step 1: Create new page**

```typescript
// src/app/(admin)/admin/announcements/new/page.tsx
import { AnnouncementForm } from "@/components/admin/AnnouncementForm";

export const metadata = {
  title: "New Announcement | Soul Sample Club Admin",
};

export default function NewAnnouncementPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-24">
        <h1 className="text-h1 text-snow mb-8">New Announcement</h1>
        <p className="text-body-lg text-snow/60">Create a members-only announcement</p>
      </div>
      <AnnouncementForm />
    </div>
  );
}
```

**Step 2: Create edit page**

```typescript
// src/app/(admin)/admin/announcements/[id]/page.tsx
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { AnnouncementForm } from "@/components/admin/AnnouncementForm";
import type { Announcement } from "@/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const adminSupabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminSupabase as any)
    .from("announcements")
    .select("title")
    .eq("id", params.id)
    .single();

  return {
    title: data ? `Edit: ${data.title} | Admin` : "Edit Announcement | Admin",
  };
}

export default async function EditAnnouncementPage({ params }: { params: { id: string } }) {
  const adminSupabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminSupabase as any)
    .from("announcements")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) notFound();

  const announcement = data as Announcement;

  return (
    <div className="max-w-4xl">
      <div className="mb-24">
        <h1 className="text-h1 text-snow mb-8">Edit Announcement</h1>
        <p className="text-body-lg text-snow/60">{announcement.title}</p>
      </div>
      <AnnouncementForm announcement={announcement} />
    </div>
  );
}
```

**Step 3: TypeScript check**

```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build 2>&1 | tail -15
```

**Step 4: Commit**

```bash
git add src/app/\(admin\)/admin/announcements/new/page.tsx src/app/\(admin\)/admin/announcements/\[id\]/page.tsx
git commit -m "feat: add admin new and edit announcement pages"
```

---

### Task 7: Create public announcements listing page

**Files:**
- Create: `src/app/announcements/page.tsx`

Members-only. Redirects to `/login` if not authenticated or no active subscription/Patreon. Shows published announcements newest first.

**Step 1: Create the file**

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft, Megaphone, User } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserDropdown } from "@/components/layout/UserDropdown";
import { getNotificationsForUser } from "@/lib/notifications";
import type { Announcement, Profile, NotificationWithReadStatus } from "@/types/database";

export const metadata = {
  title: "Announcements | Soul Sample Club",
  description: "Members-only announcements and updates.",
};

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check access (subscription or Patreon)
  const now = new Date().toISOString();
  const subResult = await adminSupabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .gte("current_period_end", now)
    .limit(1);

  const patreonResult = await adminSupabase
    .from("patreon_links")
    .select("is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  const hasAccess = (subResult.data?.length ?? 0) > 0 || !!patreonResult.data;
  if (!hasAccess) redirect("/login");

  // Fetch profile and notifications
  const profileResult = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileResult.data as Profile | null;

  const { notifications, unreadCount } = await getNotificationsForUser(user.id);

  // Fetch published announcements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminSupabase as any)
    .from("announcements")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const announcements = (data ?? []) as Announcement[];

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <header className="border-b border-grey-700 bg-charcoal/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-app h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Image src="/logo.svg" alt="Soul Sample Club" width={160} height={36} className="h-8 sm:h-9 w-auto" priority />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/feed" className="hidden sm:block">
              <button className="btn-secondary text-sm px-4 py-2">Catalog</button>
            </Link>
            <NotificationBell userId={user.id} initialNotifications={notifications} initialUnreadCount={unreadCount} />
            {profile && (
              <UserDropdown
                email={profile.email}
                displayName={profile.username || profile.full_name || profile.email?.split("@")[0] || "User"}
                isAdmin={profile.is_admin}
              />
            )}
          </div>
        </div>
      </header>

      <main className="section pb-32 sm:pb-0">
        <div className="container-app">
          <Link href="/feed" className="inline-flex items-center gap-2 text-body text-text-muted hover:text-white transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Catalog
          </Link>

          <div className="mb-10">
            <h1 className="text-h1 text-white mb-2">Announcements</h1>
            <p className="text-body text-text-muted">Members-only updates, drops, and news.</p>
          </div>

          {announcements.length === 0 ? (
            <div className="py-24 text-center">
              <Megaphone className="w-12 h-12 text-text-subtle mx-auto mb-4" />
              <p className="text-h4 text-text-muted">Nothing yet</p>
              <p className="text-body text-text-subtle mt-2">Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map((a) => (
                <Link key={a.id} href={`/announcements/${a.slug}`} className="group block">
                  <article className="bg-grey-800/50 border border-grey-700 rounded-card overflow-hidden hover:border-grey-600 hover:bg-grey-800 transition-all duration-200">
                    {/* Cover */}
                    {a.cover_image_url ? (
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={a.cover_image_url}
                          alt={a.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-velvet/20 to-grey-700 flex items-center justify-center">
                        <Megaphone className="w-10 h-10 text-velvet/40" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5">
                      <p className="text-label text-text-muted mb-2">
                        {formatDate(a.published_at ?? a.created_at)}
                      </p>
                      <h2 className="text-h4 text-white mb-2 group-hover:text-text-secondary transition-colors line-clamp-2">
                        {a.title}
                      </h2>
                      <p className="text-body-sm text-text-muted line-clamp-3">
                        {a.body.slice(0, 120)}{a.body.length > 120 ? "…" : ""}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```

**Step 2: TypeScript check**

```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build 2>&1 | tail -15
```

**Step 3: Commit**

```bash
git add src/app/announcements/page.tsx
git commit -m "feat: add public announcements listing page"
```

---

### Task 8: Create public announcement detail page

**Files:**
- Create: `src/app/announcements/[slug]/page.tsx`

Members-only. Full announcement with cover image banner, title, date, body with paragraph formatting.

**Step 1: Create the file**

```typescript
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft, Megaphone } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserDropdown } from "@/components/layout/UserDropdown";
import { getNotificationsForUser } from "@/lib/notifications";
import type { Announcement, Profile } from "@/types/database";

export const revalidate = 60;

export async function generateStaticParams() {
  const adminSupabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminSupabase as any)
    .from("announcements")
    .select("slug")
    .eq("is_published", true);
  return (data ?? []).map((a: { slug: string }) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const adminSupabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminSupabase as any)
    .from("announcements")
    .select("title, body")
    .eq("slug", params.slug)
    .eq("is_published", true)
    .single();

  if (!data) return { title: "Announcement | Soul Sample Club" };
  return {
    title: `${data.title} | Soul Sample Club`,
    description: data.body.slice(0, 160),
  };
}

export default async function AnnouncementDetailPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check access
  const now = new Date().toISOString();
  const subResult = await adminSupabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .gte("current_period_end", now)
    .limit(1);

  const patreonResult = await adminSupabase
    .from("patreon_links")
    .select("is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  const hasAccess = (subResult.data?.length ?? 0) > 0 || !!patreonResult.data;
  if (!hasAccess) redirect("/login");

  // Fetch announcement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminSupabase as any)
    .from("announcements")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_published", true)
    .single();

  if (error || !data) notFound();
  const announcement = data as Announcement;

  // Profile + notifications
  const profileResult = await adminSupabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  const { notifications, unreadCount } = await getNotificationsForUser(user.id);

  // Split body into paragraphs
  const paragraphs = announcement.body.split(/\n+/).filter(Boolean);

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <header className="border-b border-grey-700 bg-charcoal/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-app h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Image src="/logo.svg" alt="Soul Sample Club" width={160} height={36} className="h-8 sm:h-9 w-auto" priority />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/feed" className="hidden sm:block">
              <button className="btn-secondary text-sm px-4 py-2">Catalog</button>
            </Link>
            <NotificationBell userId={user.id} initialNotifications={notifications} initialUnreadCount={unreadCount} />
            {profile && (
              <UserDropdown
                email={profile.email}
                displayName={profile.username || profile.full_name || profile.email?.split("@")[0] || "User"}
                isAdmin={profile.is_admin}
              />
            )}
          </div>
        </div>
      </header>

      <main className="pb-32 sm:pb-0">
        {/* Cover Image Banner */}
        {announcement.cover_image_url && (
          <div className="relative w-full aspect-[21/9] max-h-[420px] overflow-hidden">
            <Image
              src={announcement.cover_image_url}
              alt={announcement.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-charcoal" />
          </div>
        )}

        <div className="container-app section">
          <Link href="/announcements" className="inline-flex items-center gap-2 text-body text-text-muted hover:text-white transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            All Announcements
          </Link>

          <div className="max-w-3xl">
            {/* Meta */}
            <div className="flex items-center gap-3 mb-4">
              <Megaphone className="w-4 h-4 text-velvet" />
              <span className="text-label text-text-muted">
                {formatDate(announcement.published_at ?? announcement.created_at)}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-h1 text-white mb-8">{announcement.title}</h1>

            {/* Body */}
            <div className="space-y-5">
              {paragraphs.map((para, i) => (
                <p key={i} className="text-body-lg text-text-secondary leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

**Step 2: TypeScript check**

```bash
cd /Users/looplair/Documents/soul-sample-club && npm run build 2>&1 | tail -15
```
Expected: clean build.

**Step 3: Commit + push**

```bash
git add src/app/announcements/page.tsx src/app/announcements/\[slug\]/page.tsx
git commit -m "feat: add public announcement detail page"
git push
```

---

### Task 9: Manual verification checklist (after Vercel deploys)

1. **Supabase table exists** — Table Editor → `announcements` shows all columns
2. **Admin sidebar** — `/admin` shows "Announcements" link with Megaphone icon
3. **Create announcement** — `/admin/announcements/new` → fill form → create → redirects to edit page
4. **Publish toggle** — toggle Published → Save → badge shows "Published"
5. **Send Notification button** — appears on published announcements → click → "Notification sent" ✓ → check `/admin/notifications` to confirm it appeared
6. **Public listing** — visit `/announcements` as subscriber → cards show correctly
7. **Detail page** — click card → full announcement renders, cover image banner shows
8. **Access control** — log out → visit `/announcements` → redirected to `/login`
9. **No ZIP** — check that pack pages still work (no regression)

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { Upload, X, AlertCircle, CheckCircle, Bell } from "lucide-react";
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { Upload, X, AlertCircle, CheckCircle, Gift, Calendar, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card, CardContent } from "@/components/ui";
import type { Pack } from "@/types/database";

interface PackFormProps {
  pack?: Pack;
}

export function PackForm({ pack }: PackFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!pack;

  const [name, setName] = useState(pack?.name || "");
  const [description, setDescription] = useState(pack?.description || "");
  const [releaseDate, setReleaseDate] = useState(
    pack?.release_date || new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(pack?.end_date || "");
  const [isPublished, setIsPublished] = useState(pack?.is_published || false);
  const [isBonus, setIsBonus] = useState(pack?.is_bonus || false);
  const [isReturned, setIsReturned] = useState(pack?.is_returned || false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    pack?.cover_image_url || null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setCoverImage(file);
        setCoverPreview(URL.createObjectURL(file));
      }
    },
  });

  const removeCover = () => {
    setCoverImage(null);
    setCoverPreview(pack?.cover_image_url || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      let coverImageUrl = pack?.cover_image_url || null;

      // Upload cover image if new one selected
      if (coverImage) {
        const fileExt = coverImage.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `pack-covers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("covers")
          .upload(filePath, coverImage);

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from("covers")
          .getPublicUrl(filePath);

        coverImageUrl = publicUrl.publicUrl;
      }

      const packData = {
        name,
        description,
        release_date: releaseDate,
        end_date: endDate || null,
        is_published: isPublished,
        is_bonus: isBonus,
        is_returned: isReturned,
        cover_image_url: coverImageUrl,
      };

      if (isEditing) {
        // Update existing pack
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("packs") as any)
          .update(packData)
          .eq("id", pack.id);

        if (error) throw error;

        // Auto-create notifications when pack is newly published or returned
        const wasJustPublished = !pack.is_published && isPublished;
        const wasJustReturned = !pack.is_returned && isReturned;

        if (wasJustPublished || wasJustReturned) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const notifType = wasJustReturned ? "returned_pack" : "new_pack";
          const notifTitle = wasJustReturned
            ? `${name} is back!`
            : `New pack: ${name}`;
          const notifMessage = wasJustReturned
            ? `By popular demand! "${name}" has returned for a limited time.`
            : `Check out our latest release — ${name}`;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.from("notifications") as any)
            .insert({
              title: notifTitle,
              message: notifMessage,
              type: notifType,
              pack_id: pack.id,
              created_by: currentUser?.id,
            })
            .then(({ error: notifError }: { error: unknown }) => {
              if (notifError) console.error("Error creating notification:", notifError);
            });
        }

        setSuccess(true);
        router.refresh();
      } else {
        // Create new pack
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("packs") as any)
          .insert(packData)
          .select()
          .single();

        if (error) throw error;

        // Auto-create notification if new pack is published immediately
        if (isPublished) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.from("notifications") as any)
            .insert({
              title: `New pack: ${name}`,
              message: `Check out our latest release — ${name}`,
              type: "new_pack",
              pack_id: data.id,
              created_by: currentUser?.id,
            })
            .then(({ error: notifError }: { error: unknown }) => {
              if (notifError) console.error("Error creating notification:", notifError);
            });
        }

        // Redirect to edit page to add samples
        router.push(`/admin/packs/${data.id}`);
      }
    } catch (err: any) {
      console.error("Error saving pack:", err);
      setError(err.message || "Failed to save pack");
    } finally {
      setIsLoading(false);
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
              Pack saved successfully
            </div>
          )}

          {/* Cover Image */}
          <div>
            <label className="label">Cover Image</label>
            {coverPreview ? (
              <div className="relative w-48 h-48 rounded-card overflow-hidden">
                <Image
                  src={coverPreview}
                  alt="Cover preview"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={removeCover}
                  className="absolute top-8 right-8 w-8 h-8 rounded-full bg-error flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-card p-32 text-center cursor-pointer
                  transition-colors
                  ${
                    isDragActive
                      ? "border-velvet bg-velvet/10"
                      : "border-steel hover:border-velvet/50"
                  }
                `}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 text-snow/30 mx-auto mb-16" />
                <p className="text-body text-snow/60">
                  {isDragActive
                    ? "Drop the image here"
                    : "Drag & drop or click to upload"}
                </p>
                <p className="text-caption text-snow/40 mt-8">
                  JPG, PNG or WebP, max 5MB
                </p>
              </div>
            )}
          </div>

          {/* Name */}
          <Input
            label="Pack Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Soul Essentials Vol. 1"
            required
          />

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the pack..."
              rows={4}
              className="input resize-none"
              required
            />
          </div>

          {/* Dates Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            {/* Release Date */}
            <Input
              label="Release Date"
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              required
            />

            {/* End Date */}
            <div>
              <Input
                label="End Date (Optional)"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <p className="text-caption text-snow/40 mt-4">
                <Calendar className="w-3 h-3 inline mr-1" />
                Leave empty for default 3-month window. Set explicitly for bonus packs (1 month).
              </p>
            </div>
          </div>

          {/* Toggle Options */}
          <div className="flex flex-wrap items-center gap-24">
            {/* Published Status */}
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
              <span className="text-body text-snow">
                {isPublished ? "Published" : "Draft"}
              </span>
            </div>

            {/* Bonus Pack Toggle */}
            <div className="flex items-center gap-12">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBonus}
                  onChange={(e) => setIsBonus(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-steel rounded-full peer peer-checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <span className="text-body text-snow flex items-center gap-8">
                <Gift className="w-4 h-4 text-amber-500" />
                {isBonus ? "Bonus Pack" : "Regular Pack"}
              </span>
            </div>

            {/* Returned Pack Toggle */}
            <div className="flex items-center gap-12">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReturned}
                  onChange={(e) => setIsReturned(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-steel rounded-full peer peer-checked:bg-emerald-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <span className="text-body text-snow flex items-center gap-8">
                <RotateCcw className="w-4 h-4 text-emerald-500" />
                {isReturned ? "Returned Pack" : "Not Returned"}
              </span>
            </div>
          </div>

          {isReturned && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-button p-12 text-emerald-200 text-body-sm">
              <RotateCcw className="w-4 h-4 inline mr-8" />
              This pack was previously archived and has been brought back for a limited time. Make sure the end date reflects when it will expire again.
            </div>
          )}

          {isBonus && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-button p-12 text-amber-200 text-body-sm">
              <Gift className="w-4 h-4 inline mr-8" />
              Bonus packs are from partner libraries and typically expire after 1 month. Make sure to set an explicit end date.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-16">
        <Button type="submit" isLoading={isLoading}>
          {isEditing ? "Save Changes" : "Create Pack"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

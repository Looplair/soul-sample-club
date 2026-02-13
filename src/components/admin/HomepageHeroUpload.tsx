"use client";

import { useState } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

interface HomepageHeroUploadProps {
  initialHeroUrl: string | null;
}

export function HomepageHeroUpload({ initialHeroUrl }: HomepageHeroUploadProps) {
  const router = useRouter();
  const supabase = createClient();

  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(initialHeroUrl);
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
        setHeroImage(file);
        setHeroPreview(URL.createObjectURL(file));
        setSuccess(false);
        setError(null);
      }
    },
  });

  const removeHero = () => {
    setHeroImage(null);
    setHeroPreview(initialHeroUrl);
    setSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      let heroImageUrl: string | null = initialHeroUrl;

      // Upload hero image if new one selected
      if (heroImage) {
        const fileExt = heroImage.name.split(".").pop();
        const fileName = `homepage-hero-${Date.now()}.${fileExt}`;
        const filePath = `pack-covers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("covers")
          .upload(filePath, heroImage);

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from("covers")
          .getPublicUrl(filePath);

        heroImageUrl = publicUrl.publicUrl;
      }

      // Update homepage_settings
      const { error: updateError } = await supabase
        .from("homepage_settings")
        .update({
          hero_image_url: heroImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", "singleton");

      if (updateError) throw updateError;

      setSuccess(true);
      setHeroImage(null);
      router.refresh();
    } catch (err: any) {
      console.error("Error saving hero image:", err);
      setError(err.message || "Failed to save hero image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      // Clear the hero image
      const { error: updateError } = await supabase
        .from("homepage_settings")
        .update({
          hero_image_url: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", "singleton");

      if (updateError) throw updateError;

      setSuccess(true);
      setHeroImage(null);
      setHeroPreview(null);
      router.refresh();
    } catch (err: any) {
      console.error("Error clearing hero image:", err);
      setError(err.message || "Failed to clear hero image");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-16">
      {error && (
        <div className="bg-error/10 border border-error/50 rounded-button p-12 text-error text-body flex items-center gap-8">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-success/10 border border-success/50 rounded-button p-12 text-success text-body flex items-center gap-8">
          <CheckCircle className="w-4 h-4" />
          Homepage hero image updated successfully
        </div>
      )}

      <div className="max-w-md">
        {heroPreview ? (
          <div className="relative w-full aspect-video rounded-card overflow-hidden">
            <Image
              src={heroPreview}
              alt="Homepage hero preview"
              fill
              className="object-cover"
            />
            <button
              type="button"
              onClick={removeHero}
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
              transition-colors aspect-video flex flex-col items-center justify-center
              ${
                isDragActive
                  ? "border-velvet bg-velvet/10"
                  : "border-steel hover:border-velvet/50"
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 text-snow/30 mb-8" />
            <p className="text-body text-snow/60">
              {isDragActive
                ? "Drop the image here"
                : "Drag & drop or click to upload"}
            </p>
            <p className="text-caption text-snow/40 mt-4">
              JPG, PNG or WebP, max 5MB
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-8">
        <Button
          onClick={handleSave}
          isLoading={isLoading}
          disabled={!heroImage}
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Save Hero Image
        </Button>
        {heroPreview && (
          <Button
            variant="ghost"
            onClick={handleClear}
            disabled={isLoading}
          >
            Clear Image
          </Button>
        )}
      </div>

      <p className="text-caption text-snow/40">
        This image will appear as the main hero on the homepage. If not set, it will default to the latest pack cover image.
      </p>
    </div>
  );
}

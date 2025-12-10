"use client";

import Image from "next/image";
import Link from "next/link";
import { Music2, Calendar, Lock, Play } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Pack } from "@/types/database";

interface PackCardProps {
  pack: Pack;
  sampleCount: number;
  hasSubscription: boolean;
}

export function PackCard({ pack, sampleCount, hasSubscription }: PackCardProps) {
  const isLocked = !hasSubscription;

  // Fallback safety to prevent Vercel runtime errors
  const name = pack.name ?? "Untitled Pack";
  const description = pack.description ?? "";
  const releaseDate = pack.release_date ?? "";

  return (
    <Link
      href={`/packs/${pack.id}`}
      className={cn(
        "pack-card block relative group",
        isLocked && "cursor-not-allowed"
      )}
    >
      {/* Cover Image - WAVS style */}
      <div className="pack-card-image">
        {pack.cover_image_url ? (
          <Image
            src={pack.cover_image_url}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple/20 via-grey-900 to-grey-800">
            <Music2 className="w-16 h-16 text-text-subtle" />
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black-card to-transparent opacity-60" />

        {/* Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center transition-opacity">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-grey-800/80 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-5 h-5 text-text-muted" />
              </div>
              <p className="text-label text-text-muted">Subscribe to access</p>
            </div>
          </div>
        )}

        {/* Hover Play Indicator */}
        {!isLocked && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-14 h-14 rounded-full bg-purple/90 flex items-center justify-center shadow-glow-purple transform scale-90 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-6 h-6 text-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pack-card-content">
        <h3 className="pack-card-title line-clamp-1">
          {name}
        </h3>

        <p className="text-body-sm text-text-muted line-clamp-2 mt-1.5 mb-4 min-h-[40px]">
          {description}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-caption text-text-subtle">
          <div className="flex items-center gap-1.5">
            <Music2 className="w-3.5 h-3.5" />
            <span>{sampleCount} samples</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(releaseDate)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

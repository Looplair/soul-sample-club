"use client";

import Image from "next/image";
import Link from "next/link";
import { Music2, Calendar, Lock, Play, Archive, Star, Sparkles } from "lucide-react";
import { cn, formatDate, isPackNew, isPackExpired } from "@/lib/utils";
import { Badge } from "@/components/ui";
import type { Pack } from "@/types/database";

interface PackCardProps {
  pack: Pack & { is_staff_pick?: boolean };
  sampleCount: number;
  hasSubscription: boolean;
}

export function PackCard({ pack, sampleCount, hasSubscription }: PackCardProps) {
  // Fallback safety to prevent Vercel runtime errors
  const name = pack.name ?? "Untitled Release";
  const description = pack.description ?? "";
  const releaseDate = pack.release_date ?? "";

  // Pack status checks
  const isNew = isPackNew(releaseDate);
  const isExpired = isPackExpired(releaseDate);
  const isStaffPick = pack.is_staff_pick ?? false;

  // Expired packs are always viewable (for preview), but not downloadable
  // Non-expired packs require subscription for download
  const isLocked = !hasSubscription && !isExpired;
  const canPreview = true; // Everyone can preview

  return (
    <Link
      href={`/packs/${pack.id}`}
      className="pack-card block relative group"
    >
      {/* Cover Image */}
      <div className="pack-card-image">
        {pack.cover_image_url ? (
          <Image
            src={pack.cover_image_url}
            alt={name}
            fill
            className={cn(
              "object-cover transition-all duration-500 group-hover:scale-105",
              isExpired && "blur-sm brightness-50"
            )}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className={cn(
            "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-grey-700 via-grey-800 to-charcoal",
            isExpired && "opacity-50"
          )}>
            <Music2 className="w-16 h-16 text-text-subtle" />
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-grey-800 to-transparent opacity-60" />

        {/* Badges - Top Left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {isNew && !isExpired && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success text-charcoal text-caption font-semibold">
              <Sparkles className="w-3 h-3" />
              NEW
            </span>
          )}
          {isStaffPick && !isExpired && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 text-charcoal text-caption font-semibold">
              <Star className="w-3 h-3" />
              Staff Pick
            </span>
          )}
        </div>

        {/* Archived Overlay */}
        {isExpired && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-grey-700/80 flex items-center justify-center mx-auto mb-3">
                <Archive className="w-5 h-5 text-text-muted" />
              </div>
              <p className="text-label text-text-muted font-medium">Archived</p>
              <p className="text-caption text-text-subtle mt-1">Preview only</p>
            </div>
          </div>
        )}

        {/* Lock Overlay (for non-subscribers on active packs) */}
        {isLocked && !isExpired && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center transition-opacity">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-grey-700 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-5 h-5 text-text-muted" />
              </div>
              <p className="text-label text-text-muted">Subscribe to access</p>
            </div>
          </div>
        )}

        {/* Hover Play Indicator (only for accessible packs) */}
        {!isLocked && !isExpired && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-glow-white-soft transform scale-90 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-6 h-6 text-charcoal ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pack-card-content">
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn(
            "pack-card-title line-clamp-1 flex-1",
            isExpired && "text-text-muted"
          )}>
            {name}
          </h3>
          {isExpired && (
            <Badge variant="default" size="sm" className="flex-shrink-0">
              Archived
            </Badge>
          )}
        </div>

        <p className={cn(
          "text-body-sm text-text-muted line-clamp-2 mt-1.5 mb-4 min-h-[40px]",
          isExpired && "text-text-subtle"
        )}>
          {description}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-caption text-text-subtle">
          <div className="flex items-center gap-1.5">
            <Music2 className="w-3.5 h-3.5" />
            <span>{sampleCount} tracks</span>
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

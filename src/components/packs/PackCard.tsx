"use client";

import Image from "next/image";
import Link from "next/link";
import { Music2, Calendar, Archive, Star, Sparkles, Play } from "lucide-react";
import { cn, formatDate, isPackNew, isPackExpired } from "@/lib/utils";
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

  return (
    <Link
      href={`/packs/${pack.id}`}
      className="block group"
    >
      {/* Artwork Container - 1:1 Square */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-grey-800 mb-3">
        {pack.cover_image_url ? (
          <Image
            src={pack.cover_image_url}
            alt={name}
            fill
            className={cn(
              "object-cover transition-all duration-500 group-hover:scale-[1.03]",
              isExpired && "brightness-[0.4] saturate-50"
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

        {/* Badges - Top Left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {isNew && !isExpired && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success text-charcoal text-[11px] font-semibold tracking-wide uppercase shadow-sm">
              <Sparkles className="w-3 h-3" />
              New
            </span>
          )}
          {isStaffPick && !isExpired && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-charcoal text-[11px] font-semibold tracking-wide uppercase shadow-sm">
              <Star className="w-3 h-3" />
              Pick
            </span>
          )}
        </div>

        {/* Archived Badge - Top Right */}
        {isExpired && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-grey-700/90 text-text-muted text-[11px] font-medium tracking-wide uppercase backdrop-blur-sm">
              <Archive className="w-3 h-3" />
              Archived
            </span>
          </div>
        )}

        {/* Hover Play Overlay */}
        {!isExpired && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-300">
            <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300">
              <Play className="w-6 h-6 text-charcoal ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}
      </div>

      {/* Info Container - Apple-style card */}
      <div className="bg-grey-800/60 rounded-xl px-4 py-3.5 backdrop-blur-sm border border-grey-700/50">
        {/* Title */}
        <h3 className={cn(
          "text-[15px] font-semibold text-white leading-tight truncate group-hover:text-white transition-colors",
          isExpired && "text-text-muted"
        )}>
          {name}
        </h3>

        {/* Description */}
        {description && (
          <p className={cn(
            "text-[13px] text-text-muted leading-snug line-clamp-1 mt-1",
            isExpired && "text-text-subtle"
          )}>
            {description}
          </p>
        )}

        {/* Metadata Row */}
        <div className="flex items-center gap-3 mt-2.5 text-[12px] text-text-subtle">
          <span className="flex items-center gap-1">
            <Music2 className="w-3.5 h-3.5" />
            {sampleCount} tracks
          </span>
          <span className="text-grey-600">•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(releaseDate)}
          </span>
        </div>
      </div>
    </Link>
  );
}

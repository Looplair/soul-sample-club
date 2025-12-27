"use client";

import Image from "next/image";
import Link from "next/link";
import { Music2, Archive, Star, Sparkles, Play, Gift, Clock } from "lucide-react";
import { cn, formatDate, isPackNew, isPackExpiredWithEndDate, getDaysUntilEndDate, getExpiryBadgeText } from "@/lib/utils";
import type { Pack } from "@/types/database";

interface PackCardProps {
  pack: Pack & { is_staff_pick?: boolean; is_bonus?: boolean; end_date?: string | null };
  sampleCount: number;
  hasSubscription: boolean;
}

export function PackCard({ pack, sampleCount }: PackCardProps) {
  const name = pack.name ?? "Untitled Release";
  const description = pack.description ?? "";
  const releaseDate = pack.release_date ?? "";
  const endDate = pack.end_date ?? null;

  const isNew = isPackNew(releaseDate);
  const isExpired = isPackExpiredWithEndDate(releaseDate, endDate);
  const isStaffPick = pack.is_staff_pick ?? false;
  const isBonus = pack.is_bonus ?? false;

  // Calculate expiry badge for non-expired packs
  const daysRemaining = !isExpired ? getDaysUntilEndDate(releaseDate, endDate, isBonus ? 1 : 3) : 0;
  const expiryBadgeText = !isExpired ? getExpiryBadgeText(daysRemaining) : null;

  return (
    <Link
      href={`/packs/${pack.id}`}
      className="block group relative"
    >
      {/* Artwork Container - Pure artwork-first, no box underneath */}
      <div className={cn(
        "relative aspect-square rounded-2xl overflow-hidden bg-grey-800",
        "transition-transform duration-300 group-hover:scale-[1.02]"
      )}>
        {pack.cover_image_url ? (
          <Image
            src={pack.cover_image_url}
            alt={name}
            fill
            className={cn(
              "object-cover",
              isExpired && "brightness-[0.35] saturate-[0.3] grayscale-[0.5]"
            )}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className={cn(
            "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-grey-600 via-grey-700 to-grey-800",
            isExpired && "opacity-40"
          )}>
            <Music2 className="w-12 h-12 text-text-subtle" />
          </div>
        )}

        {/* Gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Badges - Top Left */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 z-10">
          <div className="flex items-center gap-1.5">
            {isBonus && !isExpired && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-charcoal text-[10px] font-bold tracking-wide uppercase">
                <Gift className="w-2.5 h-2.5" />
                Bonus
              </span>
            )}
            {isNew && !isExpired && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success text-charcoal text-[10px] font-bold tracking-wide uppercase">
                <Sparkles className="w-2.5 h-2.5" />
                New
              </span>
            )}
            {isStaffPick && !isExpired && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-charcoal text-[10px] font-bold tracking-wide uppercase">
                <Star className="w-2.5 h-2.5" />
                Pick
              </span>
            )}
          </div>
          {/* Expiry Warning Badge */}
          {expiryBadgeText && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/90 text-white text-[10px] font-medium tracking-wide backdrop-blur-sm">
              <Clock className="w-2.5 h-2.5" />
              {expiryBadgeText}
            </span>
          )}
        </div>

        {/* Archived Badge - Top Right */}
        {isExpired && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-grey-800/80 text-text-muted text-[10px] font-medium tracking-wide uppercase backdrop-blur-sm border border-grey-600/50">
              <Archive className="w-2.5 h-2.5" />
              Archived
            </span>
          </div>
        )}

        {/* Hover Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
            <Play className="w-5 h-5 text-charcoal ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Text Overlay - Bottom (on artwork, not in separate box) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h3 className={cn(
            "text-[15px] font-semibold text-white leading-tight truncate",
            isExpired && "text-text-muted"
          )}>
            {name}
          </h3>

          {description && (
            <p className={cn(
              "text-[12px] text-white/70 leading-snug line-clamp-1 mt-0.5",
              isExpired && "text-white/40"
            )}>
              {description}
            </p>
          )}

          <div className={cn(
            "flex items-center gap-2 mt-2 text-[11px] text-white/50",
            isExpired && "text-white/30"
          )}>
            <span>{sampleCount} tracks</span>
            <span>•</span>
            <span>{formatDate(releaseDate)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

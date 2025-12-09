"use client";

import Image from "next/image";
import Link from "next/link";
import { Music2, Calendar, Lock } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Pack } from "@/types/database";

interface PackCardProps {
  pack: Pack;
  sampleCount: number;
  hasSubscription: boolean;
}

export function PackCard({ pack, sampleCount, hasSubscription }: PackCardProps) {
  const isLocked = !hasSubscription;

  // fallback safety to prevent Vercel runtime errors
  const name = pack.name ?? "Untitled Pack";
  const description = pack.description ?? "";
  const releaseDate = pack.release_date ?? "";

  return (
    <Link
      href={`/packs/${pack.id}`}
      className={cn("pack-card block relative", isLocked && "cursor-not-allowed")}
    >
      {/* Cover Image */}
      <div className="relative aspect-square rounded-image overflow-hidden mb-16 bg-steel">
        {pack.cover_image_url ? (
          <Image
            src={pack.cover_image_url}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-velvet/20 to-steel">
            <Music2 className="w-16 h-16 text-snow/30" />
          </div>
        )}

        {/* Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <Lock className="w-8 h-8 text-snow/70 mx-auto mb-8" />
              <p className="text-label text-snow/70">Subscribe to access</p>
            </div>
          </div>
        )}

        {/* Hover Overlay */}
        {!isLocked && (
          <div className="absolute inset-0 bg-velvet/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
      </div>

      {/* Content */}
      <div>
        <h3 className="pack-title text-h3 text-snow line-clamp-1">
          {name}
        </h3>

        <p className="text-body text-snow/60 line-clamp-2 mt-4 mb-12 min-h-[48px]">
          {description}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-16 text-label text-snow/50">
          <div className="flex items-center gap-4">
            <Music2 className="w-4 h-4" />
            <span>{sampleCount} samples</span>
          </div>
          <div className="flex items-center gap-4">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(releaseDate)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

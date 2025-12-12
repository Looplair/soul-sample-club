"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Package,
  Archive,
  TrendingUp,
  Music,
  Star,
  Clock,
  Play
} from "lucide-react";
import { cn, formatRelativeDate, isPackExpired } from "@/lib/utils";
import { Badge } from "@/components/ui";
import type { Pack, Sample } from "@/types/database";

// Feed item types
export type FeedItemType =
  | "new_pack"
  | "expired_pack"
  | "trending_pack"
  | "trending_sample"
  | "staff_pick";

export interface FeedItemData {
  id: string;
  type: FeedItemType;
  timestamp: string;
  pack?: Pack & { sample_count?: number };
  sample?: Sample & { pack?: Pack };
}

interface FeedItemProps {
  item: FeedItemData;
  hasSubscription: boolean;
}

const feedTypeConfig: Record<FeedItemType, {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
}> = {
  new_pack: {
    icon: Sparkles,
    label: "New Release",
    color: "text-success",
    bgColor: "bg-success/10"
  },
  expired_pack: {
    icon: Archive,
    label: "Archived",
    color: "text-text-muted",
    bgColor: "bg-grey-700"
  },
  trending_pack: {
    icon: TrendingUp,
    label: "Trending",
    color: "text-warning",
    bgColor: "bg-warning/10"
  },
  trending_sample: {
    icon: Music,
    label: "Hot Sample",
    color: "text-info",
    bgColor: "bg-info/10"
  },
  staff_pick: {
    icon: Star,
    label: "Staff Pick",
    color: "text-white",
    bgColor: "bg-white/10"
  },
};

export function FeedItem({ item, hasSubscription }: FeedItemProps) {
  const config = feedTypeConfig[item.type];
  const Icon = config.icon;

  // Determine if this is a pack or sample item
  const isPack = item.type !== "trending_sample";
  const pack = item.pack;
  const sample = item.sample;

  // Check if pack is expired (for display purposes)
  const expired = pack ? isPackExpired(pack.release_date) : false;

  // Determine link destination
  const href = isPack && pack
    ? `/packs/${pack.id}`
    : sample?.pack
      ? `/packs/${sample.pack.id}`
      : "#";

  return (
    <Link
      href={href}
      className={cn(
        "block bg-grey-800/50 border border-grey-700 rounded-card p-4",
        "hover:border-grey-600 hover:bg-grey-800 transition-all duration-200",
        "active:scale-[0.99]"
      )}
    >
      <div className="flex gap-4">
        {/* Cover Image / Icon */}
        <div className="relative flex-shrink-0">
          {isPack && pack?.cover_image_url ? (
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden">
              <Image
                src={pack.cover_image_url}
                alt={pack.name}
                fill
                className={cn(
                  "object-cover",
                  expired && "blur-sm brightness-50"
                )}
                sizes="80px"
              />
              {expired && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Archive className="w-5 h-5 text-text-muted" />
                </div>
              )}
            </div>
          ) : (
            <div className={cn(
              "w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center",
              config.bgColor
            )}>
              <Icon className={cn("w-6 h-6 sm:w-8 sm:h-8", config.color)} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Type Badge + Time */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium",
              config.bgColor, config.color
            )}>
              <Icon className="w-3 h-3" />
              {config.label}
            </span>
            <span className="text-caption text-text-subtle flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeDate(item.timestamp)}
            </span>
          </div>

          {/* Title */}
          <h3 className={cn(
            "text-body font-medium text-white truncate",
            expired && "text-text-muted"
          )}>
            {isPack ? pack?.name : sample?.name}
          </h3>

          {/* Subtitle / Description */}
          {isPack && pack?.description && (
            <p className="text-body-sm text-text-muted line-clamp-1 mt-0.5">
              {pack.description}
            </p>
          )}

          {/* Sample pack name */}
          {!isPack && sample?.pack && (
            <p className="text-caption text-text-subtle mt-0.5">
              from {sample.pack.name}
            </p>
          )}

          {/* Footer info */}
          <div className="flex items-center gap-3 mt-2 text-caption text-text-subtle">
            {isPack && pack && (
              <>
                <span className="flex items-center gap-1">
                  <Music className="w-3 h-3" />
                  {pack.sample_count || 0} samples
                </span>
                {expired && (
                  <Badge variant="default" size="sm">Expired</Badge>
                )}
                {!expired && !hasSubscription && (
                  <Badge variant="warning" size="sm">Subscribe</Badge>
                )}
              </>
            )}
            {!isPack && sample && (
              <span className="flex items-center gap-1">
                <Play className="w-3 h-3" />
                Preview available
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

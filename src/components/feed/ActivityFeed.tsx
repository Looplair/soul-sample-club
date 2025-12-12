"use client";

import { FeedItem, FeedItemData } from "./FeedItem";
import { isPackNew, isPackExpired } from "@/lib/utils";
import type { Pack, Sample } from "@/types/database";

interface PackWithSamples extends Pack {
  samples: Sample[];
  is_staff_pick?: boolean;
}

interface ActivityFeedProps {
  packs: PackWithSamples[];
  hasSubscription: boolean;
  limit?: number;
}

// Generate feed items from packs data - shows ALL packs
function generateFeedItems(packs: PackWithSamples[]): FeedItemData[] {
  const items: FeedItemData[] = [];

  for (const pack of packs) {
    const sampleCount = pack.samples?.length || 0;
    const isNew = isPackNew(pack.release_date);
    const isExpired = isPackExpired(pack.release_date);

    // Determine the feed item type based on pack status
    let type: "new_pack" | "expired_pack" | "available_pack" = "available_pack";
    if (isNew) {
      type = "new_pack";
    } else if (isExpired) {
      type = "expired_pack";
    }

    // Add every pack to the feed
    items.push({
      id: `pack-${pack.id}`,
      type,
      timestamp: pack.release_date,
      pack: { ...pack, sample_count: sampleCount },
    });

    // Also add staff pick badge as separate item (for highlighting)
    if (pack.is_staff_pick && !isExpired) {
      items.push({
        id: `staff-${pack.id}`,
        type: "staff_pick",
        timestamp: pack.updated_at || pack.created_at,
        pack: { ...pack, sample_count: sampleCount },
      });
    }
  }

  // Sort by timestamp (reverse chronological)
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return items;
}

export function ActivityFeed({ packs, hasSubscription, limit = 10 }: ActivityFeedProps) {
  const feedItems = generateFeedItems(packs).slice(0, limit);

  if (feedItems.length === 0) {
    return (
      <div className="bg-grey-800/50 border border-grey-700 rounded-card p-8 text-center">
        <p className="text-body text-text-muted">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedItems.map((item) => (
        <FeedItem key={item.id} item={item} hasSubscription={hasSubscription} />
      ))}
    </div>
  );
}

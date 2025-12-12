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

// Generate feed items from packs data
function generateFeedItems(packs: PackWithSamples[]): FeedItemData[] {
  const items: FeedItemData[] = [];

  for (const pack of packs) {
    const sampleCount = pack.samples?.length || 0;

    // New pack release (within 7 days)
    if (isPackNew(pack.release_date)) {
      items.push({
        id: `new-${pack.id}`,
        type: "new_pack",
        timestamp: pack.release_date,
        pack: { ...pack, sample_count: sampleCount },
      });
    }
    // Expired pack (older than 3 months)
    else if (isPackExpired(pack.release_date)) {
      items.push({
        id: `expired-${pack.id}`,
        type: "expired_pack",
        timestamp: pack.release_date,
        pack: { ...pack, sample_count: sampleCount },
      });
    }

    // Staff pick (if flagged)
    if (pack.is_staff_pick && !isPackExpired(pack.release_date)) {
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

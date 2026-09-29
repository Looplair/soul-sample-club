import Image from "next/image";
import Link from "next/link";
import { Archive } from "lucide-react";
import { cn, formatRelativeDate, isPackExpired, isPackNew } from "@/lib/utils";
import { packPath } from "@/lib/pack-url";
import type { Pack, Sample } from "@/types/database";

// Member dashboard activity: every release newest first, with staff picks
// surfaced again when they were picked. Same items as the old ActivityFeed,
// drawn as flat glass rows.

interface PackWithSamples extends Pack {
  samples: Sample[];
  is_staff_pick?: boolean;
}

type Kind = "new" | "available" | "archived" | "staff";

const LABEL: Record<Kind, string> = {
  new: "New release",
  available: "Available",
  archived: "In the archive",
  staff: "Staff pick",
};

function buildItems(packs: PackWithSamples[]) {
  const items: { id: string; kind: Kind; timestamp: string; pack: PackWithSamples }[] = [];
  for (const pack of packs) {
    const expired = isPackExpired(pack.release_date);
    items.push({
      id: `pack-${pack.id}`,
      kind: isPackNew(pack.release_date) ? "new" : expired ? "archived" : "available",
      timestamp: pack.release_date,
      pack,
    });
    if (pack.is_staff_pick && !expired) {
      items.push({ id: `staff-${pack.id}`, kind: "staff", timestamp: pack.updated_at || pack.created_at, pack });
    }
  }
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function ActivityList({ packs, hasSubscription, limit = 10 }: { packs: PackWithSamples[]; hasSubscription: boolean; limit?: number }) {
  const items = buildItems(packs).slice(0, limit);

  if (items.length === 0) {
    return (
      <div className="ssc-glass ssc-glass--plain rounded-[22px] px-6 py-10 text-center">
        <p className="ssc-body text-[15px]">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="ssc-glass ssc-glass--plain rounded-[22px] p-2">
      {items.map(({ id, kind, timestamp, pack }) => {
        const expired = isPackExpired(pack.release_date);
        const count = pack.samples?.length || 0;
        return (
          <Link key={id} href={packPath(pack)} className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-white/[0.04]">
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-white/[0.06]">
              {pack.cover_image_url && (
                <Image
                  src={pack.cover_image_url}
                  alt={pack.name}
                  fill
                  sizes="56px"
                  className={cn("object-cover", expired && "brightness-[0.55] saturate-[0.6]")}
                />
              )}
              {expired && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Archive className="h-4 w-4 text-white" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-[3px] text-[9px] font-bold uppercase tracking-[0.16em]",
                    kind === "new" ? "bg-white text-black" : "border border-white/15 text-white/75"
                  )}
                >
                  {LABEL[kind]}
                </span>
                <span className="truncate text-[11px] text-white/55">{formatRelativeDate(timestamp)}</span>
              </div>
              <p className="mt-1.5 truncate text-[14px] font-semibold uppercase tracking-[0.02em] text-white">{pack.name}</p>
              <p className="mt-0.5 text-[12px] text-white/55">
                {count} composition{count === 1 ? "" : "s"}
                {!expired && !hasSubscription && " · Subscribe to download"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PackCard } from "@/components/packs/PackCard";
import { Button } from "@/components/ui";

interface Pack {
  id: string;
  name: string;
  description: string;
  cover_image_url: string | null;
  hero_image_url: string | null;
  release_date: string;
  end_date: string | null;
  is_published: boolean;
  is_staff_pick?: boolean;
  is_bonus: boolean;
  is_returned?: boolean;
  scheduled_publish_at: string | null;
  created_at: string;
  updated_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  samples: any[];
}

interface ArchivedPacksSectionProps {
  archivedPacks: Pack[];
}

export function ArchivedPacksSection({ archivedPacks }: ArchivedPacksSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const visiblePacks = expanded ? archivedPacks : archivedPacks.slice(0, 8);

  const SubscribeCard = ({ title }: { title: string }) => (
    <div className="w-full max-w-sm bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 text-center">
      <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted mb-2">Members only</p>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-text-muted mb-5">
        Subscribe to download everything that&apos;s currently live the moment it drops.
      </p>
      <Link href="/subscribe">
        <Button className="w-full mb-3">Get started →</Button>
      </Link>
      <p className="text-xs text-text-muted">
        or{" "}
        <Link
          href="/signup?redirect=/subscribe?plan=yearly"
          className="hover:text-white transition-colors underline"
        >
          $49/year
        </Link>
        {" "}· Cancel anytime
      </p>
    </div>
  );

  return (
    <div>
      {/* Grid */}
      <div className="relative">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {visiblePacks.map(pack => (
            <PackCard
              key={pack.id}
              pack={pack}
              sampleCount={Array.isArray(pack.samples) ? pack.samples.length : 0}
              hasSubscription={false}
            />
          ))}
        </div>

        {/* Fade — z-20 so it sits above pack card text (which lives at z-10 inside transform stacking contexts) */}
        {!expanded && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[25%] to-charcoal pointer-events-none z-20" />
        )}
      </div>

      {/* Subscribe card — below the grid, no overlap */}
      {!expanded && (
        <div className="flex justify-center px-4 mt-4 relative z-10">
          <SubscribeCard title={`${archivedPacks.length}+ releases in the archive`} />
        </div>
      )}

      {/* See more / collapse toggle */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-white transition-colors py-2 px-4"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
          {expanded
            ? "Show less"
            : `See all ${archivedPacks.length} archived releases`}
        </button>
      </div>

      {/* When expanded: subscribe card below the full grid */}
      {expanded && (
        <div className="flex justify-center px-4 mt-8">
          <SubscribeCard title="Ready to download?" />
        </div>
      )}
    </div>
  );
}

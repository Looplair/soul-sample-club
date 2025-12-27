"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SampleRowWithLoop as SampleRow } from "./SampleRowWithLoop";
import type { Sample, Pack } from "@/types/database";

interface SampleWithPack extends Sample {
  pack?: Pack;
}

interface CollapsibleSampleListProps {
  samples: SampleWithPack[];
  canDownload: boolean;
  likedSampleIds?: Set<string>;
  showPackName?: boolean;
  initialCount?: number;
}

export function CollapsibleSampleList({
  samples,
  canDownload,
  likedSampleIds = new Set(),
  showPackName = false,
  initialCount = 5,
}: CollapsibleSampleListProps) {
  const [likedIds, setLikedIds] = useState<Set<string>>(likedSampleIds);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleLike = useCallback((sampleId: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sampleId)) {
        next.delete(sampleId);
      } else {
        next.add(sampleId);
      }
      return next;
    });
  }, []);

  if (samples.length === 0) {
    return (
      <div className="bg-grey-800/50 border border-grey-700 rounded-card text-center py-12">
        <p className="text-body text-text-muted">No samples yet.</p>
      </div>
    );
  }

  const hasMore = samples.length > initialCount;
  const visibleSamples = isExpanded ? samples : samples.slice(0, initialCount);
  const hiddenCount = samples.length - initialCount;

  return (
    <div className="space-y-2 sm:space-y-3">
      {visibleSamples.map((sample, index) => (
        <SampleRow
          key={sample.id}
          sample={sample}
          index={index + 1}
          canDownload={canDownload}
          isLiked={likedIds.has(sample.id)}
          onToggleLike={() => handleToggleLike(sample.id)}
          packName={showPackName ? sample.pack?.name : undefined}
        />
      ))}

      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-grey-800/50 hover:bg-grey-800 border border-grey-700 rounded-lg text-sm text-text-muted hover:text-white transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show {hiddenCount} more {hiddenCount === 1 ? "sample" : "samples"}
            </>
          )}
        </button>
      )}
    </div>
  );
}

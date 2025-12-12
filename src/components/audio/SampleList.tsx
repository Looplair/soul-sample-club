"use client";

import { useState, useCallback } from "react";
import { SampleRow } from "./SampleRow";
import type { Sample, Pack } from "@/types/database";

// Extended sample type that may include pack info
interface SampleWithPack extends Sample {
  pack?: Pack;
}

interface SampleListProps {
  samples: SampleWithPack[];
  packId?: string;
  canDownload: boolean;
  likedSampleIds?: Set<string>;
  showPackName?: boolean;
}

export function SampleList({
  samples,
  canDownload,
  likedSampleIds = new Set(),
  showPackName = false,
}: SampleListProps) {
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(likedSampleIds);

  const handlePlay = (sampleId: string) => {
    setActivePlayerId(sampleId);
  };

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
        <p className="text-body text-text-muted">No samples in this pack yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {samples.map((sample, index) => (
        <SampleRow
          key={sample.id}
          sample={sample}
          index={index + 1}
          canDownload={canDownload}
          isActive={activePlayerId === sample.id}
          onPlay={() => handlePlay(sample.id)}
          isLiked={likedIds.has(sample.id)}
          onToggleLike={() => handleToggleLike(sample.id)}
          packName={showPackName ? sample.pack?.name : undefined}
        />
      ))}
    </div>
  );
}

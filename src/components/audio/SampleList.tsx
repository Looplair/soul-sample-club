"use client";

import { useState } from "react";
import { SampleRow } from "./SampleRow";
import type { Sample } from "@/types/database";

interface SampleListProps {
  samples: Sample[];
  packId: string;
  canDownload: boolean;
}

export function SampleList({ samples, packId, canDownload }: SampleListProps) {
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);

  const handlePlay = (sampleId: string) => {
    setActivePlayerId(sampleId);
  };

  if (samples.length === 0) {
    return (
      <div className="bg-grey-900/50 border border-grey-800/50 rounded-card text-center py-12">
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
        />
      ))}
    </div>
  );
}

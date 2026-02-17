"use client";

import { useState } from "react";
import { SampleList } from "./SampleList";
import { PremiumModal } from "@/components/subscription/PremiumModal";
import type { Sample, Pack } from "@/types/database";

interface SampleWithPack extends Sample {
  pack?: Pack;
}

interface SampleListWithModalProps {
  samples: SampleWithPack[];
  packId?: string;
  canDownload: boolean;
  likedSampleIds?: Set<string>;
  showPackName?: boolean;
  hasUsedTrial: boolean;
  isLoggedIn: boolean;
}

export function SampleListWithModal({
  samples,
  packId,
  canDownload,
  likedSampleIds,
  showPackName,
  hasUsedTrial,
  isLoggedIn,
}: SampleListWithModalProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <SampleList
        samples={samples}
        packId={packId}
        canDownload={canDownload}
        likedSampleIds={likedSampleIds}
        showPackName={showPackName}
        onLockedClick={canDownload ? undefined : () => setModalOpen(true)}
      />
      <PremiumModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        hasUsedTrial={hasUsedTrial}
        isLoggedIn={isLoggedIn}
      />
    </>
  );
}

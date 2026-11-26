"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  /** Lite member on a non-Lite pack: locked rows go to the upgrade page, not the sign-up modal */
  liteUpgradeHref?: string;
}

export function SampleListWithModal({
  samples,
  packId,
  canDownload,
  likedSampleIds,
  showPackName,
  hasUsedTrial,
  isLoggedIn,
  liteUpgradeHref,
}: SampleListWithModalProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <SampleList
        samples={samples}
        packId={packId}
        canDownload={canDownload}
        likedSampleIds={likedSampleIds}
        showPackName={showPackName}
        onLockedClick={canDownload ? undefined : liteUpgradeHref ? () => router.push(liteUpgradeHref) : () => setModalOpen(true)}
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

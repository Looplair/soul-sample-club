// src/components/vault/VaultPicker.tsx
"use client";

import { useState } from "react";
import { GlassBox } from "@/components/ssc/Glass";
import { BreakRow } from "./BreakRow";
import type { DrumBreakWithStatus } from "@/types/database";

interface VaultPickerProps {
  breaks: DrumBreakWithStatus[];
  onCollect: (id: string) => void;
  onDownload: (id: string) => void;
}

// Every break in one glass box. Only one plays at a time: starting a row
// makes it active, which stops whichever row was playing before.
export function VaultPicker({ breaks, onCollect, onDownload }: VaultPickerProps) {
  const [activeBreakId, setActiveBreakId] = useState<string | null>(null);

  if (breaks.length === 0) {
    return (
      <GlassBox plain className="rounded-[24px] px-6 py-16 text-center">
        <p className="ssc-display text-[1.3rem]">The vault is empty for now</p>
        <p className="ssc-body mt-3 text-[15px]">New breaks are added regularly. Check back soon.</p>
      </GlassBox>
    );
  }

  return (
    <GlassBox plain className="rounded-[24px] p-2 sm:p-3">
      <div className="flex flex-col gap-1">
        {breaks.map((b, i) => (
          <BreakRow
            key={b.id}
            drumBreak={b}
            index={i}
            onCollect={onCollect}
            onDownload={onDownload}
            isActive={activeBreakId === b.id}
            onActivate={() => setActiveBreakId(b.id)}
          />
        ))}
      </div>
    </GlassBox>
  );
}

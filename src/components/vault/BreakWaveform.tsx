// src/components/vault/BreakWaveform.tsx
"use client";

import { useMemo } from "react";

interface BreakWaveformProps {
  peaks: number[] | null;
  seed: number;
  playedFraction: number;
  isCollected: boolean;
  onClick: () => void;
}

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateFallbackPeaks(seed: number, count = 80): number[] {
  const rng = lcg(seed);
  const raw: number[] = [];
  for (let i = 0; i < count; i++) {
    const base = 0.1 + rng() * 0.2;
    const spike = rng() > 0.65 ? 0.4 + rng() * 0.6 : rng() * 0.1;
    raw.push(base + spike);
  }
  const smoothed = raw.map((v, i) =>
    ((raw[i - 1] ?? v) + v + (raw[i + 1] ?? v)) / 3
  );
  const max = Math.max(...smoothed);
  return smoothed.map((v) => v / max);
}

export function BreakWaveform({ peaks, seed, playedFraction, isCollected, onClick }: BreakWaveformProps) {
  const normalizedPeaks = useMemo(() => {
    if (peaks && peaks.length > 0) return peaks;
    return generateFallbackPeaks(seed);
  }, [peaks, seed]);

  const playedCount = Math.floor(normalizedPeaks.length * playedFraction);

  return (
    <div
      className="flex-1 flex items-center overflow-hidden cursor-pointer"
      style={{ height: 48, justifyContent: "space-between" }}
      onClick={onClick}
    >
      {normalizedPeaks.map((p, i) => {
        const height = Math.max(4, Math.round(p * 46));
        const isPlayed = i < playedCount;
        const isHead = i === playedCount;
        let bg = isCollected ? "#1E1E1E" : "#111";
        if (isPlayed) bg = "#C0C0C0";
        if (isHead) bg = "#fff";
        return (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: 3,
              height,
              background: bg,
              boxShadow: isHead ? "0 0 6px rgba(255,255,255,.5)" : undefined,
              transition: "background 0.04s",
            }}
          />
        );
      })}
    </div>
  );
}

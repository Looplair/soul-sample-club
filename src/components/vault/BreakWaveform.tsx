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

// Max bars rendered — keeps each bar at least ~3px wide on mobile
const MAX_BARS = 50;

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateFallbackPeaks(seed: number, count = MAX_BARS): number[] {
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

/** Down-sample an array to at most `max` evenly-spaced values. */
function subsample(arr: number[], max: number): number[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.floor(i * step)]);
}

export function BreakWaveform({ peaks, seed, playedFraction, isCollected, onClick }: BreakWaveformProps) {
  const displayPeaks = useMemo(() => {
    const raw = peaks && peaks.length > 0 ? peaks : generateFallbackPeaks(seed);
    return subsample(raw, MAX_BARS);
  }, [peaks, seed]);

  const playedCount = Math.floor(displayPeaks.length * playedFraction);

  return (
    <div
      className="flex-1 min-w-0 overflow-hidden cursor-pointer"
      style={{
        height: 48,
        display: "grid",
        gridTemplateColumns: `repeat(${displayPeaks.length}, 1fr)`,
        gap: "1px",
        alignItems: "center",
      }}
      onClick={onClick}
    >
      {displayPeaks.map((p, i) => {
        const height = Math.max(4, Math.round(p * 46));
        const isPlayed = i < playedCount;
        const isHead = i === playedCount;
        // Brighter baseline so bars are visible against the dark #0C0C0C row background
        let bg = isCollected ? "#303030" : "#262626";
        if (isPlayed) bg = "#C0C0C0";
        if (isHead) bg = "#fff";
        return (
          <div
            key={i}
            style={{
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

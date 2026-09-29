"use client";

import { useId, useMemo } from "react";

// Integer coordinates on a 600x56 grid: same look as before, far shorter paths
const W = 600;
const H = 56;

/** Smooth, filled, mirrored waveform from stored peaks. `progress` (0 to 1) is drawn in white. */
export function SmoothWaveform({ peaks, progress = 0, className }: { peaks: number[]; progress?: number; className?: string }) {
  const id = useId();
  const clipId = `${id}c`;
  const pathId = `${id}p`;
  const path = useMemo(() => buildPath(peaks), [peaks]);
  const played = Math.min(1, Math.max(0, progress));
  // The shape is written once and reused for the played part
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <path id={pathId} d={path} />
        <clipPath id={clipId}>
          <rect width={Math.round(W * played)} height={H} />
        </clipPath>
      </defs>
      <use href={`#${pathId}`} fill="rgba(255,255,255,0.22)" />
      {played > 0 && <use href={`#${pathId}`} fill="#fff" clipPath={`url(#${clipId})`} />}
    </svg>
  );
}

function buildPath(peaks: number[], n = 84): string {
  const src = peaks.length ? peaks : Array.from({ length: n }, () => 0.5);
  const step = src.length / n;
  const vals: number[] = [];
  for (let i = 0; i < n; i++) {
    const seg = src.slice(Math.floor(i * step), Math.max(Math.floor((i + 1) * step), Math.floor(i * step) + 1));
    vals.push(Math.max(...seg.map((v) => Math.abs(v))));
  }
  // Soften, then stretch the contrast so loud masters still show their shape
  const k = [1, 3, 5, 3, 1];
  const sm = vals.map((_, i) => {
    let acc = 0;
    let wt = 0;
    k.forEach((kv, j) => {
      acc += vals[Math.min(n - 1, Math.max(0, i + j - 2))] * kv;
      wt += kv;
    });
    return acc / wt;
  });
  const lo = Math.min(...sm);
  const range = Math.max(...sm) - lo || 1;
  const mid = H / 2;
  const amps = sm.map((v) => mid * (0.12 + 0.86 * Math.pow((v - lo) / range, 1.6)));
  const xs = amps.map((_, i) => (i * W) / (n - 1));

  const curve = (pts: [number, number][]) => {
    const r = (v: number) => Math.round(v);
    let d = `M${r(pts[0][0])},${r(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${r(c1[0])},${r(c1[1])} ${r(c2[0])},${r(c2[1])} ${r(p2[0])},${r(p2[1])}`;
    }
    return d;
  };
  const top: [number, number][] = xs.map((x, i) => [x, mid - amps[i]]);
  const bottom: [number, number][] = xs.map((x, i) => [x, mid + amps[i]] as [number, number]).reverse();
  return `${curve(top)} L${curve(bottom).slice(1)} Z`;
}

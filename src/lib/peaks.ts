// Waveforms are stored at ~300 points but drawn at 120 (SmoothWaveform), so
// lists shrink them first to keep the page payload small. Max-pooling keeps
// the loud moments that give the shape its character.
export function compactPeaks(peaks: unknown, points = 120): number[] {
  if (!Array.isArray(peaks) || peaks.length === 0) return [];
  if (peaks.length <= points) return peaks.map((v) => Math.round(Math.abs(Number(v)) * 1000) / 1000);
  const step = peaks.length / points;
  return Array.from({ length: points }, (_, i) => {
    const slice = peaks.slice(Math.floor(i * step), Math.max(Math.floor((i + 1) * step), Math.floor(i * step) + 1));
    return Math.round(Math.max(...slice.map((v) => Math.abs(Number(v)))) * 1000) / 1000;
  });
}

"use client";

import { Loader2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudio } from "@/contexts/AudioContext";
import { usePreviewPlayer } from "@/components/audio/usePreviewPlayer";
import { SmoothWaveform } from "@/components/free-pack/SmoothWaveform";

export interface ListTrack {
  id: string;
  name: string;
  bpm: number | null;
  key: string | null;
  duration: number | null;
  peaks: number[];
}

const shortKey = (key: string | null) => key?.replace(/\s*minor$/i, "m").replace(/\s*major$/i, "") ?? null;

/** Pack tracklist: play button, name, smooth waveform with progress, BPM and key */
export function TrackList({ tracks, packName, className }: { tracks: ListTrack[]; packName: string; className?: string }) {
  const player = usePreviewPlayer();
  const { currentTrack, currentTime, duration } = useAudio();

  return (
    <ol className={cn("flex flex-col", className)}>
      {tracks.map((t, i) => {
        const isCurrent = currentTrack?.id === t.id;
        const playing = player.isTrackPlaying(t.id);
        return (
          <li
            key={t.id}
            className={cn(
              "grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl px-3 py-3 transition-colors sm:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,2fr)_auto]",
              isCurrent ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
            )}
          >
            <button
              type="button"
              onClick={() => player.toggle({ id: t.id, name: t.name, packName, bpm: t.bpm, key: t.key, duration: t.duration })}
              aria-label={playing ? `Pause ${t.name}` : `Play ${t.name}`}
              className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors",
                playing ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              {player.loadingId === t.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : playing ? (
                <Pause className="h-4 w-4" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
              )}
            </button>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold uppercase tracking-[0.02em] text-white">
                <span className="mr-2 text-white/55 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                {t.name}
              </p>
              <p className="mt-0.5 text-[12px] text-white/55 sm:hidden">
                {[t.bpm && `${t.bpm} BPM`, shortKey(t.key)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <SmoothWaveform
              peaks={t.peaks}
              progress={isCurrent && duration ? currentTime / duration : 0}
              className="col-span-2 block h-8 w-full sm:col-span-1"
            />
            <p className="hidden w-[92px] text-right text-[12px] tabular-nums text-white/55 sm:block">
              {[t.bpm && `${t.bpm} BPM`, shortKey(t.key)].filter(Boolean).join(" · ")}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

// src/components/vault/BreakRow.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Check, Download, Loader2, Pause, Play, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BreakWaveform } from "./BreakWaveform";
import type { DrumBreakWithStatus } from "@/types/database";

interface BreakRowProps {
  drumBreak: DrumBreakWithStatus;
  index: number;
  onCollect: (id: string) => void;
  onDownload: (id: string) => void;
  isActive: boolean;
  onActivate: () => void;
}

export function BreakRow({ drumBreak, index, onCollect, onDownload, isActive, onActivate }: BreakRowProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playedFraction, setPlayedFraction] = useState(0);
  const [isSweeping, setIsSweeping] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      audioRef.current?.pause();
    };
  }, []);

  // Another break became active — stop this one
  useEffect(() => {
    if (!isActive && isPlaying) {
      audioRef.current?.pause();
      cancelAnimationFrame(rafRef.current);
      setIsPlaying(false);
    }
  }, [isActive, isPlaying]);

  const startRaf = useCallback(() => {
    const tick = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (!audio.duration) { rafRef.current = requestAnimationFrame(tick); return; }
      setPlayedFraction(audio.currentTime / audio.duration);
      if (!audio.paused && !audio.ended) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const handlePlay = useCallback(async () => {
    // Ignore extra clicks while loading
    if (isLoading) return;

    // Currently playing → pause (keep position)
    if (isPlaying) {
      audioRef.current?.pause();
      cancelAnimationFrame(rafRef.current);
      setIsPlaying(false);
      return;
    }

    // Audio loaded and paused mid-way → resume
    const audio = audioRef.current;
    if (audio && !audio.ended && audio.currentTime > 0) {
      onActivate();
      audio.play().catch(console.error);
      setIsPlaying(true);
      startRaf();
      return;
    }

    // Fresh start — fetch preview URL then play
    onActivate();
    setIsLoading(true);
    try {
      const res = await fetch(`/api/drum-vault/${drumBreak.id}/preview`);
      if (!res.ok) return;
      const { url } = await res.json();

      const newAudio = new Audio(url);
      audioRef.current = newAudio;

      newAudio.onended = () => {
        setIsPlaying(false);
        setPlayedFraction(0);
        cancelAnimationFrame(rafRef.current);
      };

      await newAudio.play();
      setIsLoading(false);
      setIsPlaying(true);
      startRaf();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isPlaying, startRaf, drumBreak.id, onActivate]);

  const handleCollect = useCallback(() => {
    if (drumBreak.is_collected) return;
    setIsSweeping(true);
    setTimeout(() => setIsSweeping(false), 600);
    onCollect(drumBreak.id);
  }, [drumBreak.is_collected, drumBreak.id, onCollect]);

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-2xl px-2 py-3 transition-colors sm:gap-4 sm:px-4",
        isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
      )}
    >
      {/* Sweep layer: a quick sheen across the row when a break is collected */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,.14) 50%, transparent 80%)",
          transform: isSweeping ? "translateX(200%)" : "translateX(-100%)",
          transition: isSweeping ? "transform .5s cubic-bezier(.4,0,.2,1)" : "none",
        }}
      />

      {/* Row number */}
      <span className="hidden w-7 flex-shrink-0 text-right text-[12px] font-semibold tabular-nums text-white/55 sm:block">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Play button */}
      <button
        type="button"
        onClick={handlePlay}
        aria-label={isPlaying ? `Pause ${drumBreak.name}` : `Play ${drumBreak.name}`}
        className={cn(
          "relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors",
          isPlaying ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" fill="currentColor" />
        ) : (
          <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
        )}
      </button>

      {/* Info */}
      <div className="relative w-[92px] flex-shrink-0 sm:w-[190px] lg:w-[220px]">
        <p className="truncate text-[13px] font-semibold uppercase tracking-[0.02em] text-white sm:text-[14px]">
          {drumBreak.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {drumBreak.bpm ? <span className="text-[12px] tabular-nums text-white/55">{drumBreak.bpm} BPM</span> : null}
          {drumBreak.is_new ? (
            <span className="rounded-full bg-white px-2 py-[3px] text-[9px] font-bold uppercase tracking-[0.16em] text-black">New</span>
          ) : drumBreak.is_exclusive ? (
            <span className="rounded-full border border-white/15 px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.16em] text-white/75">
              Exclusive
            </span>
          ) : null}
          {drumBreak.is_collected && (
            <span className="hidden items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75 sm:inline-flex">
              <Check className="h-3 w-3" />
              Yours
            </span>
          )}
        </div>
      </div>

      {/* Waveform */}
      <BreakWaveform
        peaks={drumBreak.waveform_peaks}
        seed={(index + 1) * 6113 + 9}
        playedFraction={playedFraction}
        isCollected={drumBreak.is_collected}
        onClick={handlePlay}
      />

      {/* Collect / Download button */}
      {drumBreak.is_collected ? (
        <button
          type="button"
          onClick={() => onDownload(drumBreak.id)}
          aria-label={`Download ${drumBreak.name}`}
          className="relative flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.04] px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-white/35 sm:px-5"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Download</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleCollect}
          aria-label={`Collect ${drumBreak.name}`}
          className="relative flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-full bg-white px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-black transition-colors hover:bg-white/85 active:scale-[0.97] sm:px-5"
        >
          <Plus className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">Collect</span>
        </button>
      )}
    </div>
  );
}

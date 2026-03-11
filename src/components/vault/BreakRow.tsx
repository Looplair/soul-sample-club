// src/components/vault/BreakRow.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
      className="flex items-center gap-3 sm:gap-5 relative overflow-hidden"
      style={{
        padding: "18px 0",
        borderBottom: "1px solid #111",
        background: "#0C0C0C",
        scrollSnapAlign: "center",
        transformOrigin: "center center",
        willChange: "transform, opacity",
        transition: "transform 0.12s cubic-bezier(.4,0,.2,1), opacity 0.12s cubic-bezier(.4,0,.2,1)",
      }}
    >
      {/* Sweep layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,.15) 50%, transparent 80%)",
          transform: isSweeping ? "translateX(200%)" : "translateX(-100%)",
          transition: isSweeping ? "transform .5s cubic-bezier(.4,0,.2,1)" : "none",
        }}
      />

      {/* Row number */}
      <div
        className="hidden sm:block flex-shrink-0 text-right font-black"
        style={{ width: 32, fontSize: 18, color: "#1C1C1C", letterSpacing: "-0.03em" }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Info */}
      <div className="flex-shrink-0 w-[82px] sm:w-[120px]">
        <div className="text-[11px] sm:text-[13px] font-semibold truncate" style={{ color: drumBreak.is_collected ? "#aaa" : "#888" }}>
          {drumBreak.name}
        </div>
        <div className="text-[11px] font-medium mt-0.5" style={{ color: "#444" }}>
          {drumBreak.bpm} BPM
        </div>
        {drumBreak.is_new && (
          <div className="text-[9px] font-bold uppercase tracking-[0.1em] rounded px-1.5 py-0.5 w-fit mt-1"
            style={{ color: "#4ade80", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)" }}>
            New
          </div>
        )}
        {drumBreak.is_exclusive && !drumBreak.is_new && (
          <div className="text-[9px] font-bold uppercase tracking-[0.1em] rounded px-1.5 py-0.5 w-fit mt-1"
            style={{ color: "#C0A860", background: "#C0A8600E", border: "1px solid #C0A86020" }}>
            Exclusive
          </div>
        )}
      </div>

      {/* Play button */}
      <button
        onClick={handlePlay}
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{ width: 32, height: 32, border: "1px solid #1E1E1E", background: "#111" }}
      >
        {isLoading ? (
          <div
            className="rounded-full border-t-white"
            style={{
              width: 12, height: 12,
              border: "1.5px solid rgba(255,255,255,0.2)",
              borderTopColor: "#fff",
              animation: "spin 0.7s linear infinite",
            }}
          />
        ) : isPlaying ? (
          <div className="flex gap-0.5">
            <div className="bg-white rounded-sm" style={{ width: 2.5, height: 9 }} />
            <div className="bg-white rounded-sm" style={{ width: 2.5, height: 9 }} />
          </div>
        ) : (
          <div style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "4px 0 4px 8px",
            borderColor: "transparent transparent transparent #555", marginLeft: 2 }} />
        )}
      </button>

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
          onClick={() => onDownload(drumBreak.id)}
          className="flex-shrink-0 text-[12px] font-semibold px-2 sm:px-5 py-2 rounded-lg"
          style={{ color: "#22c55e", border: "1px solid #22c55e18", background: "transparent",
            letterSpacing: "0.05em", whiteSpace: "nowrap" }}
        >
          <span className="sm:hidden">↓</span>
          <span className="hidden sm:inline">↓ Download</span>
        </button>
      ) : (
        <button
          onClick={handleCollect}
          className="flex-shrink-0 text-[12px] font-semibold px-2 sm:px-5 py-2 rounded-lg transition-all"
          style={{ color: "#666", border: "1px solid #2A2A2A", background: "transparent",
            letterSpacing: "0.05em", whiteSpace: "nowrap",
            boxShadow: "inset 0 0 12px rgba(255,255,255,0.03), 0 0 0 1px transparent" }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget;
            btn.style.background = "#fff";
            btn.style.color = "#000";
            btn.style.borderColor = "#fff";
            btn.style.boxShadow = "0 0 18px rgba(255,255,255,0.25)";
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget;
            btn.style.background = "transparent";
            btn.style.color = "#666";
            btn.style.borderColor = "#2A2A2A";
            btn.style.boxShadow = "inset 0 0 12px rgba(255,255,255,0.03), 0 0 0 1px transparent";
          }}
        >
          Collect
        </button>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

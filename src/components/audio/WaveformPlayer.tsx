"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";

interface WaveformPlayerProps {
  url: string;
  sampleName: string;
  bpm?: number | null;
  musicalKey?: string | null;
  duration: number;
  isActive: boolean;
  onPlay: () => void;
  onEnded?: () => void;
}

export function WaveformPlayer({
  url,
  sampleName,
  bpm,
  musicalKey,
  duration,
  isActive,
  onPlay,
  onEnded,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize WaveSurfer with Tracklib-style monochrome waveform
  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#3F3F46", // Grey unplayed - matches waveform.unplayed
      progressColor: "#8B5CF6", // Purple played - matches waveform.played
      cursorColor: "#A78BFA", // Purple-light cursor - matches waveform.cursor
      cursorWidth: 2,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 56,
      normalize: true,
      backend: "WebAudio",
    });

    wavesurferRef.current = wavesurfer;

    wavesurfer.on("ready", () => {
      setIsReady(true);
      setIsLoading(false);
    });

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    });

    wavesurfer.on("timeupdate", (time) => {
      setCurrentTime(time);
    });

    wavesurfer.on("error", (error) => {
      console.error("WaveSurfer error:", error);
      setIsLoading(false);
    });

    wavesurfer.load(url);

    return () => {
      wavesurfer.destroy();
    };
  }, [url, onEnded]);

  // Handle active state changes (pause when another player starts)
  useEffect(() => {
    if (!isActive && isPlaying && wavesurferRef.current) {
      wavesurferRef.current.pause();
    }
  }, [isActive, isPlaying]);

  const handlePlayPause = useCallback(() => {
    if (!wavesurferRef.current || !isReady) return;

    if (isPlaying) {
      wavesurferRef.current.pause();
    } else {
      onPlay();
      wavesurferRef.current.play();
    }
  }, [isPlaying, isReady, onPlay]);

  const handleMuteToggle = useCallback(() => {
    if (!wavesurferRef.current) return;
    const newMuted = !isMuted;
    wavesurferRef.current.setVolume(newMuted ? 0 : 1);
    setIsMuted(newMuted);
  }, [isMuted]);

  return (
    <div className="player-bar group">
      {/* Play Button - Premium purple with glow */}
      <button
        onClick={handlePlayPause}
        disabled={!isReady}
        className={cn(
          "player-button flex-shrink-0",
          isPlaying && "shadow-glow-purple"
        )}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4 text-white" />
        ) : (
          <Play className="w-4 h-4 text-white ml-0.5" />
        )}
      </button>

      {/* Waveform Container */}
      <div className="flex-1 min-w-0">
        <div
          ref={containerRef}
          className={cn(
            "w-full transition-opacity duration-300",
            !isReady && "opacity-40"
          )}
        />
      </div>

      {/* Time Display */}
      <div className="text-label text-text-muted tabular-nums flex-shrink-0 w-24 text-right">
        <span className="text-white">{formatDuration(currentTime)}</span>
        <span className="text-text-subtle"> / {formatDuration(duration)}</span>
      </div>

      {/* Metadata - Clean minimal badges */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        {bpm && (
          <span className="px-2 py-1 rounded-md bg-grey-800 text-caption text-text-muted">
            {bpm} BPM
          </span>
        )}
        {musicalKey && (
          <span className="px-2 py-1 rounded-md bg-grey-800 text-caption text-text-muted">
            {musicalKey}
          </span>
        )}
      </div>

      {/* Volume Toggle */}
      <button
        onClick={handleMuteToggle}
        className="btn-icon flex-shrink-0"
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

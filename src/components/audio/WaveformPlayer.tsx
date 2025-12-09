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

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#2A2C31",
      progressColor: "#4AE3B5",
      cursorColor: "#6D4AFF",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 48,
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
      {/* Play Button */}
      <button
        onClick={handlePlayPause}
        disabled={!isReady}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0",
          isReady
            ? "bg-velvet hover:bg-velvet-light hover:shadow-glow"
            : "bg-steel cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-snow/30 border-t-snow rounded-full animate-spin" />
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
            "w-full transition-opacity",
            !isReady && "opacity-50"
          )}
        />
      </div>

      {/* Time Display */}
      <div className="text-label text-snow/50 tabular-nums flex-shrink-0 w-24 text-right">
        {formatDuration(currentTime)} / {formatDuration(duration)}
      </div>

      {/* Metadata */}
      <div className="hidden sm:flex items-center gap-12 text-label text-snow/50 flex-shrink-0">
        {bpm && <span>{bpm} BPM</span>}
        {musicalKey && <span>{musicalKey}</span>}
      </div>

      {/* Volume Toggle */}
      <button
        onClick={handleMuteToggle}
        className="text-snow/50 hover:text-snow transition-colors flex-shrink-0"
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

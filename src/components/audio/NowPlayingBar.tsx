"use client";

import { useAudio } from "@/contexts/AudioContext";
import { Play, Pause, X, Volume2, VolumeX, Loader2 } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { cn, formatDuration } from "@/lib/utils";

export function NowPlayingBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    error,
    pause,
    resume,
    stop,
    seek,
    setVolume,
  } = useAudio();

  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showBar, setShowBar] = useState(false);

  // Show/hide bar with animation
  useEffect(() => {
    if (currentTrack) {
      setShowBar(true);
    } else {
      // Delay hide to allow for exit animation
      const timer = setTimeout(() => setShowBar(false), 300);
      return () => clearTimeout(timer);
    }
  }, [currentTrack]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, pause, resume]);

  const handleMuteToggle = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    setVolume(newMuted ? 0 : 1);
  }, [isMuted, setVolume]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Ensure we're getting the correct element's bounds
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = percent * duration;
      console.log("Progress bar clicked:", { clickX, rectWidth: rect.width, percent, newTime, duration });
      seek(newTime);
    },
    [duration, seek]
  );

  const handleProgressDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = percent * duration;
      seek(newTime);
    },
    [isDragging, duration, seek]
  );

  // Touch handler for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
      const newTime = percent * duration;
      seek(newTime);
    },
    [duration, seek]
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!showBar) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out",
        currentTrack ? "translate-y-0" : "translate-y-full"
      )}
    >
      {/* Progress bar - full width at top of bar with larger click area */}
      <div
        className="relative h-1 bg-grey-700 cursor-pointer group"
        onClick={handleProgressClick}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleProgressDrag}
        onTouchStart={handleTouchStart}
      >
        {/* Invisible expanded click area for easier interaction */}
        <div className="absolute -top-2 -bottom-2 left-0 right-0" />
        {/* Visible progress indicator - no transition for instant sync with ball */}
        <div
          className="h-full bg-white group-hover:bg-white/90 relative z-10"
          style={{ width: `${progress}%` }}
        />
        {/* Hover indicator dot at current position */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      {/* Main bar content */}
      <div className="bg-charcoal-elevated/95 backdrop-blur-xl border-t border-grey-700">
        <div className="container-app">
          <div className="h-16 sm:h-18 flex items-center gap-3 sm:gap-4">
            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              disabled={isLoading}
              className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center",
                "bg-white text-charcoal flex-shrink-0",
                "transition-all duration-200",
                "hover:shadow-glow-white-soft hover:scale-105",
                "active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
              )}
            </button>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="text-body font-medium text-white truncate">
                  {currentTrack?.name || "No track playing"}
                </span>
                {currentTrack?.packName && (
                  <span className="text-caption text-text-muted truncate hidden sm:block">
                    {currentTrack.packName}
                  </span>
                )}
              </div>
              {error && (
                <span className="text-caption text-error">{error}</span>
              )}
              {!error && currentTrack?.packName && (
                <span className="text-caption text-text-muted truncate sm:hidden">
                  {currentTrack.packName}
                </span>
              )}
            </div>

            {/* Time Display - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1 text-caption text-text-muted tabular-nums flex-shrink-0">
              <span className="text-white">{formatDuration(currentTime)}</span>
              <span>/</span>
              <span>{formatDuration(duration)}</span>
            </div>

            {/* Volume Toggle - hidden on mobile */}
            <button
              onClick={handleMuteToggle}
              className="hidden sm:flex btn-icon flex-shrink-0"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-text-muted hover:text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-text-muted hover:text-white" />
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={stop}
              className="btn-icon flex-shrink-0"
              aria-label="Close player"
            >
              <X className="w-5 h-5 text-text-muted hover:text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

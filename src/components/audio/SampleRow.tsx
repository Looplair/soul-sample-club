"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Download, Loader2, Lock, Archive, Heart, Play, Pause } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui";
import { formatFileSize, formatDuration, cn } from "@/lib/utils";
import { useAudio } from "@/contexts/AudioContext";
import type { Sample } from "@/types/database";

interface SampleRowProps {
  sample: Sample;
  index: number;
  canDownload: boolean;
  isLiked?: boolean;
  onToggleLike?: () => void;
  packName?: string;
}

export function SampleRow({
  sample,
  index,
  canDownload,
  isLiked = false,
  onToggleLike,
  packName,
}: SampleRowProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingStems, setIsDownloadingStems] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [liked, setLiked] = useState(isLiked);

  // WaveSurfer state
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [waveformReady, setWaveformReady] = useState(false);
  const [waveformLoading, setWaveformLoading] = useState(false);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);

  // Lazy loading - only load waveform when visible or user requests play
  const [isVisible, setIsVisible] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  // Track ID ref for stable comparisons in callbacks
  const sampleIdRef = useRef(sample.id);
  sampleIdRef.current = sample.id;

  const {
    currentTrack,
    playTrack,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    registerWaveSurfer,
    unregisterWaveSurfer,
  } = useAudio();

  const isCurrentTrack = currentTrack?.id === sample.id;
  const isThisPlaying = isCurrentTrack && localIsPlaying;

  // Set preview URL to streaming endpoint (bypasses CORS issues)
  useEffect(() => {
    setPreviewUrl(`/api/preview/${sample.id}?stream=true`);
    setIsLoadingPreview(false);
  }, [sample.id]);

  // Intersection Observer for lazy loading - trigger load when row becomes visible
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Small delay before loading to prioritize visible content
            setTimeout(() => {
              setShouldLoad(true);
            }, 100 + index * 50); // Stagger loading based on index
          }
        });
      },
      {
        root: null,
        rootMargin: "100px", // Start loading slightly before visible
        threshold: 0.1,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [index]);

  // Initialize WaveSurfer only when shouldLoad is true (lazy loading)
  useEffect(() => {
    if (!containerRef.current || !previewUrl || !shouldLoad) {
      return;
    }

    // Clean up any existing instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    setWaveformLoading(true);
    setWaveformReady(false);

    // Clean up previous audio element if it exists
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    // Create an audio element for WaveSurfer
    const audio = new Audio();
    audioRef.current = audio;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#3A3A3A",
      progressColor: "#FFFFFF",
      cursorColor: "#FFFFFF",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 48,
      normalize: true,
      backend: "MediaElement",
      media: audio,
    });

    wavesurferRef.current = wavesurfer;

    const handleReady = () => {
      setWaveformReady(true);
      setWaveformLoading(false);

      // Register this WaveSurfer with the global context
      registerWaveSurfer(sampleIdRef.current, {
        play: () => wavesurfer.play(),
        pause: () => wavesurfer.pause(),
        seek: (time: number) => {
          const dur = wavesurfer.getDuration();
          if (dur > 0) {
            wavesurfer.seekTo(time / dur);
          }
        },
        setVolume: (vol: number) => wavesurfer.setVolume(vol),
      });
    };

    const handlePlay = () => {
      setLocalIsPlaying(true);
      setIsPlaying(true);
    };

    const handlePause = () => {
      setLocalIsPlaying(false);
      setIsPlaying(false);
    };

    const handleFinish = () => {
      setLocalIsPlaying(false);
      setLocalCurrentTime(0);
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleTimeUpdate = (time: number) => {
      setLocalCurrentTime(time);
      setCurrentTime(time);
    };

    const handleError = (error: Error) => {
      console.error("WaveSurfer error for sample:", sampleIdRef.current, "Error:", error);
      setWaveformLoading(false);
      setPreviewError("Failed to load waveform");
    };

    wavesurfer.on("ready", handleReady);
    wavesurfer.on("play", handlePlay);
    wavesurfer.on("pause", handlePause);
    wavesurfer.on("finish", handleFinish);
    wavesurfer.on("timeupdate", handleTimeUpdate);
    wavesurfer.on("error", handleError);

    wavesurfer.load(previewUrl);

    return () => {
      unregisterWaveSurfer(sampleIdRef.current);
      wavesurfer.un("ready", handleReady);
      wavesurfer.un("play", handlePlay);
      wavesurfer.un("pause", handlePause);
      wavesurfer.un("finish", handleFinish);
      wavesurfer.un("timeupdate", handleTimeUpdate);
      wavesurfer.un("error", handleError);

      // Stop and clean up the audio element BEFORE destroying WaveSurfer
      if (audio) {
        audio.pause();
        audio.src = "";
      }

      wavesurfer.destroy();
      wavesurferRef.current = null;
      audioRef.current = null;
    };
  }, [previewUrl, shouldLoad, registerWaveSurfer, unregisterWaveSurfer, setIsPlaying, setCurrentTime]);

  // Pause this wavesurfer when another track becomes current
  useEffect(() => {
    if (currentTrack && currentTrack.id !== sample.id && wavesurferRef.current && localIsPlaying) {
      wavesurferRef.current.pause();
      setLocalIsPlaying(false);
    }
  }, [currentTrack, sample.id, localIsPlaying]);

  const handlePlayPause = useCallback(() => {
    // If waveform isn't loaded yet, trigger load immediately
    if (!shouldLoad) {
      setShouldLoad(true);
      return; // Wait for waveform to load, user can click again
    }

    if (!wavesurferRef.current || !waveformReady) return;

    if (localIsPlaying) {
      wavesurferRef.current.pause();
    } else {
      // Set this as the current track (this will pause others via playTrack)
      playTrack({
        id: sample.id,
        name: sample.name,
        packName,
        url: previewUrl || "",
        duration: sample.duration,
        bpm: sample.bpm,
        musicalKey: sample.key,
      });

      // Update duration in global context
      const actualDuration = wavesurferRef.current.getDuration();
      if (actualDuration > 0) {
        setDuration(actualDuration);
      }

      // Then play our WaveSurfer
      wavesurferRef.current.play();
    }
  }, [localIsPlaying, waveformReady, shouldLoad, playTrack, setDuration, sample, packName, previewUrl]);

  const handleDownload = async () => {
  if (!canDownload) return;

  setIsDownloading(true);
  try {
    const response = await fetch(`/api/download/${sample.id}`);
    if (!response.ok) {
      throw new Error("Download failed");
    }

    const data = await response.json();

    // ✅ DESKTOP APP PATH (Electron only)
    if (typeof window !== "undefined" && (window as any).sscDesktop) {
      await (window as any).sscDesktop.downloadFile({
        url: data.url,
        packName: packName || "Unknown Pack",
        fileName: sample.name + ".wav",
      });
      return;
    }

    // ✅ WEB BROWSER PATH (unchanged)
    const fileResponse = await fetch(data.url);
    const blob = await fileResponse.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = sample.name + ".wav";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download error:", error);
  } finally {
    setIsDownloading(false);
  }
}

const handleDownloadStems = async () => {
  if (!canDownload || !sample.stems_path) return;

  setIsDownloadingStems(true);
  try {
    const response = await fetch(`/api/download/${sample.id}/stems`);
    if (!response.ok) {
      throw new Error("Stems download failed");
    }

    const data = await response.json();

    // ✅ DESKTOP APP PATH (Electron only)
    if (typeof window !== "undefined" && (window as any).sscDesktop) {
      await (window as any).sscDesktop.downloadFile({
        url: data.url,
        packName: packName || "Unknown Pack",
        fileName: sample.name + "-stems.zip",
      });
      return;
    }

    // ✅ WEB BROWSER PATH (unchanged)
    const fileResponse = await fetch(data.url);
    const blob = await fileResponse.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = sample.name + "-stems.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Stems download error:", error);
  } finally {
    setIsDownloadingStems(false);
  }
};


  const handleToggleLike = async () => {
    if (!onToggleLike) return;

    setLiked(!liked);

    try {
      const response = await fetch(`/api/likes/${sample.id}`, {
        method: liked ? "DELETE" : "POST",
      });

      if (!response.ok) {
        setLiked(liked);
      } else {
        onToggleLike();
      }
    } catch (error) {
      console.error("Like toggle error:", error);
      setLiked(liked);
    }
  };

  const canPlay = previewUrl && !isLoadingPreview && !previewError;
  const showLoading = isLoadingPreview || waveformLoading;

  return (
    <div
      className={cn(
        "bg-grey-800/50 border rounded-card p-3 sm:p-4 transition-all duration-200",
        isThisPlaying ? "border-white/30 bg-grey-800/70" : "border-grey-700 hover:border-grey-600"
      )}
    >
      {/* Top row: Info and actions */}
      <div className="flex items-center gap-2 sm:gap-4 mb-3">
        {/* Play Button */}
        <button
          onClick={handlePlayPause}
          disabled={!canPlay || !waveformReady}
          className={cn(
            "w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200",
            canPlay && waveformReady
              ? isThisPlaying
                ? "bg-white text-charcoal shadow-glow-white-soft"
                : "bg-white text-charcoal hover:shadow-glow-white-soft hover:scale-105"
              : "bg-grey-700 text-text-muted cursor-not-allowed"
          )}
        >
          {showLoading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : isThisPlaying ? (
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
          )}
        </button>

        {/* Index - hidden on mobile */}
        <span className="hidden sm:block text-label text-text-subtle w-6 text-center flex-shrink-0">
          {index.toString().padStart(2, "0")}
        </span>

        {/* Sample Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-body font-medium text-white truncate">{sample.name}</h4>
          <div className="flex items-center gap-2 sm:gap-3 text-caption text-text-muted mt-0.5 flex-wrap">
            {packName && (
              <span className="text-text-secondary truncate max-w-[100px] sm:max-w-none">
                {packName}
              </span>
            )}
            <span className="hidden sm:inline">{formatFileSize(sample.file_size)}</span>
            <span>{formatDuration(sample.duration)}</span>
            {sample.bpm && <span className="hidden sm:inline">{sample.bpm} BPM</span>}
            {sample.key && <span className="hidden sm:inline">{sample.key}</span>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Like Button */}
          {onToggleLike && (
            <button
              onClick={handleToggleLike}
              className={cn(
                "p-1.5 sm:p-2 rounded-full transition-colors",
                liked
                  ? "text-error hover:bg-error/10"
                  : "text-text-muted hover:text-white hover:bg-grey-700"
              )}
              aria-label={liked ? "Unlike" : "Like"}
            >
              <Heart className={cn("w-4 h-4 sm:w-5 sm:h-5", liked && "fill-current")} />
            </button>
          )}

          {/* Stems Button - always visible, icon-only on mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadStems}
            disabled={isDownloadingStems || !canDownload || !sample.stems_path}
            className="flex"
            leftIcon={
              isDownloadingStems ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : !sample.stems_path ? (
                <Archive className="w-4 h-4 opacity-40" />
              ) : !canDownload ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Archive className="w-4 h-4" />
              )
            }
            title={
              !sample.stems_path
                ? "No stems available"
                : !canDownload
                ? "Subscribe to download stems"
                : "Download stems"
            }
          >
            <span className="hidden sm:inline">Stems</span>
          </Button>

          {/* Download Button */}
          <Button
            variant={canDownload ? "secondary" : "ghost"}
            size="sm"
            onClick={handleDownload}
            disabled={!canDownload || isDownloading}
            leftIcon={
              isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : canDownload ? (
                <Download className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )
            }
          >
            <span className="hidden sm:inline">{canDownload ? "Download" : "Locked"}</span>
          </Button>
        </div>
      </div>

      {/* Waveform row - WaveSurfer */}
      {canPlay ? (
        <div className="flex items-center gap-3">
          <div
            ref={containerRef}
            className={cn(
              "flex-1 transition-opacity duration-300 min-h-[48px]",
              !waveformReady && "opacity-40"
            )}
          />
          <div className="text-caption text-text-muted tabular-nums flex-shrink-0 w-20 text-right">
            <span className="text-white">{formatDuration(localCurrentTime)}</span>
            <span className="text-text-subtle"> / {formatDuration(sample.duration)}</span>
          </div>
        </div>
      ) : isLoadingPreview ? (
        <div className="h-12 bg-grey-700/50 rounded animate-pulse" />
      ) : previewError ? (
        <div className="h-12 flex items-center text-caption text-error">{previewError}</div>
      ) : null}
    </div>
  );
}

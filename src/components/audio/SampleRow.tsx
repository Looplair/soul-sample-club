"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Loader2, Lock, Music, Archive, Heart, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui";
import { formatFileSize, formatDuration } from "@/lib/utils";
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

  const { currentTrack, isPlaying, isLoading: audioLoading, playTrack, pause, resume } = useAudio();

  const isCurrentTrack = currentTrack?.id === sample.id;
  const isThisPlaying = isCurrentTrack && isPlaying;

  // Fetch preview URL with better error handling
  useEffect(() => {
    let isMounted = true;

    async function fetchPreview() {
      setIsLoadingPreview(true);
      setPreviewError(null);

      try {
        const response = await fetch(`/api/preview/${sample.id}`);

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            // Validate URL format
            try {
              new URL(data.url);
              setPreviewUrl(data.url);
            } catch {
              setPreviewError("Invalid audio URL");
            }
          } else {
            setPreviewError("No preview available");
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Preview fetch failed:", response.status, errorData);
          setPreviewError(errorData.error || "Failed to load preview");
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error fetching preview:", error);
        setPreviewError("Network error");
      } finally {
        if (isMounted) {
          setIsLoadingPreview(false);
        }
      }
    }

    fetchPreview();

    return () => {
      isMounted = false;
    };
  }, [sample.id]);

  const handlePlayPause = useCallback(() => {
    if (!previewUrl) return;

    if (isCurrentTrack) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      playTrack({
        id: sample.id,
        name: sample.name,
        packName,
        url: previewUrl,
        duration: sample.duration,
        bpm: sample.bpm,
        musicalKey: sample.key,
      });
    }
  }, [previewUrl, isCurrentTrack, isPlaying, pause, resume, playTrack, sample, packName]);

  const handleDownload = async () => {
    if (!canDownload) return;

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/download/${sample.id}`);
      if (!response.ok) {
        throw new Error("Download failed");
      }

      const data = await response.json();

      const link = document.createElement("a");
      link.href = data.url;
      link.download = sample.name + ".wav";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadStems = async () => {
    if (!canDownload || !sample.stems_path) return;

    setIsDownloadingStems(true);
    try {
      const response = await fetch(`/api/download/${sample.id}/stems`);
      if (!response.ok) {
        throw new Error("Stems download failed");
      }

      const data = await response.json();

      const link = document.createElement("a");
      link.href = data.url;
      link.download = sample.name + "-stems.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
  const showLoading = isLoadingPreview || (isCurrentTrack && audioLoading);

  return (
    <div
      className={`bg-grey-800/50 border rounded-card p-3 sm:p-4 transition-all duration-200 ${
        isThisPlaying ? "border-white/30 bg-grey-800/70" : "border-grey-700 hover:border-grey-600"
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Play Button */}
        <button
          onClick={handlePlayPause}
          disabled={!canPlay}
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
            canPlay
              ? isThisPlaying
                ? "bg-white text-charcoal shadow-glow-white-soft"
                : "bg-white text-charcoal hover:shadow-glow-white-soft hover:scale-105"
              : "bg-grey-700 text-text-muted cursor-not-allowed"
          }`}
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
          <h4 className="text-body font-medium text-white truncate">
            {sample.name}
          </h4>
          <div className="flex items-center gap-2 sm:gap-3 text-caption text-text-muted mt-0.5 sm:mt-1 flex-wrap">
            {packName && (
              <span className="text-text-secondary truncate max-w-[100px] sm:max-w-none">{packName}</span>
            )}
            <span className="hidden sm:inline">{formatFileSize(sample.file_size)}</span>
            <span>{formatDuration(sample.duration)}</span>
            {sample.bpm && <span className="hidden sm:inline">{sample.bpm} BPM</span>}
            {sample.key && <span className="hidden sm:inline">{sample.key}</span>}
          </div>
          {previewError && (
            <span className="text-caption text-error mt-1 block">{previewError}</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Like Button */}
          {onToggleLike && (
            <button
              onClick={handleToggleLike}
              className={`p-1.5 sm:p-2 rounded-full transition-colors ${
                liked
                  ? "text-error hover:bg-error/10"
                  : "text-text-muted hover:text-white hover:bg-grey-700"
              }`}
              aria-label={liked ? "Unlike" : "Like"}
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${liked ? "fill-current" : ""}`} />
            </button>
          )}

          {/* Stems Button - hidden on mobile */}
          {sample.stems_path && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadStems}
              disabled={isDownloadingStems || !canDownload}
              className="hidden sm:flex"
              leftIcon={
                isDownloadingStems ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : !canDownload ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )
              }
              title={!canDownload ? "Subscribe to download stems" : "Download stems"}
            >
              Stems
            </Button>
          )}

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
            <span className="sm:hidden">{canDownload ? "" : ""}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

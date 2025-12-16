"use client";

import { useState, useEffect } from "react";
import { Download, Loader2, Lock, Music, Archive, Heart } from "lucide-react";
import { WaveformPlayer } from "./WaveformPlayer";
import { Button } from "@/components/ui";
import { formatFileSize } from "@/lib/utils";
import type { Sample } from "@/types/database";

interface SampleRowProps {
  sample: Sample;
  index: number;
  canDownload: boolean;
  isActive: boolean;
  onPlay: () => void;
  isLiked?: boolean;
  onToggleLike?: () => void;
  packName?: string;
}

export function SampleRow({
  sample,
  index,
  canDownload,
  isActive,
  onPlay,
  isLiked = false,
  onToggleLike,
  packName,
}: SampleRowProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingStems, setIsDownloadingStems] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [liked, setLiked] = useState(isLiked);

  // Fetch preview URL - now works with file_path fallback
  useEffect(() => {
    async function fetchPreview() {
      try {
        const response = await fetch(`/api/preview/${sample.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            setPreviewUrl(data.url);
          } else {
            console.error("No preview URL returned for sample:", sample.id);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Preview fetch failed:", response.status, errorData);
        }
      } catch (error) {
        console.error("Error fetching preview:", error);
      } finally {
        setIsLoadingPreview(false);
      }
    }

    fetchPreview();
  }, [sample.id]);

  const handleDownload = async () => {
    if (!canDownload) return;

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/download/${sample.id}`);
      if (!response.ok) {
        throw new Error("Download failed");
      }

      const data = await response.json();

      // Open download URL in new tab
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

    // Optimistically update UI
    setLiked(!liked);

    try {
      const response = await fetch(`/api/likes/${sample.id}`, {
        method: liked ? "DELETE" : "POST",
      });

      if (!response.ok) {
        // Revert on error
        setLiked(liked);
      } else {
        onToggleLike();
      }
    } catch (error) {
      console.error("Like toggle error:", error);
      setLiked(liked);
    }
  };

  return (
    <div className="bg-grey-800/50 border border-grey-700 rounded-card p-4 hover:border-grey-600 transition-all duration-200">
      <div className="flex items-center gap-4 mb-3">
        {/* Index */}
        <span className="text-label text-text-subtle w-8 text-center flex-shrink-0">
          {index.toString().padStart(2, "0")}
        </span>

        {/* Music Icon */}
        <Music className="w-5 h-5 text-text-muted flex-shrink-0" />

        {/* Sample Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-body font-medium text-white truncate">
            {sample.name}
          </h4>
          <div className="flex items-center gap-3 text-caption text-text-muted mt-1 flex-wrap">
            {packName && (
              <span className="text-text-secondary">{packName}</span>
            )}
            <span>{formatFileSize(sample.file_size)}</span>
            {sample.bpm && <span>{sample.bpm} BPM</span>}
            {sample.key && <span>{sample.key}</span>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Like Button */}
          {onToggleLike && (
            <button
              onClick={handleToggleLike}
              className={`p-2 rounded-full transition-colors ${
                liked
                  ? "text-error hover:bg-error/10"
                  : "text-text-muted hover:text-white hover:bg-grey-700"
              }`}
              aria-label={liked ? "Unlike" : "Like"}
            >
              <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
            </button>
          )}

          {/* Stems Button - Show for all tracks with stems */}
          {sample.stems_path && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadStems}
              disabled={isDownloadingStems || !canDownload}
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
            {canDownload ? "Download" : "Locked"}
          </Button>
        </div>
      </div>

      {/* Waveform Player */}
      {previewUrl ? (
        <WaveformPlayer
          url={previewUrl}
          sampleName={sample.name}
          bpm={sample.bpm}
          musicalKey={sample.key}
          duration={sample.duration}
          isActive={isActive}
          onPlay={onPlay}
        />
      ) : isLoadingPreview ? (
        <div className="player-bar animate-pulse">
          <div className="w-10 h-10 rounded-full bg-grey-800" />
          <div className="flex-1 h-12 bg-grey-800 rounded" />
        </div>
      ) : (
        <div className="player-bar text-text-muted text-label">
          Preview not available
        </div>
      )}
    </div>
  );
}

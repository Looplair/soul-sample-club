"use client";

import { useState, useEffect } from "react";
import { Download, Loader2, Lock } from "lucide-react";
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
}

export function SampleRow({
  sample,
  index,
  canDownload,
  isActive,
  onPlay,
}: SampleRowProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);

  // Fetch preview URL
  useEffect(() => {
    async function fetchPreview() {
      if (!sample.preview_path) {
        setIsLoadingPreview(false);
        return;
      }

      try {
        const response = await fetch(`/api/preview/${sample.id}`);
        if (response.ok) {
          const data = await response.json();
          setPreviewUrl(data.url);
        }
      } catch (error) {
        console.error("Error fetching preview:", error);
      } finally {
        setIsLoadingPreview(false);
      }
    }

    fetchPreview();
  }, [sample.id, sample.preview_path]);

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

  return (
    <div className="card p-16">
      <div className="flex items-center gap-16 mb-12">
        {/* Index */}
        <span className="text-label text-snow/30 w-8 text-center flex-shrink-0">
          {index.toString().padStart(2, "0")}
        </span>

        {/* Sample Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-body font-medium text-snow truncate">
            {sample.name}
          </h4>
          <div className="flex items-center gap-12 text-caption text-snow/50 mt-2">
            <span>{formatFileSize(sample.file_size)}</span>
            {sample.bpm && <span>{sample.bpm} BPM</span>}
            {sample.key && <span>{sample.key}</span>}
          </div>
        </div>

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
          <div className="w-10 h-10 rounded-full bg-steel" />
          <div className="flex-1 h-12 bg-steel rounded" />
        </div>
      ) : (
        <div className="player-bar text-snow/50 text-label">
          Preview not available
        </div>
      )}
    </div>
  );
}

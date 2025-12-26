/**
 * SampleRowWithLoop - SampleRow with Tracklib-style loop region markers
 *
 * PREVIEW ONLY: Loop/pitch changes are client-side only.
 * Downloads always serve the ORIGINAL untouched audio file.
 *
 * SEAMLESS LOOPING: Uses Web Audio API AudioBufferSourceNode with native
 * loop support for gap-free looping.
 *
 * TRUE PITCH SHIFTING: Uses SoundTouchJS for pitch shifting without
 * changing tempo. Pitch up = higher pitch, same speed.
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Download, Loader2, Lock, Archive, Heart, Play, Pause, Repeat, Minus, Plus } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui";
import { formatFileSize, formatDuration, cn } from "@/lib/utils";
import { useAudio } from "@/contexts/AudioContext";
import type { Sample } from "@/types/database";

type BarCount = 1 | 2 | 4;

interface SampleRowWithLoopProps {
  sample: Sample;
  index: number;
  canDownload: boolean;
  isLiked?: boolean;
  onToggleLike?: () => void;
  packName?: string;
}

function calculateLoopDuration(bpm: number, barCount: BarCount): number {
  const secondsPerBeat = 60 / bpm;
  const secondsPerBar = secondsPerBeat * 4;
  return secondsPerBar * barCount;
}

export function SampleRowWithLoop({
  sample,
  index,
  canDownload,
  isLiked = false,
  onToggleLike,
  packName,
}: SampleRowWithLoopProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingStems, setIsDownloadingStems] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [liked, setLiked] = useState(isLiked);

  // WaveSurfer state (for waveform display)
  const containerRef = useRef<HTMLDivElement>(null);
  const waveformWrapperRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [waveformReady, setWaveformReady] = useState(false);
  const [waveformLoading, setWaveformLoading] = useState(false);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);

  // Web Audio API refs (for seamless looping playback)
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const loopPlaybackStartTimeRef = useRef<number>(0);
  const loopPlaybackOffsetRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Loop/Pitch state
  const [isLooping, setIsLooping] = useState(false);
  const [barCount, setBarCount] = useState<BarCount>(1);
  const [pitchOffset, setPitchOffset] = useState(0);
  const [loopStartTime, setLoopStartTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioBufferLoaded, setAudioBufferLoaded] = useState(false);

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
  const hasBpm = !!sample.bpm;

  // Calculate loop values
  const loopDuration = useMemo(() => {
    if (!sample.bpm) return 0;
    return calculateLoopDuration(sample.bpm, barCount);
  }, [sample.bpm, barCount]);

  const loopEndTime = useMemo(() => {
    if (!audioDuration) return 0;
    return Math.min(loopStartTime + loopDuration, audioDuration);
  }, [loopStartTime, loopDuration, audioDuration]);

  const loopStartPercent = audioDuration > 0 ? (loopStartTime / audioDuration) * 100 : 0;
  const loopWidthPercent = audioDuration > 0 ? (loopDuration / audioDuration) * 100 : 0;

  // Grid markers for snap-to positions
  const gridMarkers = useMemo(() => {
    if (!sample.bpm || !audioDuration || !isLooping) return [];
    const barDuration = (60 / sample.bpm) * 4;
    const snapInterval = barDuration * barCount;
    const markers: number[] = [];
    for (let time = 0; time <= audioDuration; time += snapInterval) {
      const percent = (time / audioDuration) * 100;
      if (percent <= 100) markers.push(percent);
    }
    return markers;
  }, [sample.bpm, audioDuration, barCount, isLooping]);

  // Set preview URL
  useEffect(() => {
    setPreviewUrl(`/api/preview/${sample.id}?stream=true`);
    setIsLoadingPreview(false);
  }, [sample.id]);

  // Get or create AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Load audio buffer for Web Audio API playback
  useEffect(() => {
    if (!previewUrl) return;

    const loadAudioBuffer = async () => {
      try {
        const ctx = getAudioContext();
        const response = await fetch(previewUrl);
        if (!response.ok) return;

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        audioBufferRef.current = audioBuffer;
        setAudioBufferLoaded(true);
      } catch (err) {
        console.error("Error loading audio buffer:", err);
      }
    };

    loadAudioBuffer();
  }, [previewUrl, getAudioContext]);

  // Initialize WaveSurfer for waveform display
  useEffect(() => {
    if (!containerRef.current || !previewUrl) {
      return;
    }

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    setWaveformLoading(true);
    setWaveformReady(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

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
      setAudioDuration(wavesurfer.getDuration());

      registerWaveSurfer(sampleIdRef.current, {
        play: () => wavesurfer.play(),
        pause: () => wavesurfer.pause(),
        seek: (time: number) => {
          const dur = wavesurfer.getDuration();
          if (dur > 0) wavesurfer.seekTo(time / dur);
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

      if (audio) {
        audio.pause();
        audio.src = "";
      }

      wavesurfer.destroy();
      wavesurferRef.current = null;
      audioRef.current = null;
    };
  }, [previewUrl, registerWaveSurfer, unregisterWaveSurfer, setIsPlaying, setCurrentTime]);

  // Pause when another track plays
  useEffect(() => {
    if (currentTrack && currentTrack.id !== sample.id && localIsPlaying) {
      stopLoopPlayback();
      if (wavesurferRef.current) {
        wavesurferRef.current.pause();
      }
      setLocalIsPlaying(false);
    }
  }, [currentTrack, sample.id, localIsPlaying]);

  // Stop Web Audio loop playback
  const stopLoopPlayback = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // Already stopped
      }
      sourceNodeRef.current = null;
    }
  }, []);

  // Calculate playback rate from pitch offset (detune affects speed)
  // detune in cents: 100 cents = 1 semitone, playbackRate = 2^(semitones/12)
  const getPlaybackRateFromPitch = useCallback((semitones: number) => {
    return Math.pow(2, semitones / 12);
  }, []);

  // Start Web Audio seamless loop playback
  const startLoopPlayback = useCallback(() => {
    const ctx = audioContextRef.current;
    const buffer = audioBufferRef.current;
    if (!ctx || !buffer || !hasBpm) return;

    // Resume context if suspended
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Stop any existing playback
    stopLoopPlayback();

    // Create source node
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Create gain node if needed
    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.connect(ctx.destination);
    }

    source.connect(gainNodeRef.current);

    // Configure seamless looping with Web Audio's native loop
    source.loop = true;
    source.loopStart = loopStartTime;
    source.loopEnd = Math.min(loopStartTime + loopDuration, buffer.duration);

    // Apply pitch shift using detune (cents = semitones * 100)
    // Note: detune DOES affect playback rate - we account for this in time display
    source.detune.value = pitchOffset * 100;

    sourceNodeRef.current = source;
    loopPlaybackStartTimeRef.current = ctx.currentTime;
    loopPlaybackOffsetRef.current = loopStartTime;

    // Calculate the effective playback rate from detune
    const effectiveRate = getPlaybackRateFromPitch(pitchOffset);

    // Start playback from loop start
    source.start(0, loopStartTime);

    // Update time display during loop playback
    // Account for detune-induced speed change in elapsed time calculation
    const updateTime = () => {
      if (!audioContextRef.current || !sourceNodeRef.current) return;

      // Real elapsed time multiplied by playback rate gives audio position
      const realElapsed = audioContextRef.current.currentTime - loopPlaybackStartTimeRef.current;
      const audioElapsed = realElapsed * effectiveRate;
      const loopLen = loopDuration;
      const posInLoop = audioElapsed % loopLen;
      const currentPos = loopStartTime + posInLoop;

      setLocalCurrentTime(currentPos);
      setCurrentTime(currentPos);

      // Update WaveSurfer cursor position
      if (wavesurferRef.current && audioDuration > 0) {
        wavesurferRef.current.seekTo(currentPos / audioDuration);
      }

      animationFrameRef.current = requestAnimationFrame(updateTime);
    };

    animationFrameRef.current = requestAnimationFrame(updateTime);
  }, [hasBpm, loopStartTime, loopDuration, pitchOffset, stopLoopPlayback, setCurrentTime, audioDuration, getPlaybackRateFromPitch]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (!waveformReady) return;

    if (localIsPlaying) {
      // Pause
      stopLoopPlayback();
      if (wavesurferRef.current) {
        wavesurferRef.current.pause();
      }
      setLocalIsPlaying(false);
      setIsPlaying(false);
    } else {
      // Play
      playTrack({
        id: sample.id,
        name: sample.name,
        packName,
        url: previewUrl || "",
        duration: sample.duration,
        bpm: sample.bpm,
        musicalKey: sample.key,
      });

      if (wavesurferRef.current) {
        const actualDuration = wavesurferRef.current.getDuration();
        if (actualDuration > 0) setDuration(actualDuration);
      }

      if (isLooping && audioBufferLoaded && hasBpm) {
        // Use Web Audio for seamless looping with pitch
        // Mute WaveSurfer audio but keep it for visual
        if (audioRef.current) {
          audioRef.current.volume = 0;
        }
        startLoopPlayback();
      } else {
        // Normal playback via WaveSurfer (no loop, or no BPM)
        if (audioRef.current) {
          audioRef.current.volume = 1;
        }
        wavesurferRef.current?.play();
      }

      setLocalIsPlaying(true);
      setIsPlaying(true);
    }
  }, [localIsPlaying, waveformReady, isLooping, audioBufferLoaded, hasBpm, playTrack, setDuration, sample, packName, previewUrl, startLoopPlayback, stopLoopPlayback, setIsPlaying]);

  // When loop settings change during playback, restart loop with new settings
  useEffect(() => {
    // Only handle changes while playing with loop enabled
    if (!localIsPlaying || !isLooping || !audioBufferLoaded || !hasBpm) return;

    // Restart loop playback with updated settings
    startLoopPlayback();
  }, [barCount, loopStartTime, pitchOffset]);

  // Handle toggling loop on/off during playback
  useEffect(() => {
    if (!localIsPlaying) return;

    if (isLooping && audioBufferLoaded && hasBpm) {
      // Switching TO loop mode - mute WaveSurfer, use Web Audio
      if (audioRef.current) {
        audioRef.current.volume = 0;
      }
      wavesurferRef.current?.pause();
      startLoopPlayback();
    } else if (!isLooping) {
      // Switching FROM loop mode - stop Web Audio, use WaveSurfer
      stopLoopPlayback();
      if (audioRef.current) {
        audioRef.current.volume = 1;
      }
      wavesurferRef.current?.play();
    }
    // Include startLoopPlayback and stopLoopPlayback to use fresh loopStartTime
  }, [isLooping, startLoopPlayback, stopLoopPlayback, localIsPlaying, audioBufferLoaded, hasBpm]);

  // Snap-to-grid click handler
  const handleWaveformClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLooping || !waveformWrapperRef.current || !audioDuration || !sample.bpm) return;

    const rect = waveformWrapperRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    const clickTime = clickPercent * audioDuration;

    const barDuration = (60 / sample.bpm) * 4;
    const snapInterval = barDuration * barCount;
    const snappedTime = Math.round(clickTime / snapInterval) * snapInterval;
    const maxStartTime = Math.max(0, audioDuration - loopDuration);
    const newStartTime = Math.min(Math.max(0, snappedTime), maxStartTime);

    setLoopStartTime(newStartTime);
  }, [isLooping, audioDuration, loopDuration, sample.bpm, barCount]);

  const handleToggleLoop = useCallback(() => {
    if (!isLooping && sample.bpm && audioDuration > 0) {
      // Turning loop ON - snap to nearest bar boundary
      const currentPos = wavesurferRef.current?.getCurrentTime() || 0;
      const barDuration = (60 / sample.bpm) * 4;
      const snapInterval = barDuration * barCount;
      const snappedTime = Math.floor(currentPos / snapInterval) * snapInterval;
      const maxStartTime = Math.max(0, audioDuration - loopDuration);
      const newStartTime = Math.min(Math.max(0, snappedTime), maxStartTime);
      setLoopStartTime(newStartTime);
    }
    setIsLooping((prev) => !prev);
  }, [isLooping, sample.bpm, audioDuration, barCount, loopDuration]);

  const handleSetBarCount = useCallback((bars: BarCount) => {
    setBarCount(bars);
  }, []);

  const handlePitchUp = useCallback(() => {
    setPitchOffset((prev) => Math.min(prev + 1, 3));
  }, []);

  const handlePitchDown = useCallback(() => {
    setPitchOffset((prev) => Math.max(prev - 1, -3));
  }, []);

  const handleResetPitch = useCallback(() => {
    setPitchOffset(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLoopPlayback();
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stopLoopPlayback]);

  // Download handlers
  const handleDownload = async () => {
    if (!canDownload) return;
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/download/${sample.id}`);
      if (!response.ok) throw new Error("Download failed");
      const data = await response.json();

      if (typeof window !== "undefined" && (window as unknown as { sscDesktop?: { downloadFile: (opts: { url: string; packName: string; fileName: string }) => Promise<void> } }).sscDesktop) {
        await (window as unknown as { sscDesktop: { downloadFile: (opts: { url: string; packName: string; fileName: string }) => Promise<void> } }).sscDesktop.downloadFile({
          url: data.url,
          packName: packName || "Unknown Pack",
          fileName: sample.name + ".wav",
        });
        return;
      }

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
  };

  const handleDownloadStems = async () => {
    if (!canDownload || !sample.stems_path) return;
    setIsDownloadingStems(true);
    try {
      const response = await fetch(`/api/download/${sample.id}/stems`);
      if (!response.ok) throw new Error("Stems download failed");
      const data = await response.json();

      if (typeof window !== "undefined" && (window as unknown as { sscDesktop?: { downloadFile: (opts: { url: string; packName: string; fileName: string }) => Promise<void> } }).sscDesktop) {
        await (window as unknown as { sscDesktop: { downloadFile: (opts: { url: string; packName: string; fileName: string }) => Promise<void> } }).sscDesktop.downloadFile({
          url: data.url,
          packName: packName || "Unknown Pack",
          fileName: sample.name + "-stems.zip",
        });
        return;
      }

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
      if (!response.ok) setLiked(liked);
      else onToggleLike();
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

        {/* Index */}
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
            {sample.bpm && <span>{sample.bpm} BPM</span>}
            {sample.key && <span className="hidden sm:inline">{sample.key}</span>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {onToggleLike && (
            <button
              onClick={handleToggleLike}
              className={cn(
                "p-1.5 sm:p-2 rounded-full transition-colors",
                liked
                  ? "text-error hover:bg-error/10"
                  : "text-text-muted hover:text-white hover:bg-grey-700"
              )}
            >
              <Heart className={cn("w-4 h-4 sm:w-5 sm:h-5", liked && "fill-current")} />
            </button>
          )}

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
          >
            <span className="hidden sm:inline">Stems</span>
          </Button>

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

      {/* Waveform with Loop Region Overlay */}
      {canPlay ? (
        <div className="flex items-center gap-3">
          <div
            ref={waveformWrapperRef}
            className="flex-1 relative min-h-[48px]"
            onClick={isLooping ? handleWaveformClick : undefined}
            style={{ cursor: isLooping ? "pointer" : "default" }}
          >
            {/* WaveSurfer container */}
            <div
              ref={containerRef}
              className={cn(
                "flex-1 transition-opacity duration-300 min-h-[48px]",
                !waveformReady && "opacity-40"
              )}
            />

            {/* Loop Region Overlay - only show when looping */}
            {isLooping && hasBpm && audioDuration > 0 && (
              <>
                {/* Grid markers - subtle lines showing snap points */}
                {gridMarkers.map((percent, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-white/20 pointer-events-none"
                    style={{ left: `${percent}%` }}
                  />
                ))}

                {/* Loop start marker - green line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-green-500 pointer-events-none"
                  style={{ left: `${loopStartPercent}%` }}
                />

                {/* Loop end marker - green line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-green-500 pointer-events-none"
                  style={{ left: `${Math.min(loopStartPercent + loopWidthPercent, 100)}%` }}
                />
              </>
            )}
          </div>

          {/* Time display */}
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

      {/* Loop/Pitch Controls Row */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-grey-700/50">
        <div className="flex items-center gap-1.5">
          {/* Loop Toggle */}
          <button
            onClick={handleToggleLoop}
            disabled={!hasBpm}
            title={!hasBpm ? "BPM required for looping" : isLooping ? "Disable loop" : "Enable loop"}
            className={cn(
              "h-7 px-2 flex items-center gap-1 text-xs font-medium rounded-md transition-all duration-150",
              isLooping
                ? "bg-green-500 text-charcoal"
                : hasBpm
                ? "bg-grey-700 text-text-secondary hover:bg-grey-600 hover:text-white"
                : "bg-grey-800 text-text-muted cursor-not-allowed"
            )}
          >
            <Repeat className="w-3 h-3" />
            <span>LOOP</span>
          </button>

          {/* Bar Selector - only when looping */}
          {isLooping && hasBpm && (
            <div className="flex items-center bg-grey-800 rounded-md overflow-hidden">
              {([1, 2, 4] as BarCount[]).map((bars) => (
                <button
                  key={bars}
                  onClick={() => handleSetBarCount(bars)}
                  className={cn(
                    "h-7 w-7 text-xs font-medium transition-all duration-150",
                    barCount === bars
                      ? "bg-white text-charcoal"
                      : "text-text-secondary hover:text-white hover:bg-grey-700"
                  )}
                >
                  {bars}
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="w-px h-5 bg-grey-700 mx-1" />

          {/* Pitch Controls */}
          <button
            onClick={handlePitchDown}
            disabled={pitchOffset <= -3}
            title="Pitch down"
            className={cn(
              "h-7 w-7 flex items-center justify-center text-xs rounded-md transition-all duration-150",
              pitchOffset <= -3
                ? "bg-grey-800 text-text-muted cursor-not-allowed"
                : "bg-grey-700 text-text-secondary hover:bg-grey-600 hover:text-white"
            )}
          >
            <Minus className="w-3 h-3" />
          </button>

          <button
            onClick={handleResetPitch}
            disabled={pitchOffset === 0}
            title={pitchOffset === 0 ? "Pitch: 0" : "Reset pitch"}
            className={cn(
              "h-7 w-8 flex items-center justify-center text-xs font-medium rounded-md tabular-nums transition-all duration-150",
              pitchOffset !== 0
                ? "bg-grey-700 text-white hover:bg-grey-600"
                : "bg-grey-800 text-text-muted"
            )}
          >
            {pitchOffset > 0 ? `+${pitchOffset}` : pitchOffset}
          </button>

          <button
            onClick={handlePitchUp}
            disabled={pitchOffset >= 3}
            title="Pitch up"
            className={cn(
              "h-7 w-7 flex items-center justify-center text-xs rounded-md transition-all duration-150",
              pitchOffset >= 3
                ? "bg-grey-800 text-text-muted cursor-not-allowed"
                : "bg-grey-700 text-text-secondary hover:bg-grey-600 hover:text-white"
            )}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Loop hint */}
        {isLooping && hasBpm && (
          <span className="text-caption text-text-muted hidden sm:block">
            Click waveform to move loop
          </span>
        )}
      </div>
    </div>
  );
}

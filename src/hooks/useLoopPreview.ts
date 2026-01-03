/**
 * useLoopPreview - Preview-only audio loop and pitch system
 *
 * IMPORTANT: This is a PREVIEW tool only.
 * - Looping and pitch changes happen in the browser via Web Audio API
 * - Downloads always serve the ORIGINAL untouched audio file
 * - This never modifies any files on the server
 *
 * Inspired by Tracklib's loop/pitch preview system.
 *
 * To remove this feature:
 * 1. Delete this file
 * 2. Delete src/components/audio/LoopPreviewControls.tsx
 * 3. Remove any imports/usage from SampleRow or other components
 */

import { useRef, useState, useCallback, useEffect } from "react";

// Bar count options (musical measures in 4/4 time)
export type BarCount = 1 | 2 | 4;

// Pitch range limits (semitones) - full octave each way
const MIN_PITCH = -12;
const MAX_PITCH = 12;

interface UseLoopPreviewOptions {
  /** Audio URL to load */
  audioUrl: string;
  /** BPM of the sample (required for bar-based looping) */
  bpm: number | null;
  /** Callback when playback state changes */
  onPlayStateChange?: (isPlaying: boolean) => void;
  /** Callback when the loop ends (if not looping) */
  onEnded?: () => void;
}

interface UseLoopPreviewReturn {
  // State
  isPlaying: boolean;
  isLooping: boolean;
  barCount: BarCount;
  pitchOffset: number;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;

  // Actions
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  toggleLoop: () => void;
  setBarCount: (bars: BarCount) => void;
  pitchUp: () => void;
  pitchDown: () => void;
  resetPitch: () => void;
  seek: (time: number) => void;
  cleanup: () => void;
}

/**
 * Calculate loop duration in seconds based on BPM and bar count
 *
 * Formula (4/4 time):
 * - 1 bar = 4 beats
 * - secondsPerBeat = 60 / BPM
 * - secondsPerBar = secondsPerBeat * 4
 * - loopDuration = secondsPerBar * barCount
 *
 * Example at 90 BPM:
 * - 1 bar ≈ 2.67s
 * - 2 bars ≈ 5.33s
 * - 4 bars ≈ 10.67s
 */
function calculateLoopDuration(bpm: number, barCount: BarCount): number {
  const secondsPerBeat = 60 / bpm;
  const secondsPerBar = secondsPerBeat * 4; // Assuming 4/4 time
  return secondsPerBar * barCount;
}

/**
 * Convert semitones to playback rate
 *
 * Formula: playbackRate = 2^(semitones / 12)
 * - +1 semitone = 1.059x speed
 * - -1 semitone = 0.944x speed
 * - +12 semitones = 2x speed (octave up)
 * - -12 semitones = 0.5x speed (octave down)
 */
function semitonesToPlaybackRate(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

export function useLoopPreview({
  audioUrl,
  bpm,
  onPlayStateChange,
  onEnded,
}: UseLoopPreviewOptions): UseLoopPreviewReturn {
  // Core state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [barCount, setBarCountState] = useState<BarCount>(2);
  const [pitchOffset, setPitchOffset] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Web Audio API refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Get or create AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Load audio buffer
  const loadAudio = useCallback(async () => {
    if (!audioUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      const ctx = getAudioContext();
      const response = await fetch(audioUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      audioBufferRef.current = audioBuffer;
      setDuration(audioBuffer.duration);
      setIsLoaded(true);
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading audio for loop preview:", err);
      setError(err instanceof Error ? err.message : "Failed to load audio");
      setIsLoading(false);
    }
  }, [audioUrl, getAudioContext]);

  // Load audio when URL changes
  useEffect(() => {
    loadAudio();
  }, [loadAudio]);

  // Update current time during playback
  const updateCurrentTime = useCallback(() => {
    if (!audioContextRef.current || !isPlaying) return;

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current;
    const loopDuration = bpm && isLooping ? calculateLoopDuration(bpm, barCount) : duration;

    // Handle looping time calculation
    const currentPos = loopDuration > 0 ? elapsed % loopDuration : elapsed;
    setCurrentTime(Math.min(currentPos, duration));

    animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
  }, [isPlaying, bpm, isLooping, barCount, duration]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateCurrentTime]);

  // Create and start audio source
  const startPlayback = useCallback((fromTime: number = 0) => {
    const ctx = getAudioContext();
    const buffer = audioBufferRef.current;

    if (!buffer) return;

    // Resume context if suspended (required for browsers)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Stop any existing playback
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Source may have already stopped
      }
    }

    // Create new source node
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Create gain node if needed
    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.connect(ctx.destination);
    }

    source.connect(gainNodeRef.current);

    // Apply pitch (playback rate)
    source.playbackRate.value = semitonesToPlaybackRate(pitchOffset);

    // Configure looping
    if (isLooping && bpm) {
      const loopDuration = calculateLoopDuration(bpm, barCount);
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = Math.min(loopDuration, buffer.duration);
    } else {
      source.loop = false;
    }

    // Handle playback end (only fires when not looping)
    source.onended = () => {
      if (!source.loop) {
        setIsPlaying(false);
        setCurrentTime(0);
        pauseTimeRef.current = 0;
        onPlayStateChange?.(false);
        onEnded?.();
      }
    };

    sourceNodeRef.current = source;
    startTimeRef.current = ctx.currentTime;
    pauseTimeRef.current = fromTime;

    // Start playback
    source.start(0, fromTime);
    setIsPlaying(true);
    onPlayStateChange?.(true);
  }, [getAudioContext, pitchOffset, isLooping, bpm, barCount, onPlayStateChange, onEnded]);

  // Play
  const play = useCallback(() => {
    if (!isLoaded) return;
    startPlayback(pauseTimeRef.current);
  }, [isLoaded, startPlayback]);

  // Pause
  const pause = useCallback(() => {
    if (!sourceNodeRef.current || !audioContextRef.current) return;

    // Calculate current position
    const elapsed = audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current;
    pauseTimeRef.current = elapsed;

    try {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    } catch (e) {
      // Source may have already stopped
    }
    sourceNodeRef.current = null;

    setIsPlaying(false);
    onPlayStateChange?.(false);
  }, [onPlayStateChange]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Toggle loop
  const toggleLoop = useCallback(() => {
    const newLooping = !isLooping;
    setIsLooping(newLooping);

    // If currently playing, restart with new loop settings
    if (isPlaying && sourceNodeRef.current) {
      const currentPos = audioContextRef.current
        ? audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current
        : 0;

      pause();
      setIsLooping(newLooping); // Ensure state is set before restart

      // Small delay to ensure state update
      setTimeout(() => {
        startPlayback(currentPos);
      }, 10);
    }
  }, [isLooping, isPlaying, pause, startPlayback]);

  // Set bar count
  const setBarCount = useCallback((bars: BarCount) => {
    setBarCountState(bars);

    // If currently playing and looping, restart with new bar count
    if (isPlaying && isLooping && sourceNodeRef.current) {
      pause();
      setTimeout(() => {
        startPlayback(0); // Restart from beginning with new bar count
      }, 10);
    }
  }, [isPlaying, isLooping, pause, startPlayback]);

  // Pitch up
  const pitchUp = useCallback(() => {
    setPitchOffset((prev) => {
      const newPitch = Math.min(prev + 1, MAX_PITCH);

      // Apply immediately to playing source
      if (sourceNodeRef.current) {
        sourceNodeRef.current.playbackRate.value = semitonesToPlaybackRate(newPitch);
      }

      return newPitch;
    });
  }, []);

  // Pitch down
  const pitchDown = useCallback(() => {
    setPitchOffset((prev) => {
      const newPitch = Math.max(prev - 1, MIN_PITCH);

      // Apply immediately to playing source
      if (sourceNodeRef.current) {
        sourceNodeRef.current.playbackRate.value = semitonesToPlaybackRate(newPitch);
      }

      return newPitch;
    });
  }, []);

  // Reset pitch
  const resetPitch = useCallback(() => {
    setPitchOffset(0);

    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = 1;
    }
  }, []);

  // Seek to time
  const seek = useCallback((time: number) => {
    const wasPlaying = isPlaying;

    if (wasPlaying) {
      pause();
    }

    pauseTimeRef.current = Math.max(0, Math.min(time, duration));
    setCurrentTime(pauseTimeRef.current);

    if (wasPlaying) {
      startPlayback(pauseTimeRef.current);
    }
  }, [isPlaying, pause, startPlayback, duration]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore
      }
      sourceNodeRef.current = null;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioBufferRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
    pauseTimeRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    isPlaying,
    isLooping,
    barCount,
    pitchOffset,
    isLoaded,
    isLoading,
    error,
    currentTime,
    duration,

    // Actions
    play,
    pause,
    togglePlay,
    toggleLoop,
    setBarCount,
    pitchUp,
    pitchDown,
    resetPitch,
    seek,
    cleanup,
  };
}

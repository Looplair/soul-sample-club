"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

export interface AudioTrack {
  id: string;
  name: string;
  packName?: string;
  url: string;
  duration: number;
  bpm?: number | null;
  musicalKey?: string | null;
}

interface AudioContextState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
}

interface AudioContextActions {
  playTrack: (track: AudioTrack) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
}

type AudioContextType = AudioContextState & AudioContextActions;

const AudioContext = createContext<AudioContextType | null>(null);

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeUpdateRef = useRef<number | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";

      const audio = audioRef.current;

      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
        setIsLoading(false);
      });

      audio.addEventListener("canplay", () => {
        setIsLoading(false);
        setError(null);
      });

      audio.addEventListener("playing", () => {
        setIsPlaying(true);
        setIsLoading(false);
      });

      audio.addEventListener("pause", () => {
        setIsPlaying(false);
      });

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      audio.addEventListener("error", (e) => {
        console.error("Audio error:", e);
        setError("Failed to load audio. Please try again.");
        setIsLoading(false);
        setIsPlaying(false);
      });

      audio.addEventListener("waiting", () => {
        setIsLoading(true);
      });

      // Time update loop using requestAnimationFrame for smooth updates
      const updateTime = () => {
        if (audio && !audio.paused) {
          setCurrentTime(audio.currentTime);
        }
        timeUpdateRef.current = requestAnimationFrame(updateTime);
      };

      audio.addEventListener("play", () => {
        if (timeUpdateRef.current) {
          cancelAnimationFrame(timeUpdateRef.current);
        }
        updateTime();
      });

      audio.addEventListener("pause", () => {
        if (timeUpdateRef.current) {
          cancelAnimationFrame(timeUpdateRef.current);
        }
      });
    }

    return () => {
      if (timeUpdateRef.current) {
        cancelAnimationFrame(timeUpdateRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const playTrack = useCallback(async (track: AudioTrack) => {
    const audio = audioRef.current;
    if (!audio) return;

    // If same track, just resume
    if (currentTrack?.id === track.id && audio.src) {
      try {
        await audio.play();
        return;
      } catch (err) {
        console.error("Resume failed:", err);
      }
    }

    // Stop current playback
    audio.pause();
    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    setDuration(track.duration);

    // Validate URL before loading
    if (!track.url || !track.url.startsWith("http")) {
      setError("Invalid audio URL");
      setIsLoading(false);
      return;
    }

    // Set new track
    setCurrentTrack(track);
    audio.src = track.url;

    try {
      await audio.load();
      await audio.play();
    } catch (err) {
      console.error("Playback failed:", err);
      setError("Failed to play audio. Please try again.");
      setIsLoading(false);
    }
  }, [currentTrack]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(async () => {
    try {
      await audioRef.current?.play();
    } catch (err) {
      console.error("Resume failed:", err);
      setError("Failed to resume playback");
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrentTrack(null);
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
      setCurrentTime(audio.currentTime);
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  const value: AudioContextType = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    error,
    playTrack,
    pause,
    resume,
    stop,
    seek,
    setVolume,
  };

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
}

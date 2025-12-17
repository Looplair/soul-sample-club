"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
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
  // New methods for WaveSurfer sync
  setCurrentTrack: (track: AudioTrack | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  registerWaveSurfer: (id: string, controls: WaveSurferControls) => void;
  unregisterWaveSurfer: (id: string) => void;
}

export interface WaveSurferControls {
  play: () => void;
  pause: () => void;
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

  // Registry of WaveSurfer instances for coordination
  const waveSurferRegistry = useRef<Map<string, WaveSurferControls>>(new Map());

  const registerWaveSurfer = useCallback((id: string, controls: WaveSurferControls) => {
    waveSurferRegistry.current.set(id, controls);
  }, []);

  const unregisterWaveSurfer = useCallback((id: string) => {
    waveSurferRegistry.current.delete(id);
  }, []);

  const playTrack = useCallback((track: AudioTrack) => {
    // Pause all other WaveSurfer instances except the one being played
    waveSurferRegistry.current.forEach((controls, id) => {
      if (id !== track.id) {
        controls.pause();
      }
    });

    setCurrentTrack(track);
    setDuration(track.duration);
    setError(null);
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    if (currentTrack) {
      const controls = waveSurferRegistry.current.get(currentTrack.id);
      controls?.pause();
    }
    setIsPlaying(false);
  }, [currentTrack]);

  const resume = useCallback(() => {
    if (currentTrack) {
      const controls = waveSurferRegistry.current.get(currentTrack.id);
      controls?.play();
    }
    setIsPlaying(true);
  }, [currentTrack]);

  const stop = useCallback(() => {
    if (currentTrack) {
      const controls = waveSurferRegistry.current.get(currentTrack.id);
      controls?.pause();
      controls?.seek(0);
    }
    setCurrentTrack(null);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [currentTrack]);

  const seek = useCallback((time: number) => {
    if (currentTrack) {
      const controls = waveSurferRegistry.current.get(currentTrack.id);
      controls?.seek(time);
    }
    setCurrentTime(time);
  }, [currentTrack]);

  const setVolume = useCallback((volume: number) => {
    // Apply volume to current track's WaveSurfer
    if (currentTrack) {
      const controls = waveSurferRegistry.current.get(currentTrack.id);
      controls?.setVolume(Math.max(0, Math.min(1, volume)));
    }
  }, [currentTrack]);

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
    setCurrentTrack,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    registerWaveSurfer,
    unregisterWaveSurfer,
  };

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
}

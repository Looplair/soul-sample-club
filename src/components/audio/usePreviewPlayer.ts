"use client";

import { useEffect, useRef, useState } from "react";
import { useAudio } from "@/contexts/AudioContext";

export interface PreviewTrack {
  id: string;
  name: string;
  packName: string;
  bpm: number | null;
  key: string | null;
  duration: number | null;
}

/**
 * Plays sample previews outside the waveform players (guides, genre pages)
 * through the site-wide audio context, so the NowPlayingBar shows them and
 * only one thing plays at a time.
 */
export function usePreviewPlayer() {
  const { currentTrack, isPlaying, playTrack, setIsPlaying, setCurrentTime, setDuration, registerWaveSurfer, unregisterWaveSurfer } =
    useAudio();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const registered = useRef<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      registered.current.forEach((id) => unregisterWaveSurfer(id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const isTrackPlaying = (id: string) => currentTrack?.id === id && isPlaying;

  const toggle = async (track: PreviewTrack) => {
    if (currentTrack?.id === track.id && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    setLoadingId(track.id);
    try {
      const res = await fetch(`/api/preview/${track.id}`);
      if (!res.ok) throw new Error("preview unavailable");
      const { url } = await res.json();

      audioRef.current?.pause();
      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audioRef.current = audio;

      registerWaveSurfer(track.id, {
        play: () => void audio.play(),
        pause: () => audio.pause(),
        seek: (t) => {
          audio.currentTime = t;
        },
        setVolume: (v) => {
          audio.volume = v;
        },
      });
      registered.current.add(track.id);

      playTrack({
        id: track.id,
        name: track.name,
        packName: track.packName,
        url,
        duration: track.duration ?? 0,
        bpm: track.bpm,
        musicalKey: track.key,
      });
      await audio.play();
    } catch (err) {
      console.error("Preview failed:", err);
    } finally {
      setLoadingId(null);
    }
  };

  return { toggle, isTrackPlaying, loadingId, currentTrackId: currentTrack?.id ?? null };
}

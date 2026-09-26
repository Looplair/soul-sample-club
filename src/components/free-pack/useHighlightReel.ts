"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudio } from "@/contexts/AudioContext";
import type { FreePackTrack } from "@/lib/free-pack";

const SNIPPET_SECONDS = 12;
const REEL_ID = "free-pack-highlight-reel";

/**
 * Plays ~12 seconds from each track back to back, so a visitor hears the
 * whole pack in under a minute. Goes through the site audio context so the
 * player bar shows it and anything else stops.
 */
export function useHighlightReel(tracks: FreePackTrack[], packName: string) {
  const { playTrack, setIsPlaying, setCurrentTime, setDuration, registerWaveSurfer, unregisterWaveSurfer, currentTrack } = useAudio();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urls = useRef<Map<string, string>>(new Map());
  const indexRef = useRef(0);
  const endAtRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // across the whole reel, 0 to 1

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  useEffect(() => {
    registerWaveSurfer(REEL_ID, {
      play: () => void audioRef.current?.play().then(() => setPlaying(true)),
      pause: () => stop(),
      seek: () => {},
      setVolume: (v) => {
        if (audioRef.current) audioRef.current.volume = v;
      },
    });
    return () => {
      audioRef.current?.pause();
      unregisterWaveSurfer(REEL_ID);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Another player took over: reflect that here
  useEffect(() => {
    if (currentTrack && currentTrack.id !== REEL_ID) stop();
  }, [currentTrack, stop]);

  const urlFor = async (id: string) => {
    if (urls.current.has(id)) return urls.current.get(id)!;
    const res = await fetch(`/api/preview/${id}`);
    if (!res.ok) throw new Error("preview unavailable");
    const { url } = await res.json();
    urls.current.set(id, url);
    return url as string;
  };

  const playAt = async (i: number) => {
    const track = tracks[i];
    if (!track) {
      stop();
      indexRef.current = 0;
      setIndex(0);
      setProgress(0);
      return;
    }
    indexRef.current = i;
    setIndex(i);
    setLoading(true);
    try {
      const url = await urlFor(track.id);
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = url;
      await new Promise<void>((resolve) => {
        audio.onloadedmetadata = () => resolve();
      });
      // Skip a little of the intro so each snippet lands on the music
      const start = Math.max(0, Math.min(audio.duration * 0.15, audio.duration - SNIPPET_SECONDS));
      audio.currentTime = start;
      endAtRef.current = Math.min(audio.duration, start + SNIPPET_SECONDS);
      audio.ontimeupdate = () => {
        const t = audio.currentTime;
        setCurrentTime(t);
        const within = Math.min(1, Math.max(0, (t - (endAtRef.current - SNIPPET_SECONDS)) / SNIPPET_SECONDS));
        setProgress((indexRef.current + within) / tracks.length);
        if (t >= endAtRef.current) void playAt(indexRef.current + 1);
      };
      audio.onended = () => void playAt(indexRef.current + 1);
      setDuration(audio.duration);
      playTrack({ id: REEL_ID, name: track.name, packName, url, duration: audio.duration, bpm: track.bpm, musicalKey: track.key });
      await audio.play();
      setPlaying(true);
      setIsPlaying(true);
    } catch (err) {
      console.error("Highlight reel failed:", err);
      stop();
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (playing) {
      stop();
      setIsPlaying(false);
    } else if (audioRef.current?.src && currentTrack?.id === REEL_ID) {
      void audioRef.current.play().then(() => {
        setPlaying(true);
        setIsPlaying(true);
      });
    } else {
      void playAt(indexRef.current);
    }
  };

  const skip = () => void playAt(indexRef.current + 1 < tracks.length ? indexRef.current + 1 : 0);

  return { index, playing, loading, progress, toggle, skip, current: tracks[index] };
}

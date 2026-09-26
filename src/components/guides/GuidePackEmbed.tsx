"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Loader2, ArrowRight } from "lucide-react";
import { useAudio } from "@/contexts/AudioContext";

export interface GuidePack {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  samples: { id: string; name: string; bpm: number | null; key: string | null; duration: number | null }[];
}

// A pack inside an article: cover, blurb and a few playable previews.
// Uses the site-wide audio context so only one thing plays at a time.
export function GuidePackEmbed({ pack }: { pack: GuidePack }) {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    registerWaveSurfer,
    unregisterWaveSurfer,
  } = useAudio();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const tracks = pack.samples.slice(0, 4);

  useEffect(() => {
    const ids = tracks.map((t) => t.id);
    return () => {
      audioRef.current?.pause();
      ids.forEach((id) => unregisterWaveSurfer(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async (track: GuidePack["samples"][number]) => {
    const isThis = currentTrack?.id === track.id;
    if (isThis && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    if (isThis && audioRef.current) {
      await audioRef.current.play();
      setIsPlaying(true);
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

      playTrack({
        id: track.id,
        name: track.name,
        packName: pack.name,
        url,
        duration: track.duration ?? 0,
        bpm: track.bpm,
        musicalKey: track.key,
      });
      await audio.play();
    } catch (err) {
      console.error("Guide preview failed:", err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="not-prose my-10 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <Link href={`/packs/${pack.id}`} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-grey-800">
          {pack.cover_image_url && (
            <Image src={pack.cover_image_url} alt={pack.name} fill sizes="80px" className="object-cover" />
          )}
        </Link>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/35">From the catalog</p>
          <Link href={`/packs/${pack.id}`} className="block truncate text-lg font-semibold text-white hover:underline">
            {pack.name}
          </Link>
          {pack.description && <p className="truncate text-sm text-white/50">{pack.description}</p>}
        </div>
      </div>

      <ul className="mt-4 divide-y divide-white/[0.06]">
        {tracks.map((track) => {
          const active = currentTrack?.id === track.id && isPlaying;
          return (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => toggle(track)}
                className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-white/[0.02]"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-charcoal">
                  {loadingId === track.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : active ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="ml-0.5 h-3.5 w-3.5" />
                  )}
                </span>
                <span className="flex-1 truncate text-sm font-medium text-white">{track.name}</span>
                <span className="text-xs text-white/40">
                  {[track.bpm && `${track.bpm} BPM`, track.key].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Link
        href={`/packs/${pack.id}`}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white"
      >
        Hear the full pack <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

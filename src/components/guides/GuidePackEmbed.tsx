"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Loader2, ArrowRight } from "lucide-react";
import { useAudio } from "@/contexts/AudioContext";
import { packPath } from "@/lib/pack-url";
import { cn } from "@/lib/utils";

export interface GuidePack {
  id: string;
  slug?: string | null;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  samples: { id: string; name: string; bpm: number | null; key: string | null; duration: number | null }[];
  /** Cover colour ("r, g, b") so the embed glows like a pack card; plain glass without it */
  glow?: string;
}

// A pack inside an article: a cover-lit glass box with its cover, blurb and a
// few playable previews.
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

  const lit = !!pack.glow;
  return (
    <div
      className={cn("not-prose ssc-glass my-12 rounded-[24px] p-3 sm:p-4", !lit && "ssc-glass--plain")}
      style={pack.glow ? ({ "--glow": pack.glow } as CSSProperties) : undefined}
    >
      <div className="flex items-center gap-4 p-1 sm:p-2">
        <Link href={packPath(pack)} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[14px] bg-white/[0.04] sm:h-24 sm:w-24">
          {pack.cover_image_url && (
            <Image src={pack.cover_image_url} alt={pack.name} fill sizes="96px" className="object-cover" />
          )}
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">From the catalog</p>
          <Link
            href={packPath(pack)}
            className="mt-1.5 block truncate font-[family-name:var(--font-display)] text-[1.15rem] font-extrabold uppercase leading-tight tracking-[-0.02em] text-white hover:underline sm:text-[1.35rem]"
          >
            {pack.name}
          </Link>
          {pack.description && <p className="mt-1 truncate text-[14px] font-light text-white/75">{pack.description}</p>}
        </div>
      </div>

      <ul className="mt-3 space-y-0.5">
        {tracks.map((track) => {
          const active = currentTrack?.id === track.id && isPlaying;
          return (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => toggle(track)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[14px] px-2 py-2 text-left transition-colors hover:bg-white/[0.05] sm:px-3",
                  active && "bg-white/[0.07]"
                )}
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-black">
                  {loadingId === track.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : active ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="ml-0.5 h-3.5 w-3.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-white">{track.name}</span>
                <span className="flex-shrink-0 text-[12px] tabular-nums text-white/55">
                  {[track.bpm && `${track.bpm} BPM`, track.key].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="px-1 pb-1 pt-3 sm:px-2">
        <Link
          href={packPath(pack)}
          className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-white/[0.14] bg-white/[0.04] px-4 text-[12px] font-extrabold uppercase tracking-[0.06em] text-white transition-colors hover:border-white/30"
        >
          Hear the full pack <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

// "Complete control" film with Curtiss King. On desktop it plays silently on a
// loop once it scrolls into view; phones show the poster until tapped.
// Ambient light behind the frame is a tiny still of the film, scaled up and
// blurred once (no second video). "Watch with sound" restarts it with audio.
// The film is a 720p re-encode (1.8MB); nothing downloads until it's needed.

const SRC = "/videos/complete-control-720.mp4";
const POSTER = "/videos/complete-control-poster.jpg";
const AMBIENT = "/videos/complete-control-ambient.jpg";

export function ControlFilm() {
  const wrap = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [withSound, setWithSound] = useState(false);

  // Silent loop on larger screens while visible
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const v = film.current;
        if (!v || withSound) return;
        const loopHere = window.matchMedia("(min-width: 1024px)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (entry.isIntersecting && loopHere) {
          v.muted = true;
          void v.play().then(() => setPlaying(true)).catch(() => {});
        } else {
          v.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [withSound]);

  const watchWithSound = () => {
    const v = film.current;
    if (!v) return;
    setWithSound(true);
    v.currentTime = 0;
    v.muted = false;
    v.loop = false;
    void v.play().then(() => setPlaying(true));
  };

  const toggle = () => {
    const v = film.current;
    if (!v) return;
    if (v.paused) {
      if (!withSound) return watchWithSound();
      void v.play().then(() => setPlaying(true));
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <div ref={wrap} className="relative mx-auto w-full max-w-[560px]">
      {/* Ambient light: a 48px still of the film, scaled up and blurred */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={AMBIENT}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-[50px] saturate-150"
      />
      <div className="ssc-glass ssc-glass--plain relative rounded-[28px] p-2.5">
        <div className="relative aspect-square overflow-hidden rounded-[20px] bg-black">
          <video
            ref={film}
            playsInline
            muted
            loop
            preload="none"
            poster={POSTER}
            src={SRC}
            onClick={toggle}
            onEnded={() => {
              setPlaying(false);
              setWithSound(false);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer object-cover"
          />
          <div className={cn("pointer-events-none absolute inset-0 flex items-end justify-between p-4 transition-opacity duration-300", playing && withSound ? "opacity-0" : "opacity-100")}>
            <span className="rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
              Curtiss King
            </span>
          </div>
          {!(playing && withSound) && (
            <button
              type="button"
              onClick={watchWithSound}
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-full bg-white px-5 py-3.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-black shadow-2xl transition-transform active:scale-95"
            >
              {playing ? <Volume2 className="h-4 w-4" /> : <Play className="h-4 w-4" fill="currentColor" />}
              Watch with sound
            </button>
          )}
          {playing && withSound && (
            <button
              type="button"
              onClick={toggle}
              aria-label="Pause"
              className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md"
            >
              <Pause className="h-4 w-4" fill="currentColor" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

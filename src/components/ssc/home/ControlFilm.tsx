"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

// "Complete control" film with Curtiss King. On desktop it plays silently on a
// loop once it scrolls into view, with a blurred copy behind it for ambient
// light. Phones get the first frame and a play button (it's a 30MB file).
// "Watch with sound" restarts it from the top with audio.

const SRC = "/videos/completecontrolvideo_curtiss.mp4";

export function ControlFilm() {
  const wrap = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const ambient = useRef<HTMLVideoElement>(null);
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
          void ambient.current?.play().catch(() => {});
        } else {
          v.pause();
          ambient.current?.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [withSound]);

  // Keep the ambient copy in step with the film
  useEffect(() => {
    const v = film.current;
    if (!v) return;
    const sync = () => {
      const a = ambient.current;
      if (a && Math.abs(a.currentTime - v.currentTime) > 0.3) a.currentTime = v.currentTime;
    };
    v.addEventListener("timeupdate", sync);
    return () => v.removeEventListener("timeupdate", sync);
  }, []);

  const watchWithSound = () => {
    const v = film.current;
    if (!v) return;
    setWithSound(true);
    v.currentTime = 0;
    v.muted = false;
    v.loop = false;
    void v.play().then(() => setPlaying(true));
    if (ambient.current) {
      ambient.current.currentTime = 0;
      void ambient.current.play().catch(() => {});
    }
  };

  const toggle = () => {
    const v = film.current;
    if (!v) return;
    if (v.paused) {
      if (!withSound) return watchWithSound();
      void v.play().then(() => setPlaying(true));
      void ambient.current?.play().catch(() => {});
    } else {
      v.pause();
      ambient.current?.pause();
      setPlaying(false);
    }
  };

  return (
    <div ref={wrap} className="relative mx-auto w-full max-w-[560px]">
      {/* Ambient light: the film itself, blurred and dimmed behind the frame */}
      <video
        ref={ambient}
        aria-hidden
        muted
        loop
        playsInline
        preload="metadata"
        src={`${SRC}#t=0.001`}
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-[60px] saturate-150"
      />
      <div className="ssc-glass ssc-glass--plain relative rounded-[28px] p-2.5">
        <div className="relative aspect-square overflow-hidden rounded-[20px] bg-black">
          <video
            ref={film}
            playsInline
            muted
            loop
            preload="metadata"
            src={`${SRC}#t=0.001`}
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

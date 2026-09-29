"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// "Heard on": the artists as a stacked roll of big names, lit one at a time
// like credits, with the lit artist's photo floating beside them in colour.
// Cycles on its own; hovering or tapping a name jumps to it.

export interface Artist {
  name: string;
  image: string;
}

export function ArtistRoll({ artists }: { artists: Artist[] }) {
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((i) => (i + 1) % artists.length), 2400);
    return () => clearInterval(t);
  }, [held, artists.length]);

  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16" onMouseLeave={() => setHeld(false)}>
      {/* Photo stack: the lit artist in front, the next one peeking behind */}
      <div className="relative mx-auto aspect-[4/5] w-[min(78vw,380px)] lg:order-2">
        {artists.map((a, i) => {
          const isActive = i === active;
          const isNext = i === (active + 1) % artists.length;
          return (
            <div
              key={a.name}
              aria-hidden={!isActive}
              className={cn(
                "ssc-glass ssc-glass--plain absolute inset-0 rounded-[26px] p-2.5 transition-all duration-700 ease-out",
                isActive ? "z-20 rotate-[-2deg] opacity-100" : isNext ? "z-10 translate-x-[3%] rotate-[4deg] scale-[0.92] opacity-60 sm:translate-x-[7%] sm:rotate-[5deg] sm:scale-[0.94]" : "z-0 scale-90 opacity-0"
              )}
            >
              <div className="relative h-full w-full overflow-hidden rounded-[18px]">
                <Image src={a.image} alt={a.name} fill sizes="380px" className="object-cover" priority={i < 2} />
                <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                  {a.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* The roll of names */}
      <ol className="flex min-w-0 flex-col lg:order-1">
        {artists.map((a, i) => (
          <li key={a.name}>
            <button
              type="button"
              onMouseEnter={() => {
                setHeld(true);
                setActive(i);
              }}
              onClick={() => {
                setHeld(true);
                setActive(i);
              }}
              className={cn(
                "ssc-display flex w-full min-w-0 items-baseline gap-3 py-1 text-left text-[clamp(1.3rem,6.4vw,3.6rem)] transition-colors duration-500 [overflow-wrap:anywhere] sm:gap-4",
                i === active ? "text-white" : "text-white/[0.16] hover:text-white/40"
              )}
            >
              <span className="w-6 flex-shrink-0 text-[11px] sm:w-8 sm:text-[12px] font-semibold tabular-nums tracking-[0.1em] text-white/55" style={{ fontFamily: "var(--font-inter)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {a.name}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

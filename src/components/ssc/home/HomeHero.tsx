"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHighlightReel } from "@/components/free-pack/useHighlightReel";
import type { FreePackTrack } from "@/lib/free-pack";
import { glowStyle, Pill } from "../Glass";

export interface HeroCover {
  name: string;
  href: string;
  cover_image_url: string | null;
  glow: string;
}

/**
 * Headline on the left; this week's cover floating in front of the two before
 * it on the right. The play button runs a highlight reel of this week's pack
 * (12 seconds of each track), so a visitor hears SSC in one tap.
 */
export function HomeHero({
  covers,
  tracks,
  primaryCta,
  secondaryLine,
}: {
  covers: HeroCover[];
  tracks: FreePackTrack[];
  primaryCta: ReactNode;
  secondaryLine?: ReactNode;
}) {
  const [front, ...back] = covers;
  const reel = useHighlightReel(tracks, front?.name ?? "");

  return (
    <section className="relative overflow-hidden px-5 pb-[clamp(48px,7vw,96px)] pt-[clamp(28px,5vw,64px)] sm:px-8" style={glowStyle(front?.glow)}>
      <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="relative z-10 flex flex-col items-start">
          {front && (
            <Pill dot glow={front.glow}>
              New this week · {front.name}
            </Pill>
          )}
          <h1 className="ssc-display mt-6 text-[clamp(2.5rem,5.6vw,4.9rem)]">
            Original soul, cleared before you press play
          </h1>
          <p className="ssc-body mt-6 max-w-[34rem] text-[clamp(1.05rem,1.5vw,1.25rem)] leading-relaxed">
            A new pack of soul compositions every week, made in house, with full stems on every release. Preview
            everything free.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {primaryCta}
            {tracks.length > 0 && (
              <button type="button" onClick={reel.toggle} className="ssc-btn ssc-btn--ghost">
                {reel.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : reel.playing ? (
                  <Pause className="h-4 w-4" fill="currentColor" />
                ) : (
                  <Play className="h-4 w-4" fill="currentColor" />
                )}
                {reel.playing ? "Pause" : "Hear this week's pack"}
              </button>
            )}
          </div>
          {secondaryLine && <div className="mt-5 text-[13px] text-white/55">{secondaryLine}</div>}
        </div>

        {/* Floating covers */}
        {front && (
          <div className="relative mx-auto aspect-square w-[min(82vw,500px)] lg:mr-0">
            {back.slice(0, 2).map((c, i) => (
              <Link
                key={c.href}
                href={c.href}
                aria-label={c.name}
                className={cn(
                  "ssc-glass absolute w-[58%] rounded-[22px] p-2 transition-transform duration-500 hover:z-20",
                  i === 0 ? "-left-[2%] top-[6%] -rotate-[9deg] hover:-rotate-[5deg]" : "-right-[1%] top-[2%] rotate-[8deg] hover:rotate-[4deg]"
                )}
                style={glowStyle(c.glow)}
              >
                <div className="relative aspect-square overflow-hidden rounded-[16px]">
                  {c.cover_image_url && <Image src={c.cover_image_url} alt="" fill sizes="300px" className="object-cover" />}
                </div>
              </Link>
            ))}
            <div className="ssc-glass absolute bottom-0 left-1/2 z-10 w-[74%] -translate-x-1/2 rounded-[26px] p-2.5" style={glowStyle(front.glow)}>
              <Link href={front.href} className="relative block aspect-square overflow-hidden rounded-[20px]">
                {front.cover_image_url && (
                  <Image src={front.cover_image_url} alt={front.name} fill priority sizes="(max-width: 1024px) 70vw, 380px" className="object-cover" />
                )}
              </Link>
              {tracks.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={reel.toggle}
                    aria-label={reel.playing ? "Pause highlight reel" : "Play highlight reel"}
                    className="absolute bottom-[26%] right-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-transform active:scale-95"
                  >
                    {reel.loading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : reel.playing ? (
                      <Pause className="h-6 w-6" fill="currentColor" />
                    ) : (
                      <Play className="ml-1 h-6 w-6" fill="currentColor" />
                    )}
                  </button>
                  <div className="px-2 pb-1.5 pt-3">
                    <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.12]">
                      <div className="h-full bg-white transition-[width] duration-200" style={{ width: `${reel.progress * 100}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-[12px] text-white/55">
                      <span className="truncate">
                        {reel.index + 1} of {tracks.length}
                        {reel.current && <span className="ml-1.5 font-semibold text-white">{reel.current.name}</span>}
                      </span>
                      <button type="button" onClick={reel.skip} className="flex-shrink-0 font-medium text-white">
                        Skip ›
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Loader2, Download, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudio } from "@/contexts/AudioContext";
import { usePreviewPlayer } from "@/components/audio/usePreviewPlayer";
import { SmoothWaveform } from "./SmoothWaveform";
import { useHighlightReel } from "./useHighlightReel";
import { FreePackSignUpSheet } from "./FreePackSignUpSheet";
import type { FreePack } from "@/lib/free-pack";
import { TrackView, track } from "@/lib/track";
import { GlassBox, Pill, glowStyle } from "@/components/ssc/Glass";

// Same artists and quotes the homepage uses
const ARTISTS = [
  { name: "Dave East", image: "/placeholders/Daveast.jpg" },
  { name: "Statik Selektah", image: "/placeholders/statik.jpg" },
  { name: "Apollo Brown", image: "/placeholders/apollobrown.jpg" },
  { name: "Mick Jenkins", image: "/placeholders/mickjenkins.jpg" },
  { name: "Westside Boogie", image: "/placeholders/westideboogie.jpeg" },
];
const QUOTES = [
  { name: "Sef Lateef", quote: "Finally great musicianship. AND I FUGGIN LOVE IT!!!" },
  { name: "Kimba", quote: "One of the best decisions to jump on board. Looking forward to the masterpieces." },
  { name: "Joshua Spann", quote: "Thanks so much for quality material." },
];

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

interface Props {
  pack: FreePack;
  isLoggedIn: boolean;
  hasAccess: boolean;
  downloadHref: string;
  /** Cover colour as "r, g, b": the page's glass glows in it */
  glow: string;
}

export function FreePackExperience({ pack, isLoggedIn, hasAccess, downloadHref, glow }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const claimed = useRef(false);
  const reel = useHighlightReel(pack.tracks, pack.name);
  const player = usePreviewPlayer();
  const { currentTrack, currentTime, duration } = useAudio();
  const stemCount = pack.tracks.filter((t) => t.hasStems).length;
  const unlocked = isLoggedIn;

  // Signed in on /free = claiming it: record it (sends the email the first time)
  useEffect(() => {
    if (!isLoggedIn || claimed.current) return;
    claimed.current = true;
    fetch("/api/free-pack/claim", { method: "POST" })
      .then((r) => r.json())
      .then((res) => {
        if (res.first && typeof window.fbq === "function") window.fbq("track", "Lead", { content_name: `Free pack: ${pack.name}` });
      })
      .catch(() => {});
  }, [isLoggedIn, pack.name]);

  const playerBarShowing = !!currentTrack;

  return (
    <div className="ssc min-h-screen overflow-x-clip pb-40" style={glowStyle(glow)}>
      {/* Minimal header: logo only, no menu */}
      <header className="flex h-16 items-center justify-center">
        <Link href="/" aria-label="Soul Sample Club">
          <Image src="/logo.svg" alt="Soul Sample Club" width={140} height={32} className="h-6 w-auto" priority />
        </Link>
      </header>

      {/* Funnel reporting: logged-out visits only, so it counts new people */}
      {!isLoggedIn && <TrackView path="/free" />}

      <main className="mx-auto max-w-xl px-5">
        <div className="mt-4 flex justify-center">
          <h1 className="ssc-pill text-center !tracking-[0.14em] sm:!tracking-[0.2em]">
            <span className="ssc-pill__dot" />
            {unlocked ? "Your free soul sample pack" : (
              <>
                Free soul sample pack <span className="mx-1 opacity-60">·</span> No card needed
              </>
            )}
          </h1>
        </div>

        {/* Cover with the highlight reel */}
        <GlassBox glow={glow} className="mt-5 rounded-[28px] p-2.5">
          <div className="relative aspect-square overflow-hidden rounded-[20px] bg-white/[0.04]">
            {pack.cover_image_url && (
              <Image src={pack.cover_image_url} alt={pack.name} fill priority sizes="(max-width: 640px) 100vw, 576px" className="object-cover" />
            )}
            <button
              type="button"
              onClick={reel.toggle}
              aria-label={reel.playing ? "Pause highlight reel" : "Play highlight reel"}
              className="absolute bottom-4 right-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-transform active:scale-95"
            >
              {reel.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : reel.playing ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="ml-1 h-6 w-6" fill="currentColor" />}
            </button>
          </div>
          <div className="px-2 pb-1.5 pt-3">
          <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.12]">
            <div className="h-full bg-white transition-[width] duration-200" style={{ width: `${reel.progress * 100}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-white/55">
            <span>
              Highlight reel · {reel.index + 1} of {pack.tracks.length}
              {reel.current && (
                <>
                  {" "}
                  · <span className="font-semibold text-white">{reel.current.name}</span>
                </>
              )}
            </span>
            <button type="button" onClick={reel.skip} className="flex-shrink-0 font-semibold text-white">
              Skip ›
            </button>
          </div>
          </div>
        </GlassBox>

        <p className="ssc-display mt-8 break-words text-[clamp(2.6rem,13vw,4.2rem)]">
          {pack.name}
        </p>

        {unlocked ? (
          <>
            <a
              href={downloadHref}
              className="ssc-btn ssc-btn--primary mt-6 h-14 w-full"
            >
              <Download className="h-5 w-5" /> Download {pack.name}
            </a>
            <p className="mt-3 text-center text-[13px] leading-relaxed text-white/55">
              On your phone? We&apos;ve emailed you the link, so you can grab it on your computer.
            </p>

            {hasAccess && (
              <GlassBox plain className="mt-6 rounded-[22px] p-5 text-center">
                <p className="text-[15px] leading-relaxed text-white/75">
                  You&apos;re already a member, so this one&apos;s a bonus. Enjoy it.
                </p>
                <Link href="/feed" className="mt-3 inline-block text-sm font-medium text-white underline underline-offset-4">
                  Back to the catalog
                </Link>
              </GlassBox>
            )}
          </>
        ) : (
          <>
            <p className="ssc-body mt-4 text-[17px] leading-relaxed">
              {pack.tracks.length} pre-cleared soul compositions{stemCount > 0 ? " with stems" : ""}. Free when you create an account.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex flex-shrink-0">
                {ARTISTS.map((a, i) => (
                  <div key={a.name} className={cn("relative h-9 w-9 overflow-hidden rounded-full border-2 border-black", i > 0 && "-ml-2.5")}>
                    <Image src={a.image} alt={a.name} fill sizes="36px" className="object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-[13px] leading-snug text-white/75">
                Our sounds have been used by <b className="font-semibold text-white">Dave East</b>,{" "}
                <b className="font-semibold text-white">Statik Selektah</b>, <b className="font-semibold text-white">Apollo Brown</b> and more.
              </p>
            </div>
          </>
        )}

        {/* Tracks */}
        <Pill className="mb-4 mt-12">The tracks</Pill>
        <GlassBox plain className="rounded-[24px] p-2">
          {pack.tracks.map((t) => {
            const isCurrent = currentTrack?.id === t.id;
            const playing = player.isTrackPlaying(t.id);
            const key = t.key?.replace(/\s*minor$/i, "m").replace(/\s*major$/i, "");
            return (
              <div key={t.id} className={cn("flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors", isCurrent ? "bg-white/[0.06]" : "hover:bg-white/[0.03]")}>
                <button
                  type="button"
                  onClick={() => player.toggle({ id: t.id, name: t.name, packName: pack.name, bpm: t.bpm, key: t.key, duration: t.duration })}
                  aria-label={playing ? `Pause ${t.name}` : `Play ${t.name}`}
                  className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full",
                    playing ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  {player.loadingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : playing ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] font-semibold uppercase tracking-[0.02em]">{t.name}</span>
                    <span className="flex-shrink-0 text-xs tabular-nums text-white/55">{[t.bpm && `${t.bpm} BPM`, key].filter(Boolean).join(" · ")}</span>
                  </div>
                  <SmoothWaveform
                    peaks={t.peaks}
                    progress={isCurrent && duration ? currentTime / duration : 0}
                    className="mt-1.5 block h-7 w-full"
                  />
                </div>
              </div>
            );
          })}
        </GlassBox>

        {/* What you get */}
        <Pill className="mb-4 mt-12">What you get</Pill>
        <GlassBox glow={glow} className="rounded-[24px] px-5 py-1">
        <ul className="divide-y divide-white/[0.08]">
          {[
            ["Stems for every track", "Every part on its own, ready to flip."],
            ["Pre-cleared for your releases", "Streaming, beats you sell, even sync."],
            ["Yours to keep", "Download once, use it forever."],
          ].map(([title, sub]) => (
            <li key={title} className="py-4">
              <p className="ssc-display text-[15px]">{title}</p>
              <p className="ssc-body mt-1.5 text-[14px]">{sub}</p>
            </li>
          ))}
        </ul>
        </GlassBox>

        {/* From members */}
        <Pill className="mb-4 mt-12">From members</Pill>
        {/* Padding so the glass shadows aren't clipped by the scroller */}
        <div className="-mx-5 -my-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUOTES.map((q) => (
            <GlassBox key={q.name} plain className="flex w-[78%] flex-shrink-0 snap-start flex-col justify-between gap-4 rounded-[22px] p-5 sm:w-[60%]">
              <p className="text-[15px] font-light leading-relaxed text-white">&ldquo;{q.quote}&rdquo;</p>
              <p className="ssc-label">{q.name}</p>
            </GlassBox>
          ))}
        </div>

        {!unlocked && (
          <>
            {/* How it works */}
            <Pill className="mb-4 mt-12">How it works</Pill>
            <GlassBox plain className="rounded-[24px] px-5 py-2">
            {[
              "Create a free account. One tap with Google.",
              `Download ${pack.name} with ${stemCount > 0 ? "all its stems" : "every track"}.`,
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-4 py-3 text-[15px] text-white/75">
                <span className="ssc-display flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-[12px] text-white">{i + 1}</span>
                {step}
              </div>
            ))}
            </GlassBox>
          </>
        )}

        {/* About, written for search as much as for people */}
        <Pill className="mb-4 mt-14">About this free pack</Pill>
        <h2 className="ssc-display text-[clamp(1.5rem,6vw,2rem)]">Free soul samples, pre-cleared for your releases</h2>
        <p className="ssc-body mt-4 text-[15px] leading-relaxed">
          {pack.name} is a full pack from the Soul Sample Club catalog, and it&apos;s yours free. You get {pack.tracks.length} original soul
          compositions{stemCount > 0 ? ", each with its stems," : ""} made by real musicians and pre-cleared, so you can release whatever you
          make with them.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {[
            {
              q: "Are these soul samples really free?",
              a: "Yes. Create a free account and the whole pack is yours to download and keep. You won't be asked for a card.",
            },
            {
              q: "Can I use them in music I release?",
              a: "Yes. Everything is pre-cleared, so you can use it in songs you put out and beats you sell.",
            },
            {
              q: "What's in the download?",
              a: `One ZIP with all ${pack.tracks.length} compositions${stemCount > 0 ? " and their stems" : ""}. It's a big file, so it's easiest to grab on a computer.`,
            },
          ].map((f) => (
            <details key={f.q} className="ssc-glass ssc-glass--plain group rounded-[20px] px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-[15px] font-semibold">
                {f.q}
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/75 transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-[15px] font-light leading-relaxed text-white/75">{f.a}</p>
            </details>
          ))}
        </div>
      </main>

      {/* Pinned call to action, sitting above the player bar when it's showing */}
      {!unlocked && (
        <div
          className={cn(
            "fixed inset-x-0 z-40 border-t border-white/[0.08] bg-black/80 px-5 pb-6 pt-3 backdrop-blur-xl transition-[bottom] duration-300",
            playerBarShowing ? "bottom-[68px]" : "bottom-0"
          )}
        >
          <div className="mx-auto max-w-xl text-center">
            <button
              type="button"
              onClick={() => {
                track("free_cta", "/free");
                setSheetOpen(true);
              }}
              className="ssc-btn ssc-btn--primary h-[54px] w-full text-[14px]"
            >
              Get it free
            </button>
            <p className="mt-2 text-[11px] text-white/55">No card needed</p>
          </div>
        </div>
      )}

      <FreePackSignUpSheet packName={pack.name} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

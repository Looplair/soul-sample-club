"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudio } from "@/contexts/AudioContext";
import { usePreviewPlayer } from "@/components/audio/usePreviewPlayer";
import { SmoothWaveform } from "./SmoothWaveform";
import { useHighlightReel } from "./useHighlightReel";
import { FreePackSignUpSheet } from "./FreePackSignUpSheet";
import type { FreePack } from "@/lib/free-pack";

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
  displayFont: string;
}

export function FreePackExperience({ pack, isLoggedIn, hasAccess, downloadHref, displayFont }: Props) {
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
    <div className="min-h-screen bg-charcoal pb-40 text-white">
      {/* Minimal header: logo only, no menu */}
      <header className="flex h-14 items-center justify-center border-b border-white/[0.08]">
        <Link href="/" aria-label="Soul Sample Club">
          <Image src="/logo.svg" alt="Soul Sample Club" width={140} height={32} className="h-6 w-auto" priority />
        </Link>
      </header>

      <main className="mx-auto max-w-xl px-5">
        <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
          {unlocked ? "Your free pack" : (
            <>
              Free pack <span className="mx-1 opacity-50">·</span> No card needed
            </>
          )}
        </p>

        {/* Cover with the highlight reel */}
        <div className="relative mt-4 aspect-square overflow-hidden rounded-[22px] bg-grey-800">
          {pack.cover_image_url && (
            <Image src={pack.cover_image_url} alt={pack.name} fill priority sizes="(max-width: 640px) 100vw, 576px" className="object-cover" />
          )}
          <button
            type="button"
            onClick={reel.toggle}
            aria-label={reel.playing ? "Pause highlight reel" : "Play highlight reel"}
            className="absolute bottom-4 right-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-charcoal shadow-2xl transition-transform active:scale-95"
          >
            {reel.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : reel.playing ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="ml-1 h-6 w-6" fill="currentColor" />}
          </button>
        </div>
        <div className="mt-3">
          <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.12]">
            <div className="h-full bg-white transition-[width] duration-200" style={{ width: `${reel.progress * 100}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-white/55">
            <span>
              Highlight reel · {reel.index + 1} of {pack.tracks.length}
              {reel.current && (
                <>
                  {" "}
                  · <span className="font-semibold text-white">{reel.current.name}</span>
                </>
              )}
            </span>
            <button type="button" onClick={reel.skip} className="text-white">
              Skip ›
            </button>
          </div>
        </div>

        <h1 className={cn(displayFont, "mt-6 break-words text-[clamp(2.6rem,13vw,4.2rem)] font-bold uppercase leading-[0.95] tracking-[-0.02em]")}>
          {pack.name}
        </h1>

        {unlocked ? (
          <>
            <a
              href={downloadHref}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-base font-bold text-charcoal active:scale-[0.99]"
            >
              <Download className="h-5 w-5" /> Download {pack.name}
            </a>
            <p className="mt-3 text-center text-[13px] leading-relaxed text-white/55">
              On your phone? We&apos;ve emailed you the link, so you can grab it on your computer.
            </p>

            {hasAccess && (
              <div className="mt-6 rounded-[20px] border border-white/[0.14] p-5 text-center">
                <p className="text-[15px] leading-relaxed text-white/75">
                  You&apos;re already a member, so this one&apos;s a bonus. Enjoy it.
                </p>
                <Link href="/feed" className="mt-3 inline-block text-sm font-medium text-white underline underline-offset-4">
                  Back to the catalog
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mt-3 text-base leading-relaxed text-white/65">
              {pack.tracks.length} pre-cleared soul compositions{stemCount > 0 ? " with stems" : ""}. Free when you create an account.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex flex-shrink-0">
                {ARTISTS.map((a, i) => (
                  <div key={a.name} className={cn("relative h-9 w-9 overflow-hidden rounded-full border-2 border-charcoal", i > 0 && "-ml-2.5")}>
                    <Image src={a.image} alt={a.name} fill sizes="36px" className="object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-[13px] leading-snug text-white/60">
                Our sounds have been used by <b className="font-semibold text-white">Dave East</b>,{" "}
                <b className="font-semibold text-white">Statik Selektah</b>, <b className="font-semibold text-white">Apollo Brown</b> and more.
              </p>
            </div>
          </>
        )}

        {/* Tracks */}
        <p className="mb-2 mt-9 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">The tracks</p>
        <div className="-mx-5">
          {pack.tracks.map((t) => {
            const isCurrent = currentTrack?.id === t.id;
            const playing = player.isTrackPlaying(t.id);
            const key = t.key?.replace(/\s*minor$/i, "m").replace(/\s*major$/i, "");
            return (
              <div key={t.id} className={cn("flex items-center gap-3 border-t border-white/[0.06] px-5 py-3", isCurrent && "bg-white/[0.04]")}>
                <button
                  type="button"
                  onClick={() => player.toggle({ id: t.id, name: t.name, packName: pack.name, bpm: t.bpm, key: t.key, duration: t.duration })}
                  aria-label={playing ? `Pause ${t.name}` : `Play ${t.name}`}
                  className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full",
                    playing ? "bg-white text-charcoal" : "bg-white/10 text-white"
                  )}
                >
                  {player.loadingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : playing ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] font-semibold">{t.name}</span>
                    <span className="flex-shrink-0 text-xs text-white/45">{[t.bpm && `${t.bpm} BPM`, key].filter(Boolean).join(" · ")}</span>
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
        </div>

        {/* What you get */}
        <p className="mb-1 mt-9 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">What you get</p>
        <ul>
          {[
            ["Stems for every track", "Every part on its own, ready to flip."],
            ["Pre-cleared for your releases", "Streaming, beats you sell, even sync."],
            ["Yours to keep", "Download once, use it forever."],
          ].map(([title, sub]) => (
            <li key={title} className="border-t border-white/[0.07] py-3">
              <p className="text-[15px] font-semibold">{title}</p>
              <p className="text-[13px] text-white/50">{sub}</p>
            </li>
          ))}
        </ul>

        {/* From members */}
        <p className="mb-3 mt-9 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">From members</p>
        <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUOTES.map((q) => (
            <div key={q.name} className="w-[78%] flex-shrink-0 snap-start rounded-2xl border border-white/10 p-4 sm:w-[60%]">
              <p className="text-sm leading-relaxed text-white/85">&ldquo;{q.quote}&rdquo;</p>
              <p className="mt-2 text-xs text-white/45">{q.name}</p>
            </div>
          ))}
        </div>

        {!unlocked && (
          <>
            {/* How it works */}
            <p className="mb-2 mt-9 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">How it works</p>
            {[
              "Create a free account. One tap with Google.",
              `Download ${pack.name} with ${stemCount > 0 ? "all its stems" : "every track"}.`,
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-3 py-2 text-sm text-white/75">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-white/25 text-xs">{i + 1}</span>
                {step}
              </div>
            ))}
          </>
        )}
      </main>

      {/* Pinned call to action, sitting above the player bar when it's showing */}
      {!unlocked && (
        <div
          className={cn(
            "fixed inset-x-0 z-40 border-t border-white/[0.08] bg-charcoal/90 px-5 pb-6 pt-3 backdrop-blur-xl transition-[bottom] duration-300",
            playerBarShowing ? "bottom-[68px]" : "bottom-0"
          )}
        >
          <div className="mx-auto max-w-xl text-center">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="h-[54px] w-full rounded-2xl bg-white text-base font-bold text-charcoal active:scale-[0.99]"
            >
              Get it free
            </button>
            <p className="mt-2 text-[11px] text-white/45">No card needed</p>
          </div>
        </div>
      )}

      <FreePackSignUpSheet packName={pack.name} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

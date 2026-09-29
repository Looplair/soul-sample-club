"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { GlassBox, Pill, glowStyle } from "@/components/ssc/Glass";

interface Props {
  packName: string;
  hasStems: boolean;
  isPhone: boolean;
  zipBytes: number | null;
  deadline: string | null;
  serverNow: number;
  windowMinutes: number;
  covers: { id: string; name: string; cover_image_url: string }[];
  /** Free pack cover colour as "r, g, b" */
  glow: string;
}

const FACTS = [
  "A new pack drops every week",
  "Full stems on every release",
  "Pre-cleared. No clearance needed, ever.",
  "Cancel anytime",
];

export function FreePackOffer({ packName, hasStems, isPhone, zipBytes, deadline, serverNow, windowMinutes, covers, glow }: Props) {
  const end = deadline ? Date.parse(deadline) : 0;
  const [now, setNow] = useState(serverNow);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Arriving from the Download button (?dl=1): on a computer, start the
  // download from here. The URL is cleaned first so a refresh doesn't repeat it.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("dl") !== "1") return;
    window.history.replaceState(null, "", url.pathname);
    if (!isPhone) window.location.href = "/api/free-pack/download";
  }, [isPhone]);

  const left = Math.max(0, end - now);
  const live = left > 0;
  const mm = String(Math.floor(left / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, "0");

  const claim = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "monthly", offer: "free-pack" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="ssc min-h-screen overflow-x-clip pb-40" style={glowStyle(glow)}>
      <header className="flex h-16 items-center justify-center">
        <Link href="/" aria-label="Soul Sample Club">
          <Image src="/logo.svg" alt="Soul Sample Club" width={140} height={32} className="h-6 w-auto" priority />
        </Link>
      </header>

      <main className="mx-auto max-w-xl px-5">
        {/* Download status */}
        <GlassBox plain className="mt-4 flex gap-3 rounded-[22px] p-4 sm:p-5">
          <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white text-black">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          {isPhone ? (
            <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-white/75">
              <p className="text-[15px] font-semibold text-white">{packName} is ready</p>
              <p className="mt-0.5">
                It&apos;s a {zipBytes ? `${Math.round(zipBytes / 1_000_000)} MB ` : ""}ZIP{hasStems ? " with stems" : ""}, so it&apos;s
                best on a computer. We&apos;ve emailed you the link.
              </p>
              <a
                href="/api/free-pack/download"
                className="ssc-btn ssc-btn--ghost mt-3 h-11 w-full text-[12px]"
              >
                Download on this phone anyway
              </a>
            </div>
          ) : (
            <div className="text-[13px] leading-relaxed text-white/75">
              <p className="text-[15px] font-semibold text-white">Your download has started</p>
              <p className="mt-0.5">
                {packName} is on its way to your downloads. Didn&apos;t start?{" "}
                <a href="/api/free-pack/download" className="font-medium text-white underline underline-offset-4">
                  Download again
                </a>
              </p>
            </div>
          )}
        </GlassBox>

        {live ? (
          <>
            <div className="mt-12 flex justify-center">
              <Pill dot>One-time offer</Pill>
            </div>
            <h1 className="ssc-display mt-5 text-center text-[clamp(2.4rem,12vw,3.8rem)]">$1.99 a month</h1>
            <p className="ssc-body mt-4 text-center text-[17px] leading-relaxed">
              Full membership for your first 3 months, then $6.99. Cancel anytime.
            </p>

            {/* Timer */}
            {/* Live, so it breathes: glowing panel, blinking dot, pulsing seconds */}
            <GlassBox glow={glow} className="ssc-breathe mt-8 rounded-[24px] p-5 sm:p-6">
              <div className="flex items-end justify-between">
                <p className="ssc-label flex items-center gap-2 pb-1">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--glow))] opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(var(--glow))]" />
                  </span>
                  Offer ends in
                </p>
                <p className="ssc-display text-[2.6rem] tabular-nums">
                  {mm}:<span key={ss} className="inline-block animate-[pulse_1s_ease-out_1]">{ss}</span>
                </p>
              </div>
              <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-white/[0.12]">
                <div className="h-full bg-white" style={{ width: `${(left / (windowMinutes * 60_000)) * 100}%` }} />
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-white/55">You&apos;ll only see this once, straight after your download.</p>
            </GlassBox>
          </>
        ) : (
          <div className="mt-10 text-center">
            <Pill>Offer ended</Pill>
            <h1 className="ssc-display mt-5 text-[clamp(1.8rem,8vw,2.6rem)]">This offer has ended</h1>
            <p className="ssc-body mt-4 text-[17px] leading-relaxed">You can still join from the membership page.</p>
            <Link href="/subscribe" className="ssc-btn ssc-btn--primary mt-6 h-14 w-full">
              See membership
            </Link>
          </div>
        )}

        {/* What members get */}
        <Pill className="mb-4 mt-12">What members get</Pill>
        <GlassBox plain className="rounded-[24px] px-5 py-1">
          <ul className="divide-y divide-white/[0.08]">
            {FACTS.map((f) => (
              <li key={f} className="flex items-center gap-3 py-3.5 text-[15px] text-white/75">
                <Check className="h-4 w-4 flex-shrink-0 text-white" />
                {f}
              </li>
            ))}
          </ul>
        </GlassBox>

        {covers.length > 0 && (
          <>
            <Pill className="mb-4 mt-12">Recent releases</Pill>
            <div className="grid grid-cols-3 gap-2">
              {covers.map((c) => (
                <div key={c.id} className="relative aspect-square overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
                  <Image src={c.cover_image_url} alt={c.name} fill sizes="(max-width: 640px) 33vw, 190px" className="object-cover" />
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Pinned call to action while the offer is open */}
      {live && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-black/80 px-5 pb-6 pt-3 backdrop-blur-xl">
          <div className="mx-auto max-w-xl">
            <button
              type="button"
              onClick={claim}
              disabled={loading}
              className="ssc-btn ssc-btn--primary h-[54px] w-full text-[14px] disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Claim my $1.99 offer
            </button>
            <Link href="/free" className="mt-2 block text-center text-[12px] text-white/55 underline-offset-4 hover:underline">
              No thanks, just the free pack
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

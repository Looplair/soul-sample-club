"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  packName: string;
  hasStems: boolean;
  isPhone: boolean;
  zipBytes: number | null;
  deadline: string | null;
  serverNow: number;
  windowMinutes: number;
  covers: { id: string; name: string; cover_image_url: string }[];
  displayFont: string;
}

const FACTS = [
  "A new pack drops every week",
  "Full stems on every release",
  "Pre-cleared. No clearance needed, ever.",
  "Cancel anytime",
];

export function FreePackOffer({ packName, hasStems, isPhone, zipBytes, deadline, serverNow, windowMinutes, covers, displayFont }: Props) {
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
    <div className="min-h-screen bg-charcoal pb-40 text-white">
      <header className="flex h-14 items-center justify-center border-b border-white/[0.08]">
        <Link href="/" aria-label="Soul Sample Club">
          <Image src="/logo.svg" alt="Soul Sample Club" width={140} height={32} className="h-6 w-auto" priority />
        </Link>
      </header>

      <main className="mx-auto max-w-xl px-5">
        {/* Download status */}
        <div className="mt-6 flex gap-3 rounded-[20px] border border-white/[0.14] p-4">
          <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white text-charcoal">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          {isPhone ? (
            <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-white/60">
              <p className="text-[15px] font-semibold text-white">{packName} is ready</p>
              <p className="mt-0.5">
                It&apos;s a {zipBytes ? `${Math.round(zipBytes / 1_000_000)} MB ` : ""}ZIP{hasStems ? " with stems" : ""}, so it&apos;s
                best on a computer. We&apos;ve emailed you the link.
              </p>
              <a
                href="/api/free-pack/download"
                className="mt-3 flex h-10 w-full items-center justify-center rounded-xl border border-white/20 text-[13px] font-semibold text-white"
              >
                Download on this phone anyway
              </a>
            </div>
          ) : (
            <div className="text-[13px] leading-relaxed text-white/60">
              <p className="text-[15px] font-semibold text-white">Your download has started</p>
              <p className="mt-0.5">
                {packName} is on its way to your downloads. Didn&apos;t start?{" "}
                <a href="/api/free-pack/download" className="font-medium text-white underline underline-offset-4">
                  Download again
                </a>
              </p>
            </div>
          )}
        </div>

        {live ? (
          <>
            <p className="mt-10 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">One-time offer</p>
            <h1 className={cn(displayFont, "mt-3 text-center text-[clamp(2.4rem,12vw,3.8rem)] font-bold uppercase leading-[0.95] tracking-[-0.02em]")}>
              $1.99 a month
            </h1>
            <p className="mt-3 text-center text-base leading-relaxed text-white/65">
              Full membership for your first 3 months, then $6.99. Cancel anytime.
            </p>

            {/* Timer */}
            <div className="mt-7 rounded-[20px] border border-white/[0.14] p-5">
              <div className="flex items-end justify-between">
                <p className="pb-1 text-[13px] text-white/55">Offer ends in</p>
                <p className={cn(displayFont, "text-[2.6rem] font-bold leading-none tabular-nums")}>
                  {mm}:{ss}
                </p>
              </div>
              <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-white/[0.12]">
                <div className="h-full bg-white" style={{ width: `${(left / (windowMinutes * 60_000)) * 100}%` }} />
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-white/45">You&apos;ll only see this once, straight after your download.</p>
            </div>
          </>
        ) : (
          <div className="mt-10 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">Offer ended</p>
            <h1 className={cn(displayFont, "mt-3 text-[clamp(1.8rem,8vw,2.6rem)] font-bold uppercase leading-[0.98] tracking-[-0.02em]")}>
              This offer has ended
            </h1>
            <p className="mt-3 text-base leading-relaxed text-white/65">You can still join from the membership page.</p>
            <Link
              href="/subscribe"
              className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-white text-base font-bold text-charcoal"
            >
              See membership
            </Link>
          </div>
        )}

        {/* What members get */}
        <p className="mb-1 mt-10 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">What members get</p>
        <ul>
          {FACTS.map((f) => (
            <li key={f} className="flex items-center gap-3 border-t border-white/[0.07] py-3 text-[15px]">
              <Check className="h-4 w-4 flex-shrink-0 text-white/55" />
              {f}
            </li>
          ))}
        </ul>

        {covers.length > 0 && (
          <>
            <p className="mb-3 mt-9 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">Recent releases</p>
            <div className="grid grid-cols-3 gap-2">
              {covers.map((c) => (
                <div key={c.id} className="relative aspect-square overflow-hidden rounded-xl bg-grey-800">
                  <Image src={c.cover_image_url} alt={c.name} fill sizes="(max-width: 640px) 33vw, 190px" className="object-cover" />
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Pinned call to action while the offer is open */}
      {live && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-charcoal/90 px-5 pb-6 pt-3 backdrop-blur-xl">
          <div className="mx-auto max-w-xl">
            <button
              type="button"
              onClick={claim}
              disabled={loading}
              className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-white text-base font-bold text-charcoal active:scale-[0.99] disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Claim my $1.99 offer
            </button>
            <Link href="/free" className="mt-2 block text-center text-[12px] text-white/45 underline-offset-4 hover:underline">
              No thanks, just the free pack
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

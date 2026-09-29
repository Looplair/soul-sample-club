import Image from "next/image";
import { GlassBox } from "../Glass";
import { SmoothWaveform } from "@/components/free-pack/SmoothWaveform";

// Four reasons, four boxes, each with a small visual built from real pack data
// instead of a stock icon. Each box borrows its glow from a different recent cover.

interface Recent {
  name: string;
  cover_image_url: string | null;
  release_date: string;
  glow: string;
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function WhyBoxes({ latestName, stemPeaks, recent }: { latestName: string; stemPeaks: number[][]; recent: Recent[] }) {
  const glow = (i: number) => recent[i % Math.max(recent.length, 1)]?.glow;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <GlassBox glow={glow(0)} className="flex min-w-0 flex-col justify-between gap-8 p-6 sm:p-9">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
          <p className="ssc-label">License · {latestName}</p>
          {[
            ["Master rights", "Included"],
            ["Clearance needed", "None"],
          ].map(([k, v]) => (
            <div key={k} className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-3 text-[14px]">
              <span className="text-white/75">{k}</span>
              <span className="font-semibold text-white">{v}</span>
            </div>
          ))}
        </div>
        <div>
          <h3 className="ssc-display text-[clamp(1.5rem,2.6vw,2.1rem)]">Pre-cleared, for real</h3>
          <p className="ssc-body mt-3 text-[16px] leading-relaxed">
            Every composition is written and owned in house, so there is nothing to clear. Release what you make with it,
            including beats you sell.
          </p>
        </div>
      </GlassBox>

      <GlassBox glow={glow(1)} className="flex min-w-0 flex-col justify-between gap-8 p-6 sm:p-9">
        <div className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-black/40 p-5">
          {stemPeaks.slice(0, 4).map((peaks, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-12 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">Stem {i + 1}</span>
              <SmoothWaveform peaks={peaks} progress={0.35 + i * 0.12} className="block h-6 flex-1" />
            </div>
          ))}
        </div>
        <div>
          <h3 className="ssc-display text-[clamp(1.5rem,2.6vw,2.1rem)]">Full stems on every release</h3>
          <p className="ssc-body mt-3 text-[16px] leading-relaxed">
            Pull any part out on its own and build around it. The full composition and every stem come in the same download.
          </p>
        </div>
      </GlassBox>

      <GlassBox glow={glow(2)} className="flex min-w-0 flex-col justify-between gap-8 p-6 sm:p-9">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {recent.slice(0, 5).map((p) => (
            <div key={p.name} className="min-w-0">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-white/10 sm:rounded-xl">
                {p.cover_image_url && <Image src={p.cover_image_url} alt={p.name} fill sizes="90px" className="object-cover" />}
              </div>
              <p className="mt-1.5 truncate text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-white/55 sm:text-[10px] sm:tracking-[0.12em]">{day(p.release_date)}</p>
            </div>
          ))}
        </div>
        <div>
          <h3 className="ssc-display text-[clamp(1.5rem,2.6vw,2.1rem)]">A new pack every week</h3>
          <p className="ssc-body mt-3 text-[16px] leading-relaxed">
            Packs stay in the catalog for 90 days, then make room for what comes next. There is always something new to dig
            through.
          </p>
        </div>
      </GlassBox>

      <GlassBox glow={glow(3)} className="flex min-w-0 flex-col justify-between gap-8 p-6 sm:p-9">
        <div className="flex min-h-[132px] items-center rounded-2xl border border-white/10 bg-black/40 px-5 sm:px-6">
          <p className="ssc-display text-[clamp(2rem,9vw,3.6rem)] text-white">Not AI.</p>
        </div>
        <div>
          <h3 className="ssc-display text-[clamp(1.5rem,2.6vw,2.1rem)]">Made by real musicians</h3>
          <p className="ssc-body mt-3 text-[16px] leading-relaxed">
            Not generated and not stock. Everything is exclusive to Soul Sample Club, so you won&apos;t hear it anywhere
            else.
          </p>
        </div>
      </GlassBox>
    </div>
  );
}

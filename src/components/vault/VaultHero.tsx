// src/components/vault/VaultHero.tsx
"use client";

import type { ReactNode } from "react";
import { GlassBox, Pill } from "@/components/ssc/Glass";

interface VaultHeroProps {
  stats: { collected: number; total: number };
  backLink?: ReactNode;
}

// Fixed bar heights (percent) for the progress strip, shaped like a drum
// break: tall hits with smaller ghost notes between. Hardcoded so server and
// client render the same markup.
const STRIP = [
  92, 30, 46, 24, 78, 28, 58, 22, 96, 34, 40, 26, 74, 30, 62, 20,
  88, 26, 50, 32, 70, 24, 56, 28, 100, 30, 44, 22, 80, 34, 60, 24,
  90, 28, 48, 26, 76, 22, 54, 30, 94, 32, 42, 24, 72, 28, 64, 36,
];

export function VaultHero({ stats, backLink }: VaultHeroProps) {
  const pct = stats.total > 0 ? Math.round((stats.collected / stats.total) * 100) : 0;
  const lit = Math.round((pct / 100) * STRIP.length);

  return (
    <section>
      {backLink && <div className="mb-6">{backLink}</div>}

      {/* The members' perk gets a breathing box and the name at full size */}
      <GlassBox className="ssc-breathe overflow-hidden rounded-[28px] p-6 sm:p-10 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
          <div>
            <Pill dot>Members only</Pill>
            <h1 className="ssc-display mt-6 text-[clamp(3.4rem,11vw,8.5rem)] leading-[0.86]">
              Drum
              <br />
              Vault
            </h1>
            <p className="ssc-body mt-6 max-w-md text-[clamp(1rem,1.3vw,1.15rem)] leading-relaxed">
              Original drum breaks, made for members. Collect the ones you want and they stay yours to keep.
            </p>
            <p className="mt-3 text-[13px] text-white/55">We&apos;ll let you know when new breaks drop.</p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { n: stats.collected, label: "Your haul" },
                { n: stats.total, label: "In the vault" },
                { n: `${pct}%`, label: "Complete" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4 sm:px-5">
                  <p className="ssc-display text-[clamp(1.6rem,3.4vw,2.6rem)] tabular-nums">{s.n}</p>
                  <p className="ssc-label mt-2">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Progress drawn as a break: every lit hit is part of your collection */}
            <div>
              <div
                className="grid h-14 items-end gap-[3px]"
                style={{ gridTemplateColumns: `repeat(${STRIP.length}, minmax(0, 1fr))` }}
                role="progressbar"
                aria-label="Collection progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
              >
                {STRIP.map((h, i) => (
                  <span
                    key={i}
                    className={
                      i < lit
                        ? "rounded-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.35)] transition-colors duration-500"
                        : "rounded-[2px] bg-white/[0.12] transition-colors duration-500"
                    }
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="ssc-label">Collection progress</span>
                <span className="text-[13px] font-semibold tabular-nums text-white">
                  {stats.collected} of {stats.total}
                </span>
              </div>
            </div>
          </div>
        </div>
      </GlassBox>
    </section>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { glowStyle } from "../Glass";

// The offer at a glance under the hero buttons: big numbers, small labels,
// one glass strip. Replaces loose lines of small print.

export interface HeroStat {
  value: string;
  label: ReactNode;
  live?: boolean; // pulsing dot, for the member cap
  wrap?: (content: ReactNode) => ReactNode; // e.g. make the yearly price a checkout link
}

export function HeroStats({ stats, glow, className }: { stats: HeroStat[]; glow?: string; className?: string }) {
  return (
    <div
      className={cn("ssc-glass ssc-glass--plain grid w-full max-w-[520px] rounded-2xl", className)}
      style={glowStyle(glow, { gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` })}
    >
      {stats.map((s, i) => {
        const cell = (
          <div className={cn("flex h-full flex-col gap-1.5 px-3.5 py-3.5 sm:px-5 sm:py-4", i > 0 && "border-l border-white/[0.08]")}>
            <span className="ssc-display text-[clamp(1.2rem,5.2vw,1.65rem)] leading-none">{s.value}</span>
            <span className="flex items-start gap-1.5 text-[11px] leading-snug text-white/55 sm:text-[12px]">
              {s.live && (
                <span className="relative mt-[3px] flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--glow))] opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--glow))]" />
                </span>
              )}
              <span>{s.label}</span>
            </span>
          </div>
        );
        return <div key={s.value} className="min-w-0">{s.wrap ? s.wrap(cell) : cell}</div>;
      })}
    </div>
  );
}

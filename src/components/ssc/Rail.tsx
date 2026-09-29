"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Horizontal set of equivalents (packs, quotes): named tabs, arrows and swipe
// stay in sync. Arrows disable at the ends. Named tabs beat dots.

export interface RailTab {
  label: string;
  items: ReactNode[];
}

export function Rail({ tabs, title, className }: { tabs: RailTab[]; title?: ReactNode; className?: string }) {
  const [active, setActive] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });
  const track = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    el.scrollLeft = 0;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [active, measure]);

  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const items = tabs[active]?.items ?? [];

  return (
    <div className={className}>
      <div className="mb-5 flex items-center justify-between gap-4">
        {tabs.length > 1 ? (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
            {tabs.map((t, i) => (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={cn(
                  "flex-shrink-0 rounded-full border px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors",
                  i === active ? "border-white bg-white text-black" : "border-white/12 bg-white/[0.04] text-white/75 hover:border-white/30 hover:text-white"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          title ?? <span />
        )}
        <div className="hidden flex-shrink-0 gap-2 sm:flex">
          {([-1, 1] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              aria-label={dir < 0 ? "Scroll back" : "Scroll forward"}
              onClick={() => step(dir)}
              disabled={dir < 0 ? edges.start : edges.end}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white transition-colors hover:border-white/35 disabled:cursor-default disabled:opacity-30"
            >
              {dir < 0 ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>
      {/* Negative margin + padding so glows and lifts aren't clipped by the scroller */}
      <div ref={track} className="ssc-rail -mx-5 -my-8 scroll-px-5 px-5 py-8 sm:-mx-8 sm:scroll-px-8 sm:px-8">
        {items}
      </div>
    </div>
  );
}

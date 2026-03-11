// src/components/vault/VaultPicker.tsx
"use client";

import { useRef, useEffect, useCallback } from "react";
import { BreakRow } from "./BreakRow";
import type { DrumBreakWithStatus } from "@/types/database";

interface VaultPickerProps {
  breaks: DrumBreakWithStatus[];
  onCollect: (id: string) => void;
  onDownload: (id: string) => void;
}

export function VaultPicker({ breaks, onCollect, onDownload }: VaultPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const updateFocal = useCallback(() => {
    const scroll = scrollRef.current;
    const rows = listRef.current?.querySelectorAll<HTMLDivElement>("[data-row]");
    if (!scroll || !rows) return;

    const rect = scroll.getBoundingClientRect();
    const center = rect.top + rect.height / 2;

    rows.forEach((row) => {
      const rc = row.getBoundingClientRect();
      const rowCenter = rc.top + rc.height / 2;
      const dist = Math.abs(rowCenter - center);
      const t = Math.min(dist / (rect.height * 0.4), 1);
      row.style.transform = `scale(${(1 - t * 0.1).toFixed(4)})`;
      row.style.opacity = (1 - t * 0.5).toFixed(4);
    });
  }, []);

  useEffect(() => {
    const scroll = scrollRef.current;
    const list = listRef.current;
    const firstRow = list?.querySelector<HTMLDivElement>("[data-row]");
    if (!scroll || !list || !firstRow) return;

    const pad = Math.max(0, scroll.clientHeight / 2 - firstRow.offsetHeight / 2);
    list.style.paddingTop = `${pad}px`;
    list.style.paddingBottom = `${pad}px`;
    updateFocal();
  }, [updateFocal, breaks.length]);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    let pending = false;
    const onScroll = () => {
      if (!pending) {
        pending = true;
        rafRef.current = requestAnimationFrame(() => { updateFocal(); pending = false; });
      }
    };
    scroll.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroll.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateFocal]);

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none z-10"
        style={{ height: "28%", background: "linear-gradient(to bottom, #0C0C0C 0%, transparent 100%)" }} />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
        style={{ height: "28%", background: "linear-gradient(to top, #0C0C0C 0%, transparent 100%)" }} />
      {/* Center selection band */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none z-10"
        style={{ height: 68, borderTop: "1px solid rgba(255,255,255,0.055)", borderBottom: "1px solid rgba(255,255,255,0.055)" }} />

      <div
        ref={scrollRef}
        className="h-full overflow-y-scroll scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" } as React.CSSProperties}
      >
        <div ref={listRef} className="max-w-[860px] mx-auto px-10">
          {breaks.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-center">
              <div>
                <div className="text-[13px] font-semibold mb-1" style={{ color: "#444" }}>
                  No breaks in the vault yet
                </div>
                <div className="text-[11px]" style={{ color: "#2A2A2A" }}>
                  Check back soon. New breaks are added regularly.
                </div>
              </div>
            </div>
          ) : breaks.map((b, i) => (
            <div key={b.id} data-row="">
              <BreakRow
                drumBreak={b}
                index={i}
                onCollect={onCollect}
                onDownload={onDownload}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

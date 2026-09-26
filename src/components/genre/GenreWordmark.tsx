"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// useLayoutEffect warns during SSR; fall back to useEffect on the server
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Giant footer-style title that fills the container width exactly.
 * On narrow screens each word gets its own line so it stays big.
 */
export function GenreWordmark({ text, className, fontClassName }: { text: string; className?: string; fontClassName: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [stacked, setStacked] = useState(false);
  const [size, setSize] = useState<number | null>(null);
  const words = text.toUpperCase().split(/\s+/);
  const lines = stacked ? words : [words.join(" ")];

  useIsoLayoutEffect(() => {
    const fit = () => {
      const box = boxRef.current;
      const probe = measureRef.current;
      if (!box || !probe) return;
      const width = box.clientWidth;
      const stack = width < 640 && words.length > 1;
      // Measure each line at 100px and scale to the container width
      const widths = (stack ? words : [words.join(" ")]).map((line) => {
        probe.textContent = line;
        return probe.getBoundingClientRect().width;
      });
      const next = Math.min(Math.floor((width / Math.max(...widths)) * 100 * 0.98), 260);
      setStacked(stack);
      setSize(next);
    };
    fit();
    document.fonts?.ready.then(fit);
    const observer = new ResizeObserver(fit);
    if (boxRef.current) observer.observe(boxRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div ref={boxRef} className="relative w-full">
      {/* Hidden probe used for measuring */}
      <span
        ref={measureRef}
        aria-hidden
        className={`${fontClassName} pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap font-bold uppercase leading-none tracking-[-0.02em]`}
        style={{ fontSize: 100 }}
      />
      <div
        aria-hidden
        className={`${fontClassName} ${className ?? ""} font-bold uppercase leading-[0.9] tracking-[-0.02em] transition-opacity duration-300 ${size ? "opacity-100" : "opacity-0"}`}
        style={{ fontSize: size ?? 96 }}
      >
        {lines.map((line) => (
          <span key={line} className="block whitespace-nowrap">
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}

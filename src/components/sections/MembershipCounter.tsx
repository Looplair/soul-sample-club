"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue } from "framer-motion";

const CAP = 5000;
const MIN_TARGET = 3050;
const MAX_TARGET = 3250;
const COUNT_DURATION = 2.2;
const HOLD_MS = 1400;
const RESET_DURATION = 0.5;
const PAUSE_MS = 400;

function randomTarget(): number {
  return Math.floor(MIN_TARGET + Math.random() * (MAX_TARGET - MIN_TARGET));
}

function interpolateColor(c1: string, c2: string, t: number): string {
  const hex = (c: string) => [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = hex(c1);
  const [r2, g2, b2] = hex(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function colorForProgress(progress: number): string {
  if (progress < 0.5) return interpolateColor("#ffffff", "#f59e0b", progress / 0.5);
  return interpolateColor("#f59e0b", "#fb7185", (progress - 0.5) / 0.5);
}

export function MembershipCounter() {
  const [display, setDisplay] = useState(0);
  const count = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const runLoop = () => {
      if (cancelledRef.current) return;
      animate(count, randomTarget(), {
        duration: COUNT_DURATION,
        ease: "easeOut",
        onUpdate: (v) => setDisplay(Math.floor(v)),
        onComplete: () => {
          if (cancelledRef.current) return;
          const holdTimeout = setTimeout(() => {
            if (cancelledRef.current) return;
            animate(count, 0, {
              duration: RESET_DURATION,
              ease: "easeIn",
              onUpdate: (v) => setDisplay(Math.floor(v)),
              onComplete: () => {
                if (cancelledRef.current) return;
                const pauseTimeout = setTimeout(runLoop, PAUSE_MS);
                timeouts.push(pauseTimeout);
              },
            });
          }, HOLD_MS);
          timeouts.push(holdTimeout);
        },
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStartedRef.current) {
          hasStartedRef.current = true;
          observer.disconnect();
          runLoop();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelledRef.current = true;
      timeouts.forEach(clearTimeout);
    };
  }, [count]);

  const progress = Math.min(display / CAP, 1);
  const color = colorForProgress(progress);

  return (
    <div ref={ref} className="text-center">
      <div
        className="text-2xl sm:text-3xl font-bold tabular-nums transition-colors"
        style={{ color }}
      >
        {display.toLocaleString()}
      </div>
      <div className="text-sm text-text-muted">of {CAP.toLocaleString()} members</div>
      <div className="w-16 sm:w-20 h-1 rounded-full bg-white/10 overflow-hidden mt-1.5 mx-auto">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${progress * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

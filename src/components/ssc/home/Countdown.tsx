"use client";

import { useEffect, useState } from "react";

/** Days / hours / minutes / seconds to a deadline. Renders nothing once it has passed. */
export function Countdown({ to, label }: { to: string; label?: string }) {
  const end = Date.parse(to);
  // Null on the server and the first client paint, so the markup matches before the clock starts
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = now === null ? null : Math.max(0, end - now);
  if (left === 0) return null;

  const parts = [
    { v: left === null ? null : Math.floor(left / 86400000), l: "days" },
    { v: left === null ? null : Math.floor(left / 3600000) % 24, l: "hrs" },
    { v: left === null ? null : Math.floor(left / 60000) % 60, l: "min" },
    { v: left === null ? null : Math.floor(left / 1000) % 60, l: "sec" },
  ];

  return (
    <div className="flex flex-col items-start gap-2">
      {label && <p className="ssc-label">{label}</p>}
      <div className="flex gap-2" role="timer" aria-live="off">
        {parts.map((p) => (
          <div key={p.l} className="min-w-[62px] rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center">
            <div className="ssc-display text-[28px] leading-none tabular-nums">{p.v === null ? "--" : String(p.v).padStart(2, "0")}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/55">{p.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

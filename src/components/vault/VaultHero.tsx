// src/components/vault/VaultHero.tsx
"use client";

import type { ReactNode } from "react";

interface VaultHeroProps {
  stats: { collected: number; total: number };
  backLink?: ReactNode;
}

export function VaultHero({ stats, backLink }: VaultHeroProps) {
  const pct = stats.total > 0 ? Math.round((stats.collected / stats.total) * 100) : 0;

  return (
    <div className="relative overflow-hidden flex-shrink-0" style={{ padding: "44px 40px 32px" }}>
      {/* Ambient top glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 100%)",
        }}
      />
      <div className="relative z-10 max-w-[860px] mx-auto">
        {backLink && (
          <div className="flex justify-end mb-4">{backLink}</div>
        )}
        <h1
          className="font-extrabold leading-none mb-3"
          style={{
            fontSize: "clamp(48px, 8vw, 80px)",
            letterSpacing: "-0.04em",
            background: "linear-gradient(90deg,#fff 0%,#fff 35%,#666 50%,#fff 65%,#fff 100%)",
            backgroundSize: "250% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "shimmer 6s linear infinite",
          }}
        >
          Drum<br /><span className="font-light">Vault.</span>
        </h1>
        <style>{`@keyframes shimmer { from{background-position:100% 0} to{background-position:-100% 0} }`}</style>

        <p className="text-sm text-[#3A3A3A] mb-1.5 max-w-[420px] leading-relaxed">
          Members-only drum breaks. Original, raw, dope.
        </p>
        <p className="text-[11px] text-[#2A2A2A] mb-5 max-w-[420px] leading-relaxed tracking-[0.02em]">
          We&apos;ll notify you when new breaks drop.
        </p>

        {/* Stats */}
        <div
          className="flex items-stretch overflow-hidden w-fit mb-5 rounded-[13px]"
          style={{ gap: "1px", background: "#181818", border: "1px solid #181818" }}
        >
          {[
            { n: stats.collected, unit: "collected", label: "Your haul" },
            { n: stats.total, unit: "total", label: "In the vault" },
            { n: `${pct}`, unit: "%", label: "Complete" },
          ].map((s, i) => (
            <div
              key={i}
              className="flex flex-col gap-0.5"
              style={{ padding: "10px 20px", background: "#111", borderLeft: i > 0 ? "1px solid #181818" : undefined }}
            >
              <div className="text-[18px] font-bold tracking-tight text-white">
                {s.n} <span className="text-[12px] font-normal text-[#333]">{s.unit}</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.1em] text-[#333] font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="flex justify-between mb-1.5 max-w-[480px]">
          <span className="text-[11px] text-[#2E2E2E] font-medium tracking-[0.04em]">Collection progress</span>
          <span className="text-[12px] font-bold text-[#444]">{pct}%</span>
        </div>
        <div className="max-w-[480px] h-[3px] rounded-full relative" style={{ background: "#181818" }}>
          <div
            className="h-full rounded-full relative transition-all duration-700"
            style={{ background: "#fff", width: `${pct}%` }}
          >
            <div
              className="absolute -right-px top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-white"
              style={{ boxShadow: "0 0 10px rgba(255,255,255,.7)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Scarcity banner — sits above the nav inside the fixed homepage header.
 * Holographic shifting gradient, signals limited capacity, drives signups.
 */
export function ScarcityBanner() {
  return (
    <div className="relative h-10 overflow-hidden flex items-center justify-center">
      {/* Animated holographic gradient */}
      <div
        className="absolute inset-0 animate-holo-shift"
        style={{
          background:
            "linear-gradient(90deg, #6C63FF, #a855f7, #ec4899, #FFD93D, #6C63FF, #a855f7, #6C63FF)",
          backgroundSize: "300% 100%",
        }}
      />
      {/* Subtle dark overlay so text stays legible */}
      <div className="absolute inset-0 bg-black/30" />
      {/* Moving shimmer highlight */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.7) 50%, transparent 65%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 3s linear infinite",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-4 text-white">
        <Sparkles className="w-3 h-3 flex-shrink-0 text-yellow-200/90" />

        <span className="hidden sm:inline text-[11px] uppercase tracking-[0.18em] font-light text-white/90">
          Membership filling up · Limited spots remaining
        </span>
        <span className="sm:hidden text-[11px] uppercase tracking-[0.15em] font-light text-white/90">
          Limited spots remaining
        </span>

        <Link
          href="/signup"
          className="bg-white text-charcoal px-3 py-0.5 rounded-full text-[11px] tracking-wide font-semibold
                     hover:bg-white/90 active:scale-95 transition-all whitespace-nowrap"
        >
          Start for $0.99 →
        </Link>
      </div>
    </div>
  );
}

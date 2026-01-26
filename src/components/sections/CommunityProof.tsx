"use client";

import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";

// ============================================
// CONFIGURATION
// ============================================

// Badge above the number
const BADGE_TEXT = "ACTIVE COMMUNITY";

// The target count (static for now, can be wired to real data later)
const TARGET_COUNT = 1000;

// Membership cap
const MEMBERSHIP_CAP = 5000;

// Headline beneath the number
const HEADLINE = "Producers already inside the club";

// Supporting paragraph
const DESCRIPTION =
  "Producers who value originality and want zero friction. No clearance stress, no usage limits, no surprises down the line, just sounds they can trust.";

// Trust badges
const TRUST_BADGES = [
  "Pre-cleared sounds",
  "No usage limits",
  "Trusted by working producers",
];

// Expiration notice
const EXPIRATION_BADGE = "Packs expire after 90 days";

// Membership cap explanation paragraphs
const MEMBERSHIP_CAP_PARAGRAPHS = [
  "At scale, overlap becomes the default.",
  "A YouTube sample can be downloaded 10,000 times in a day. On major platforms, millions of producers scroll the same sounds every month. That's how those systems are built.",
  "There are roughly 75 million music producers worldwide. Even at full capacity, Soul Sample Club exists well under 0.01% of that ecosystem.",
  "Soul Sample Club isn't built for infinite reach. It's built for a fixed number of producers who want source material before it turns into noise.",
  "That's why membership is currently capped at 5,000. Not to create hype, but to keep the work usable. If growth ever demands it, we'd segment libraries rather than broadcast the same material at mass scale.",
  "And because every composition inside the club is written and owned in-house, the royalty free promise is absolute. No grey areas. No downstream questions. Just music you can actually use.",
];

// Animation settings
const ANIMATION_DURATION = 1200; // ms

// ============================================
// HOOKS
// ============================================

function useCountUp(target: number, duration: number, shouldStart: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const easeOutQuart = (t: number): number => {
      return 1 - Math.pow(1 - t, 4);
    };

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easedProgress = easeOutQuart(progress);
      const currentCount = Math.floor(easedProgress * target);

      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [target, duration, shouldStart]);

  return count;
}

function useInView(threshold = 0.3) {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

// ============================================
// MODAL COMPONENT
// ============================================

function MembershipCapModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-grey-900 border border-grey-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-grey-900 border-b border-grey-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">
            Why we cap membership
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {MEMBERSHIP_CAP_PARAGRAPHS.map((paragraph, index) => (
            <p
              key={index}
              className={`text-base leading-relaxed ${
                index === 0
                  ? "text-white font-medium text-lg"
                  : "text-white/70"
              }`}
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-grey-900 border-t border-grey-700 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-white text-charcoal font-medium rounded-lg hover:bg-white/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENT
// ============================================

export function CommunityProof() {
  const { ref, isInView } = useInView(0.3);
  const count = useCountUp(TARGET_COUNT, ANIMATION_DURATION, isInView);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section
        ref={ref}
        className="relative bg-charcoal py-20 sm:py-28 lg:py-32 overflow-hidden"
      >
        {/* Ambient background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[400px] rounded-full bg-rose-500/8 blur-[120px]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[400px] h-[300px] rounded-full bg-amber-500/5 blur-[100px] translate-y-10" />
        </div>

        <div className="container-app relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 text-rose-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-sm text-white/70 font-medium tracking-wide">
                {BADGE_TEXT}
              </span>
            </div>

            {/* Count */}
            <div className="mb-6">
              <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white tabular-nums tracking-tight">
                {count.toLocaleString()}
                <span className="text-rose-400">+</span>
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-4">
              {HEADLINE}
            </h2>

            {/* Description */}
            <p className="text-lg text-white/50 leading-relaxed mb-10 max-w-lg mx-auto">
              {DESCRIPTION}
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {TRUST_BADGES.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/60"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {badge}
                </span>
              ))}
            </div>

            {/* Membership cap badge */}
            <div className="mt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400/90 hover:bg-rose-500/15 hover:border-rose-500/30 transition-colors cursor-pointer group"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>
                  Capped at {MEMBERSHIP_CAP.toLocaleString()} members worldwide
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            </div>

            {/* Expiration notice badge */}
            <div className="mt-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400/90">
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {EXPIRATION_BADGE}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      <MembershipCapModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

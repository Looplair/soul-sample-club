"use client";

import { useEffect, useState, useRef } from "react";

// ============================================
// CONFIGURATION
// ============================================

// Badge above the number
const BADGE_TEXT = "ACTIVE COMMUNITY";

// The target count (static for now, can be wired to real data later)
const TARGET_COUNT = 1000;

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
// COMPONENT
// ============================================

export function CommunityProof() {
  const { ref, isInView } = useInView(0.3);
  const count = useCountUp(TARGET_COUNT, ANIMATION_DURATION, isInView);

  return (
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
        </div>
      </div>
    </section>
  );
}

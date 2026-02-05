"use client";

import { useEffect, useRef, useState } from "react";
import { Quote } from "lucide-react";

// ============================================
// TESTIMONIALS DATA
// ============================================
const testimonials = [
  {
    name: "Kimba",
    quote: "One of the best decisions to jump on board at the top of 2025. Looking forward to the masterpieces. You're an inspiration.",
    timeAgo: "3mo",
  },
  {
    name: "Sef Lateef",
    quote: "Finally great musicianship. AND I FUGGIN LOVE IT!!!",
    timeAgo: "2w",
  },
  {
    name: "Joshua Spann",
    quote: "Thanks so much for quality material",
    timeAgo: "2mo",
  },
  {
    name: "Shaun D.",
    quote: "How sweet it is! Great work!",
    timeAgo: "3d",
  },
  {
    name: "Darkus Prod",
    quote: "Man I really appreciate it!",
    timeAgo: "2mo",
  },
  {
    name: "GeOhworks",
    quote: "FIRE",
    timeAgo: "3mo",
  },
  {
    name: "Von",
    quote: "Thank you",
    timeAgo: "3w",
  },
  {
    name: "Wilson",
    quote: "I jumped on it with the quickness",
    timeAgo: "2mo",
  },
  {
    name: "Pharoe",
    quote: "Looking forward to this. Appreciate it!",
    timeAgo: "2w",
  },
  {
    name: "Karlhto",
    quote: "W Pack",
    timeAgo: "4w",
  },
];

// ============================================
// TESTIMONIAL CARD COMPONENT
// ============================================
function TestimonialCard({
  name,
  quote,
  timeAgo,
  index,
}: {
  name: string;
  quote: string;
  timeAgo: string;
  index: number;
}) {
  // Generate consistent avatar color based on name
  const colors = [
    "bg-rose-500/20 text-rose-400",
    "bg-amber-500/20 text-amber-400",
    "bg-emerald-500/20 text-emerald-400",
    "bg-blue-500/20 text-blue-400",
    "bg-purple-500/20 text-purple-400",
    "bg-pink-500/20 text-pink-400",
    "bg-cyan-500/20 text-cyan-400",
    "bg-orange-500/20 text-orange-400",
  ];
  const colorIndex = name.length % colors.length;
  const avatarColor = colors[colorIndex];

  return (
    <div
      className="group relative flex-shrink-0 w-[280px] sm:w-[320px]"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="h-full p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300">
        {/* Quote icon */}
        <div className="absolute top-4 right-4 opacity-10">
          <Quote className="w-6 h-6 text-white" />
        </div>

        {/* Content */}
        <p className="text-[15px] text-white/80 leading-relaxed mb-4 pr-6">
          &ldquo;{quote}&rdquo;
        </p>

        {/* Author */}
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center flex-shrink-0`}
          >
            <span className="text-sm font-semibold">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{name}</p>
            <p className="text-xs text-white/40">Member</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function MemberTestimonials() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-scroll effect
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5; // pixels per frame

    const animate = () => {
      if (!isPaused && scrollContainer) {
        scrollPosition += scrollSpeed;

        // Reset when we've scrolled half the content (since content is duplicated)
        const halfWidth = scrollContainer.scrollWidth / 2;
        if (scrollPosition >= halfWidth) {
          scrollPosition = 0;
        }

        scrollContainer.scrollLeft = scrollPosition;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPaused]);

  // Duplicate testimonials for seamless loop
  const duplicatedTestimonials = [...testimonials, ...testimonials];

  return (
    <section className="relative bg-charcoal py-16 sm:py-20 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="container-app mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-sm text-white/40 uppercase tracking-wider font-medium mb-2">
                From the community
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                What members are saying
              </h2>
            </div>
          </div>
        </div>

        {/* Scrolling testimonials */}
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-charcoal to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-charcoal to-transparent z-10 pointer-events-none" />

          {/* Scrolling container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            <div className="flex gap-4 pl-4 sm:pl-8">
              {duplicatedTestimonials.map((testimonial, index) => (
                <TestimonialCard
                  key={`${testimonial.name}-${index}`}
                  {...testimonial}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

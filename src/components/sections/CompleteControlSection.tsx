"use client";

import { useState, useRef } from "react";
import { Play, Pause } from "lucide-react";

// ============================================
// CONFIGURATION - Edit these values to customize
// ============================================

// Pill/badge text
const PILL_TEXT = "PRE-CLEARED BY DESIGN";

// Headline (can be multi-line)
const HEADLINE_LINE_1 = "Complete control.";
const HEADLINE_LINE_2 = "From day one.";

// Supporting paragraph
const DESCRIPTION = `Every sound in the Soul Sample Club is pre-cleared and royalty-free at every stage. There are no limits, no thresholds, and no future clearance requirements. Release independently, with a major label, or years from now, nothing changes.`;

// Secondary CTA
const CTA_TEXT = "Learn about licensing";
const CTA_HREF = "/terms#license"; // Links directly to Section 5 - License to Use Samples

// Video configuration
const VIDEO_SRC = "/videos/completecontrolvideo_curtiss.mp4";

// ============================================
// COMPONENT
// ============================================

export function CompleteControlSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      // Unmute when user initiates playback
      videoRef.current.muted = false;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  return (
    <section className="bg-charcoal py-16 sm:py-24 lg:py-32">
      <div className="container-app">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Copy */}
          <div className="order-1">
            {/* Pill/Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6 sm:mb-8">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 text-emerald-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="text-sm text-emerald-400/90 font-medium tracking-wide">
                {PILL_TEXT}
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
              {HEADLINE_LINE_1}
              <br />
              {HEADLINE_LINE_2}
            </h2>

            {/* Description */}
            <p className="text-lg sm:text-xl text-white/60 leading-relaxed mb-8 max-w-xl">
              {DESCRIPTION}
            </p>

            {/* Secondary CTA */}
            <a
              href={CTA_HREF}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 text-white/80 text-sm font-medium hover:bg-white/5 hover:border-white/30 hover:text-white transition-all duration-200"
            >
              {CTA_TEXT}
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* Right Column - Video Card */}
          <div className="order-2">
            <div className="relative aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden bg-grey-800 shadow-2xl">
              {/* Video Element - #t=0.001 forces mobile browsers to show first frame as thumbnail */}
              <video
                ref={videoRef}
                preload="metadata"
                playsInline
                muted
                onEnded={handleVideoEnded}
                onClick={handlePlayPause}
                className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                src={`${VIDEO_SRC}#t=0.001`}
              />

              {/* Play/Pause Button Overlay */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                  isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
                }`}
              >
                <button
                  onClick={handlePlayPause}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-105 transition-all duration-300 group"
                >
                  {isPlaying ? (
                    <Pause
                      className="w-6 h-6 sm:w-7 sm:h-7 text-white group-hover:scale-110 transition-transform"
                      fill="currentColor"
                    />
                  ) : (
                    <Play
                      className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-1 group-hover:scale-110 transition-transform"
                      fill="currentColor"
                    />
                  )}
                </button>
              </div>

              {/* Subtle brand watermark (optional) */}
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
                <span className="text-white/30 text-sm font-medium tracking-wider">
                  SSC
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

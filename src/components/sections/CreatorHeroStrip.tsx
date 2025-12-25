"use client";

import Image from "next/image";
import { Play } from "lucide-react";

// ============================================
// CONFIGURATION - Edit these values to customize
// ============================================

// Pill/tag text above headline
const PILL_TEXT = "BUILT ON SOUL";

// Headline - the strikethrough word will have line-through styling
const HEADLINE_MAIN = "All soul.";
const HEADLINE_STRIKETHROUGH = "No filler.";

// Subheading text
const SUBHEADING = "Producers bring their best because they sample the best";

// Producer data - replace images and names as needed
const producers = [
  {
    id: 1,
    name: "Soulchef",
    image: "/placeholders/producer-1.jpg",
    accentColor: "#4A5568", // slate/grey
  },
  {
    id: 2,
    name: "Melodic",
    image: "/placeholders/producer-2.jpg",
    accentColor: "#E53E3E", // red
  },
  {
    id: 3,
    name: "VinylDigger",
    image: "/placeholders/producer-3.jpg",
    accentColor: "#718096", // cool grey
  },
  {
    id: 4,
    name: "GoldenEra",
    image: "/placeholders/producer-4.jpg",
    accentColor: "#ED8936", // orange
  },
  {
    id: 5,
    name: "Beatsinner",
    image: "/placeholders/producer-5.jpg",
    accentColor: "#1A202C", // dark
  },
  {
    id: 6,
    name: "LoFiLou",
    image: "/placeholders/producer-6.jpg",
    accentColor: "#F687B3", // pink
  },
];

// ============================================
// COMPONENT
// ============================================

export function CreatorHeroStrip() {
  return (
    <section className="bg-charcoal py-16 sm:py-24">
      {/* Text Block */}
      <div className="text-center mb-12 sm:mb-16 px-4">
        {/* Pill/Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 mb-6 sm:mb-8">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-amber-400"
            fill="currentColor"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <span className="text-sm text-white/90 font-medium tracking-wide">
            {PILL_TEXT}
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 tracking-tight">
          {HEADLINE_MAIN}{" "}
          <span className="text-rose-400 line-through decoration-rose-400 decoration-[3px]">
            {HEADLINE_STRIKETHROUGH}
          </span>
        </h2>

        {/* Subheading */}
        <p className="text-lg sm:text-xl text-white/60 max-w-xl mx-auto">
          {SUBHEADING}
        </p>
      </div>

      {/* Horizontal Creator Strip */}
      <div className="relative">
        {/* Scroll container */}
        <div
          className="flex gap-4 sm:gap-5 overflow-x-auto px-4 sm:px-8 pb-4 scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Left spacer for centering on large screens */}
          <div className="flex-shrink-0 w-0 lg:w-[calc((100vw-1280px)/2)]" />

          {producers.map((producer) => (
            <div
              key={producer.id}
              className="flex-shrink-0 group cursor-pointer"
            >
              {/* Card */}
              <div
                className="relative w-[180px] sm:w-[200px] md:w-[220px] aspect-[3/4] rounded-3xl overflow-hidden"
                style={{
                  backgroundColor: producer.accentColor,
                }}
              >
                {/* Image */}
                <Image
                  src={producer.image}
                  alt={producer.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="220px"
                  onError={(e) => {
                    // Hide broken image, show accent color background
                    e.currentTarget.style.display = "none";
                  }}
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Play button overlay - appears on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Play
                      className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-1"
                      fill="currentColor"
                    />
                  </div>
                </div>

                {/* Producer name label */}
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-block px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                    {producer.name}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Right spacer for centering on large screens */}
          <div className="flex-shrink-0 w-4 lg:w-[calc((100vw-1280px)/2)]" />
        </div>

        {/* Fade edges for scroll indication */}
        <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-charcoal to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-charcoal to-transparent pointer-events-none" />
      </div>
    </section>
  );
}

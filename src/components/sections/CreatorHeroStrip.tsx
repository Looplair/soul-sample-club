"use client";

import Image from "next/image";

// ============================================
// CONFIGURATION
// ============================================

const PILL_TEXT = "BUILT ON SOUL";

const HEADLINE_MAIN = "Supreme soul.";
const HEADLINE_STRIKETHROUGH = "No guesswork.";

const SUBHEADING = "Used by producers and artists at every level, from independent releases to major label records.";

const producers = [
  {
    id: 1,
    name: "Dave East",
    image: "/placeholders/Daveast.jpg",
    accentColor: "#4A5568",
  },
  {
    id: 2,
    name: "Statik Selektah",
    image: "/placeholders/statik.jpg",
    accentColor: "#E53E3E",
  },
  {
    id: 3,
    name: "Mick Jenkins",
    image: "/placeholders/mickjenkins.webp",
    accentColor: "#718096",
  },
  {
    id: 4,
    name: "Westside Boogie",
    image: "/placeholders/westideboogie.jpeg",
    accentColor: "#ED8936",
  },
  {
    id: 5,
    name: "Apollo Brown",
    image: "/placeholders/apollobrown.jpg",
    accentColor: "#1A202C",
  },
  {
    id: 6,
    name: "BeatsByJBlack",
    image: "/placeholders/beatsbyjblack.webp",
    accentColor: "#F687B3",
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

        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 tracking-tight">
          {HEADLINE_MAIN}{" "}
          <span className="text-rose-400 line-through decoration-rose-400 decoration-[3px]">
            {HEADLINE_STRIKETHROUGH}
          </span>
        </h2>

        <p className="text-lg sm:text-xl text-white/60 max-w-xl mx-auto">
          {SUBHEADING}
        </p>
      </div>

      {/* Creator Strip */}
      <div className="relative">
        <div
          className="flex gap-4 sm:gap-5 overflow-x-auto px-4 sm:px-8 pb-6 scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <div className="flex-shrink-0 w-0 lg:w-[calc((100vw-1280px)/2)]" />

          {producers.map((producer) => (
            <div key={producer.id} className="flex-shrink-0 group">
              <div
                className="relative w-[180px] sm:w-[200px] md:w-[220px] aspect-[3/4] rounded-3xl overflow-hidden transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-2xl shadow-black/30"
                style={{ backgroundColor: producer.accentColor }}
              >
                <Image
                  src={producer.image}
                  alt={producer.name}
                  fill
                  sizes="220px"
                  className="object-cover transition-all duration-500 group-hover:scale-[1.05] group-hover:brightness-110"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Name */}
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-block px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                    {producer.name}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <div className="flex-shrink-0 w-4 lg:w-[calc((100vw-1280px)/2)]" />
        </div>

        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-6 w-8 bg-gradient-to-r from-charcoal to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-6 w-8 bg-gradient-to-l from-charcoal to-transparent pointer-events-none" />
      </div>
    </section>
  );
}

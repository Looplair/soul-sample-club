"use client";

import Image from "next/image";

// ============================================
// CONFIGURATION
// ============================================

const PILL_TEXT = "BUILT ON SOUL";

const HEADLINE_MAIN = "Supreme soul.";
const HEADLINE_STRIKETHROUGH = "Generic.";

const SUBHEADING = "Our sounds have been used by everyone from independent artists to industry heavyweights.";

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
    image: "/placeholders/mickjenkins.jpg",
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
    <section className="bg-charcoal py-16 sm:py-24 overflow-hidden">
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

      {/* Creator Strip - Centered grid on desktop, scrollable on mobile */}
      <div className="relative px-4 sm:px-8">
        {/* Desktop: Centered flex layout */}
        <div className="hidden md:flex justify-center gap-5 lg:gap-6">
          {producers.map((producer) => (
            <div key={producer.id} className="group">
              <div
                className="relative w-[180px] lg:w-[200px] aspect-[3/4] rounded-3xl overflow-hidden transition-all duration-500 group-hover:-translate-y-2 group-hover:scale-[1.02]"
                style={{ backgroundColor: producer.accentColor }}
              >
                {/* Subtle inner shadow for depth */}
                <div className="absolute inset-0 rounded-3xl shadow-[inset_0_0_30px_rgba(0,0,0,0.3)] z-10 pointer-events-none" />

                {/* Border highlight on hover */}
                <div className="absolute inset-0 rounded-3xl border border-white/0 group-hover:border-white/20 transition-colors duration-500 z-10 pointer-events-none" />

                <Image
                  src={producer.image}
                  alt={producer.name}
                  fill
                  sizes="200px"
                  className="object-cover transition-all duration-700 group-hover:scale-[1.05] group-hover:brightness-110"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Top shine on hover */}
                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/0 group-hover:from-white/10 to-transparent transition-all duration-500" />

                {/* Name badge */}
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-white text-sm font-medium border border-white/10 transition-all duration-300 group-hover:bg-black/70 group-hover:border-white/20">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: producer.accentColor }}
                    />
                    {producer.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: Horizontal scroll */}
        <div
          className="flex md:hidden gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {producers.map((producer) => (
            <div key={producer.id} className="flex-shrink-0 snap-center first:ml-4 last:mr-4">
              <div
                className="relative w-[160px] sm:w-[180px] aspect-[3/4] rounded-2xl overflow-hidden"
                style={{ backgroundColor: producer.accentColor }}
              >
                <Image
                  src={producer.image}
                  alt={producer.name}
                  fill
                  sizes="180px"
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Name badge */}
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-medium border border-white/10">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: producer.accentColor }}
                    />
                    {producer.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile fade edges */}
        <div className="md:hidden absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-charcoal to-transparent pointer-events-none z-10" />
        <div className="md:hidden absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-charcoal to-transparent pointer-events-none z-10" />
      </div>
    </section>
  );
}

import Link from "next/link";

export function YearlyOfferBanner() {
  return (
    <div
      className="relative h-10 overflow-hidden flex items-center justify-center"
      style={{ background: "#07070f" }}
    >
      {/* Iridescent foil bands — colour moves over a dark base, not the other way around */}
      <div
        className="absolute inset-0 animate-holo-shift"
        style={{
          backgroundImage:
            "linear-gradient(105deg, transparent 0%, rgba(80,40,255,0.55) 18%, rgba(0,200,255,0.45) 34%, rgba(80,255,200,0.35) 48%, rgba(255,40,200,0.5) 62%, rgba(255,200,0,0.35) 78%, transparent 100%)",
          backgroundSize: "300% 100%",
        }}
      />
      {/* White light sweep — gives the "foil catching light" moment */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.13) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2.2s linear infinite",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-4">
        <span className="hidden sm:inline text-[11px] uppercase tracking-[0.2em] font-light text-white/85">
          Full year · $49 · Lock in your rate before prices rise
        </span>
        <span className="sm:hidden text-[11px] uppercase tracking-[0.16em] font-light text-white/85">
          Full year · $49/yr
        </span>
        <Link
          href="/signup?redirect=/subscribe?plan=yearly"
          className="bg-white/95 text-[#07070f] px-3 py-0.5 rounded-full text-[11px] tracking-wide font-semibold hover:bg-white active:scale-95 transition-all whitespace-nowrap"
        >
          Get yearly →
        </Link>
      </div>
    </div>
  );
}

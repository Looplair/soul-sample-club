import Link from "next/link";

export function YearlyOfferBanner() {
  return (
    <div className="h-10 flex items-center justify-center gap-3 sm:gap-5 px-4 bg-charcoal border-b border-white/10">
      <p className="text-[11px] sm:text-xs text-white/60 tracking-wide">
        <span className="text-white font-semibold">Full year of Soul Sample Club</span>
        <span className="hidden sm:inline"> · Lock in $49/year before prices rise</span>
      </p>
      <Link
        href="/signup?redirect=/subscribe?plan=yearly"
        className="flex-shrink-0 bg-white text-charcoal text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] px-3 py-1 rounded-full hover:bg-white/90 active:scale-95 transition-all whitespace-nowrap"
      >
        Get yearly →
      </Link>
    </div>
  );
}

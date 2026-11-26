"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BLACK_FRIDAY } from "@/lib/black-friday";

// Not on the deal page itself, checkout, billing or admin
const HIDDEN = /^\/(black-friday|checkout|billing|switch-yearly|admin)(\/|$)/;

/** Slim white strip across the top of every page while Black Friday is on (the layout decides that). */
export function BlackFridayBanner() {
  const pathname = usePathname() ?? "/";
  if (HIDDEN.test(pathname)) return null;

  return (
    <Link
      href="/black-friday"
      className="group relative z-50 flex h-10 items-center justify-center gap-2 whitespace-nowrap bg-white px-3 text-black sm:gap-3 sm:px-4"
    >
      <span className="[font-family:var(--font-display)] text-[11px] font-extrabold uppercase tracking-[0.12em] sm:text-[12px]">
        Black Friday
      </span>
      <span className="hidden h-1 w-1 rounded-full bg-black/40 sm:block" />
      <span className="text-[12px] font-medium sm:text-[13px]">
        <span className="sm:hidden">A year for {BLACK_FRIDAY.price}</span>
        <span className="hidden sm:inline">A whole year for {BLACK_FRIDAY.price}</span>
        <span className="hidden text-black/55 sm:inline"> · {BLACK_FRIDAY.endsLabel}</span>
      </span>
      <span className="rounded-full bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-transform group-hover:translate-x-0.5 sm:text-[11px]">
        Get it →
      </span>
    </Link>
  );
}

// Black Friday 2026: a year of Soul Sample Club for $49 (the plain yearly price,
// with the usual $35 yearly coupon switched off). Client-safe, no server imports.
//
// LIVE switches it on. It switches itself off at END (Mon 30 Nov, 11:59pm New York),
// and the site goes back to exactly how it was before (the $35 yearly offer).

export const BLACK_FRIDAY = {
  LIVE: false,
  END: "2026-12-01T04:59:00Z", // Mon 30 Nov 2026, 11:59pm New York
  price: "$49",
  /** What a year costs paying monthly, for the comparison */
  monthlyYear: "$83.88",
  endsLabel: "Ends Mon 30 Nov",
} as const;

export function blackFridayOn(now: number = Date.now()): boolean {
  return BLACK_FRIDAY.LIVE && now < Date.parse(BLACK_FRIDAY.END);
}

/** The yearly price people see, and the few words that go with it. */
export function yearlyOffer() {
  return blackFridayOn()
    ? { price: BLACK_FRIDAY.price, was: BLACK_FRIDAY.monthlyYear, note: "Black Friday price", href: "/black-friday" }
    : { price: "$35", was: "$49", note: "offer price", href: null as string | null };
}

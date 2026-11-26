// Yearly pricing (Nov 2026): the $35 offer is gone for good.
// Black Friday: a year for $49 (the original yearly price). After it: $59 a year.
// Client-safe, no server imports.
//
// LIVE switches Black Friday on. It switches itself off at END (Mon 30 Nov,
// 11:59pm New York): the banner goes and yearly becomes $59.

export const BLACK_FRIDAY = {
  LIVE: true,
  END: "2026-12-01T04:59:00Z", // Mon 30 Nov 2026, 11:59pm New York
  price: "$49",
  /** What a year costs paying monthly, for the comparison */
  monthlyYear: "$83.88",
  endsLabel: "Ends Mon 30 Nov",
} as const;

/**
 * The $59/year Stripe price used once Black Friday is over. Until it's filled in,
 * yearly stays at $49 everywhere (site and checkout agree either way).
 */
export const YEARLY_59_PRICE_ID: string = "price_1Ug3JnK1yj9piOqqYOkcoxiP"; // live, $59/year

export function blackFridayOn(now: number = Date.now()): boolean {
  return BLACK_FRIDAY.LIVE && now < Date.parse(BLACK_FRIDAY.END);
}

/** The yearly price people see, and the few words that go with it. */
export function yearlyOffer() {
  if (blackFridayOn()) {
    return {
      price: BLACK_FRIDAY.price,
      was: BLACK_FRIDAY.monthlyYear,
      note: "Black Friday price",
      save: "over 40%",
      fine: "Black Friday price. Ends Mon 30 Nov.",
      href: "/black-friday" as string | null,
    };
  }
  const is59 = !!YEARLY_59_PRICE_ID;
  return {
    price: is59 ? "$59" : "$49",
    was: BLACK_FRIDAY.monthlyYear,
    note: is59 ? "save 30%" : "save over 40%",
    save: is59 ? "30%" : "over 40%",
    fine: "Billed once a year.",
    href: null as string | null,
  };
}

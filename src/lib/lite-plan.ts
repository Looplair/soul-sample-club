// Lite: $3.99 a month, one pack a month. Client-safe labels only (no server imports).
// Server checks are in src/lib/lite.ts.

export const LITE = {
  price: "$3.99",
  fullPrice: "$6.99",
  /** How much more the full membership is, for the upgrade lock */
  extra: "$3",
} as const;

export type Plan = "full" | "lite";

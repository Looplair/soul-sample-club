import Stripe from "stripe";
import { blackFridayOn, YEARLY_59_PRICE_ID } from "@/lib/black-friday";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!;
export const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID!;

// The $35 yearly offer ($14 off forever, coupon "wjveVSUF") ended Nov 2026.
// Members who already have it keep it; nobody new gets it.
export const YEARLY_OFFER_COUPON: string = "";

/** The coupon new yearly memberships get: none now the $35 offer has ended. */
export function yearlyCoupon(): string {
  return YEARLY_OFFER_COUPON;
}

/** Yearly price for new yearly memberships: $49 during Black Friday, $59 after (once that price exists). */
export function yearlyPriceId(): string {
  return blackFridayOn() || !YEARLY_59_PRICE_ID ? STRIPE_YEARLY_PRICE_ID : YEARLY_59_PRICE_ID;
}

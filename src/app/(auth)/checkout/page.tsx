import { promoFromCookies } from "@/lib/promo";
import { CheckoutClient } from "./CheckoutClient";

// Starts Stripe checkout for the signed-in user. Visitors from a promo link
// see their deal while they're sent on.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const promo = await promoFromCookies();
  return <CheckoutClient promoLine={promo?.line ?? null} />;
}

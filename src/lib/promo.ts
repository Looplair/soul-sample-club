import { cookies } from "next/headers";
import { stripe, STRIPE_PRICE_ID } from "@/lib/stripe";
import { PROMO_COOKIE, PROMO_CODE_PATTERN } from "@/lib/promo-cookie";

// Promo links (/join?promo=CODE, e.g. the SOUL3 Meta campaign). The middleware
// stores the code in a first-party cookie so it survives sign-in, sign-up,
// password reset and OAuth. The cookie is never trusted: the code is looked up
// in Stripe every time, and anything that doesn't check out falls back to the
// standard offer.

// Promo deals are built on this monthly price. The product's default_price is
// an old $3.99 price, so live mode always names this one explicitly.
const LIVE_MONTHLY_PRICE_ID = "price_1ToNr6K1yj9piOqqckePCWmy";

export function promoPriceId(): string {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? LIVE_MONTHLY_PRICE_ID : STRIPE_PRICE_ID;
}

export interface Promo {
  /** Stripe promotion code ID, passed to Checkout as discounts: [{ promotion_code }] */
  id: string;
  code: string;
  priceId: string;
  /** First charge in dollars, for the Meta event value */
  firstChargeValue: number;
  /** e.g. "$3.99/month for your first 3 months, then $6.99/month. Cancel anytime." */
  line: string;
  /** e.g. "$3.99" */
  firstPrice: string;
}

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Looks the code up in Stripe; null for anything missing, invalid, expired or not for this price */
export async function resolvePromo(code: string | null | undefined): Promise<Promo | null> {
  if (!code || !PROMO_CODE_PATTERN.test(code)) return null;
  try {
    const priceId = promoPriceId();
    const [{ data }, price] = await Promise.all([
      stripe.promotionCodes.list({ code, active: true, limit: 1, expand: ["data.coupon.applies_to"] }),
      stripe.prices.retrieve(priceId),
    ]);
    const promo = data[0];
    const coupon = promo?.coupon;
    if (!promo || !coupon?.valid) return null;
    if (promo.expires_at && promo.expires_at * 1000 <= Date.now()) return null;
    if (promo.max_redemptions && promo.times_redeemed >= promo.max_redemptions) return null;

    const productId = typeof price.product === "string" ? price.product : price.product.id;
    if (coupon.applies_to && !coupon.applies_to.products.includes(productId)) return null;
    if (coupon.currency && coupon.currency !== price.currency) return null;

    const full = price.unit_amount ?? 0;
    const off = coupon.amount_off ?? Math.round((full * (coupon.percent_off ?? 0)) / 100);
    const first = Math.max(0, full - off);
    if (!full || first === full) return null;

    const months = coupon.duration === "repeating" ? coupon.duration_in_months ?? 1 : 1;
    const line =
      coupon.duration === "forever"
        ? `${dollars(first)}/month. Cancel anytime.`
        : `${dollars(first)}/month for your first ${months === 1 ? "month" : `${months} months`}, then ${dollars(full)}/month. Cancel anytime.`;

    return { id: promo.id, code: promo.code, priceId, firstChargeValue: first / 100, line, firstPrice: dollars(first) };
  } catch (error) {
    console.error("Promo lookup failed, using the standard offer:", error);
    return null;
  }
}

/** The visitor's promo from their cookie, if it's still good */
export async function promoFromCookies(): Promise<Promo | null> {
  const cookieStore = await cookies();
  return resolvePromo(cookieStore.get(PROMO_COOKIE)?.value);
}

/** utm_ parameters saved from the promo link, for checkout metadata */
export function parseUtmCookie(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (/^utm_[a-z_]{1,20}$/.test(k) && typeof v === "string") out[k] = v.slice(0, 200);
    }
    return out;
  } catch {
    return {};
  }
}

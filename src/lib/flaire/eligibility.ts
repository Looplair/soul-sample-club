/**
 * Flaire credits: who counts as a member, and who has earned the free credits.
 *
 * Pure functions with no imports, so the rules can be checked on their own
 * (tools/check-flaire-eligibility.mjs). The server side that feeds them real
 * rows from Supabase and facts from Stripe lives in ./membership.ts.
 *
 * active   = member access under the site's own rules: a subscription row that
 *            is active or trialing with current_period_end still ahead (the
 *            same check the feed and download routes use), or an active
 *            Patreon link. past_due has no access (decided 25 Sep 2026).
 * eligible = active AND past the cheap intro:
 *            - yearly Stripe plan, or
 *            - a monthly Stripe member with at least one paid subscription
 *              invoice that wasn't cut by an intro discount (a coupon with
 *              duration "once" or "repeating", e.g. the $0.99 first month, the
 *              $1.99 x 3 free-pack offer, promo-link deals). Forever coupons
 *              are someone's normal price, so they count as full price.
 *            - an active Patreon link, or
 *            - a manual grant from the admin panel (not an intro).
 */

export type FlairePlan = "yearly" | "monthly" | "patreon" | "manual";

export interface FlaireMembership {
  active: boolean;
  eligible: boolean;
  plan: FlairePlan | null;
}

/**
 * The account page's Flaire entry: already linked, ready to link, first full
 * month still to come, or nothing (not a member).
 */
export type FlaireCreditsState = "connected" | "eligible" | "pending" | null;

/** Set on the SSC user's app_metadata once Flaire has linked them */
export const FLAIRE_CONNECTED_KEY = "flaire_connected_at";

export const NOT_A_MEMBER: FlaireMembership = { active: false, eligible: false, plan: null };

/** The columns of a `subscriptions` row these rules read */
export interface SubscriptionRow {
  status: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_end: string | null;
}

/** What Stripe says about one subscription */
export interface StripeSubscriptionFacts {
  /** price.recurring.interval of the subscription's first item */
  interval: string | null;
  /** The customer has paid at least one subscription invoice at full price */
  hasFullPricePaidInvoice: boolean;
}

/** The subset of a Stripe invoice that decides whether it was a full-price period */
export interface InvoiceLike {
  status: string | null;
  amount_paid: number;
  subscription: unknown;
  discounts?: Array<string | { id?: string; coupon?: { duration?: string | null } | null } | null> | null;
  total_discount_amounts?: Array<{ amount: number; discount: unknown }> | null;
}

const ACCESS_STATUSES = new Set(["active", "trialing"]);

export function isManualGrant(row: Pick<SubscriptionRow, "stripe_subscription_id">): boolean {
  return !!row.stripe_subscription_id?.startsWith("manual_");
}

export function isStripeSubscription(row: Pick<SubscriptionRow, "stripe_subscription_id">): boolean {
  return !!row.stripe_subscription_id?.startsWith("sub_");
}

/** Same rule as /feed and the download routes: active/trialing and not past its period end */
export function rowGivesAccess(row: SubscriptionRow, now: Date): boolean {
  if (!ACCESS_STATUSES.has(row.status)) return false;
  if (!row.current_period_end) return false;
  return new Date(row.current_period_end).getTime() >= now.getTime();
}

function discountId(d: unknown): string | null {
  if (typeof d === "string") return d;
  if (d && typeof d === "object" && "id" in d && typeof (d as { id: unknown }).id === "string") return (d as { id: string }).id;
  return null;
}

/**
 * A paid subscription invoice that wasn't reduced by an intro discount.
 * Discounts that weren't expanded (no coupon to read) count as intro
 * discounts whenever they took money off, so an unknown never unlocks credits.
 */
export function invoiceIsFullPrice(invoice: InvoiceLike): boolean {
  if (invoice.status !== "paid") return false;
  if (!invoice.subscription) return false;
  if (!(invoice.amount_paid > 0)) return false;

  const amountOff = new Map<string, number>();
  for (const t of invoice.total_discount_amounts ?? []) {
    const id = discountId(t.discount);
    if (id) amountOff.set(id, (amountOff.get(id) ?? 0) + t.amount);
  }
  const totalOff = (invoice.total_discount_amounts ?? []).reduce((sum, t) => sum + (t.amount || 0), 0);

  const discounts = (invoice.discounts ?? []).filter(Boolean);
  if (discounts.length === 0) return totalOff === 0;

  for (const d of discounts) {
    const id = discountId(d);
    const off = id ? amountOff.get(id) ?? 0 : totalOff;
    if (off <= 0) continue;
    const duration = typeof d === "object" && d ? d.coupon?.duration ?? null : null;
    if (duration !== "forever") return false;
  }
  return true;
}

export interface MembershipInput {
  now: Date;
  subscriptions: SubscriptionRow[];
  patreonActive: boolean;
  /** Keyed by stripe_subscription_id. Missing = Stripe couldn't be asked. */
  stripeFacts: Record<string, StripeSubscriptionFacts | undefined>;
}

/**
 * Combines everything known about one person (every account with their email).
 * Throws if a Stripe subscription decides the answer but its facts are
 * missing, so callers never report "not eligible" just because Stripe was down.
 */
export function decideMembership({ now, subscriptions, patreonActive, stripeFacts }: MembershipInput): FlaireMembership {
  const live = subscriptions.filter((row) => rowGivesAccess(row, now));
  const stripeRows = live.filter(isStripeSubscription);
  const manual = live.some(isManualGrant);
  const otherRows = live.filter((row) => !isStripeSubscription(row) && !isManualGrant(row));

  const active = live.length > 0 || patreonActive;
  if (!active) return NOT_A_MEMBER;

  let stripePlan: FlairePlan | null = null;
  let stripeEligible = false;
  let missingFacts = false;
  for (const row of stripeRows) {
    const facts = stripeFacts[row.stripe_subscription_id as string];
    if (!facts) {
      missingFacts = true;
      continue;
    }
    const yearly = facts.interval === "year";
    if (yearly) stripePlan = "yearly";
    else if (!stripePlan) stripePlan = "monthly";
    if (yearly || facts.hasFullPricePaidInvoice) stripeEligible = true;
  }

  const eligible = patreonActive || manual || stripeEligible;
  if (!eligible && missingFacts) throw new Error("Stripe facts missing for an active subscription");

  const plan: FlairePlan | null =
    stripePlan ?? (patreonActive ? "patreon" : manual ? "manual" : stripeRows.length || otherRows.length ? "monthly" : null);
  return { active: true, eligible, plan };
}

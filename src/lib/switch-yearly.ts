import type Stripe from "stripe";
import { stripe, STRIPE_YEARLY_PRICE_ID, YEARLY_OFFER_COUPON } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Monthly -> yearly switch for an existing card member, reached only from the
// unlisted /switch-yearly link. The subscription is changed in place, so there
// is never a second subscription.

export type SwitchState =
  | { kind: "no-card-sub" }
  | { kind: "payment-problem" }
  | { kind: "needs-help" }
  | { kind: "already-yearly"; renewsAt: number }
  | {
      kind: "ready";
      subscription: Stripe.Subscription;
      itemId: string;
      trialing: boolean;
      trialEndsAt: number | null;
      wasCanceling: boolean;
      currentMonthly: number;
      yearlyPrice: number;
      dueToday: number;
    };

export async function getSwitchState(userId: string): Promise<SwitchState> {
  const { data } = await createAdminClient()
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"]);

  const rows = ((data || []) as { stripe_subscription_id: string | null; status: string }[]).filter((r) =>
    String(r.stripe_subscription_id || "").startsWith("sub_")
  );
  if (rows.some((r) => r.status === "past_due")) return { kind: "payment-problem" };
  if (rows.length === 0) return { kind: "no-card-sub" };
  if (rows.length > 1) return { kind: "needs-help" };

  const subscription = await stripe.subscriptions.retrieve(rows[0].stripe_subscription_id!);
  if (subscription.status === "past_due" || subscription.status === "unpaid") return { kind: "payment-problem" };
  if (subscription.status !== "active" && subscription.status !== "trialing") return { kind: "no-card-sub" };
  if (subscription.items.data.length !== 1) return { kind: "needs-help" };

  const item = subscription.items.data[0];
  if (item.price.recurring?.interval === "year") {
    return { kind: "already-yearly", renewsAt: subscription.current_period_end };
  }

  const [yearly, coupon, preview] = await Promise.all([
    stripe.prices.retrieve(STRIPE_YEARLY_PRICE_ID),
    YEARLY_OFFER_COUPON ? stripe.coupons.retrieve(YEARLY_OFFER_COUPON) : null,
    stripe.invoices.createPreview({
      customer: subscription.customer as string,
      subscription: subscription.id,
      subscription_details: {
        items: [{ id: item.id, price: STRIPE_YEARLY_PRICE_ID }],
        proration_behavior: "always_invoice",
      },
      discounts: YEARLY_OFFER_COUPON ? [{ coupon: YEARLY_OFFER_COUPON }] : "",
    }),
  ]);

  return {
    kind: "ready",
    subscription,
    itemId: item.id,
    trialing: subscription.status === "trialing",
    trialEndsAt: subscription.trial_end,
    wasCanceling: subscription.cancel_at_period_end,
    currentMonthly: item.price.unit_amount ?? 0,
    yearlyPrice: (yearly.unit_amount ?? 0) - (coupon?.amount_off ?? 0),
    dueToday: Math.max(0, preview.amount_due),
  };
}

export async function switchToYearly(state: Extract<SwitchState, { kind: "ready" }>) {
  return stripe.subscriptions.update(state.subscription.id, {
    items: [{ id: state.itemId, price: STRIPE_YEARLY_PRICE_ID }],
    discounts: YEARLY_OFFER_COUPON ? [{ coupon: YEARLY_OFFER_COUPON }] : "",
    proration_behavior: "always_invoice",
    // A declined card leaves them on monthly, untouched
    payment_behavior: "error_if_incomplete",
    cancel_at_period_end: false,
    metadata: { ...state.subscription.metadata, switched_to_yearly_at: new Date().toISOString() },
  });
}

export const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

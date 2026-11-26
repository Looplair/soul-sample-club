import type Stripe from "stripe";
import { stripe, STRIPE_PRICE_ID, LITE_PRICE_ID } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Lite -> full membership ($6.99 a month), changed in place like the yearly
// switch, so there's never a second subscription. Today's charge is the
// difference for what's left of this month.

export type UpgradeState =
  | { kind: "not-lite" }
  | { kind: "payment-problem" }
  | { kind: "needs-help" }
  | {
      kind: "ready";
      subscription: Stripe.Subscription;
      itemId: string;
      fullMonthly: number;
      dueToday: number;
    };

export async function getUpgradeState(userId: string): Promise<UpgradeState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (createAdminClient() as any)
    .from("subscriptions")
    .select("stripe_subscription_id, status, plan")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"]);

  const rows = ((data || []) as { stripe_subscription_id: string | null; status: string; plan: string }[]).filter(
    (r) => r.plan === "lite" && String(r.stripe_subscription_id || "").startsWith("sub_")
  );
  if (rows.some((r) => r.status === "past_due")) return { kind: "payment-problem" };
  if (rows.length === 0) return { kind: "not-lite" };
  if (rows.length > 1) return { kind: "needs-help" };

  const subscription = await stripe.subscriptions.retrieve(rows[0].stripe_subscription_id!);
  if (subscription.status === "past_due" || subscription.status === "unpaid") return { kind: "payment-problem" };
  if (subscription.status !== "active" && subscription.status !== "trialing") return { kind: "not-lite" };
  const item = subscription.items.data[0];
  if (subscription.items.data.length !== 1 || item.price.id !== LITE_PRICE_ID) return { kind: "not-lite" };

  const [full, preview] = await Promise.all([
    stripe.prices.retrieve(STRIPE_PRICE_ID),
    stripe.invoices.createPreview({
      customer: subscription.customer as string,
      subscription: subscription.id,
      subscription_details: {
        items: [{ id: item.id, price: STRIPE_PRICE_ID }],
        proration_behavior: "always_invoice",
      },
    }),
  ]);

  return {
    kind: "ready",
    subscription,
    itemId: item.id,
    fullMonthly: full.unit_amount ?? 699,
    dueToday: Math.max(0, preview.amount_due),
  };
}

export async function upgradeLite(state: Extract<UpgradeState, { kind: "ready" }>) {
  return stripe.subscriptions.update(state.subscription.id, {
    items: [{ id: state.itemId, price: STRIPE_PRICE_ID }],
    proration_behavior: "always_invoice",
    // A declined card leaves them on Lite, untouched
    payment_behavior: "error_if_incomplete",
    cancel_at_period_end: false,
    metadata: { ...state.subscription.metadata, upgraded_from_lite_at: new Date().toISOString() },
  });
}

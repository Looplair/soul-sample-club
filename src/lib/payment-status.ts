import { createAdminClient } from "@/lib/supabase/admin";

export interface PastDueSubscription {
  stripe_subscription_id: string;
  stripe_customer_id: string;
}

/**
 * Returns the user's past_due subscription when a failed payment is the only
 * thing keeping them out. past_due has no access (downloads are kept forever,
 * so there is no trailing access while Stripe retries). Returns null if they
 * have access some other way (another active/trialing sub or Patreon).
 */
export async function getBlockingPastDueSubscription(userId: string): Promise<PastDueSubscription | null> {
  const admin = createAdminClient();

  const [subsResult, patreonResult] = await Promise.all([
    admin
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id, status, updated_at")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"])
      .order("updated_at", { ascending: false }),
    admin
      .from("patreon_links")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1),
  ]);

  const subs = (subsResult.data || []) as Array<PastDueSubscription & { status: string }>;
  if (subs.some((s) => s.status !== "past_due")) return null;
  if ((patreonResult.data?.length ?? 0) > 0) return null;

  const pastDue = subs.find((s) => s.status === "past_due");
  return pastDue
    ? { stripe_subscription_id: pastDue.stripe_subscription_id, stripe_customer_id: pastDue.stripe_customer_id }
    : null;
}

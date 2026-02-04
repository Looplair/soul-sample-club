"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

interface GrantAccessResult {
  success: boolean;
  message: string;
  action?: "created" | "updated" | "synced";
}

export async function grantManualAccess(email: string): Promise<GrantAccessResult> {
  // Verify caller is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, message: "Not authorized" };
  }

  const adminSupabase = createAdminClient();

  // Find user by email
  const { data: targetProfile } = await adminSupabase
    .from("profiles")
    .select("id, email")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!targetProfile) {
    return { success: false, message: `No user found with email: ${email}` };
  }

  // Check if they have an existing subscription
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingSub } = await (adminSupabase.from("subscriptions") as any)
    .select("*")
    .eq("user_id", targetProfile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingSub?.stripe_customer_id && !existingSub.stripe_customer_id.startsWith("manual_")) {
    // They have a real Stripe subscription - sync from Stripe instead
    return await syncSubscriptionFromStripe(targetProfile.id, existingSub.stripe_customer_id);
  }

  // Grant manual access (1 year from now)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminSupabase.from("subscriptions") as any).upsert(
    {
      user_id: targetProfile.id,
      stripe_customer_id: `manual_${Date.now()}`,
      stripe_subscription_id: `manual_grant_${Date.now()}`,
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: oneYearFromNow.toISOString(),
      cancel_at_period_end: false,
    },
    {
      onConflict: "user_id",
    }
  );

  if (error) {
    console.error("Error granting access:", error);
    return { success: false, message: `Database error: ${error.message}` };
  }

  return {
    success: true,
    message: `Manual access granted to ${email} until ${oneYearFromNow.toLocaleDateString()}`,
    action: existingSub ? "updated" : "created"
  };
}

export async function syncSubscriptionFromStripe(
  userId: string,
  stripeCustomerId: string
): Promise<GrantAccessResult> {
  const adminSupabase = createAdminClient();

  try {
    // Get all subscriptions for this customer from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 10,
    });

    // Find the most relevant subscription (active > trialing > past_due > canceled)
    const priorityOrder = ["active", "trialing", "past_due", "canceled"];
    const sortedSubs = subscriptions.data.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.status);
      const bIndex = priorityOrder.indexOf(b.status);
      return aIndex - bIndex;
    });

    const subscription = sortedSubs[0];

    if (!subscription) {
      return { success: false, message: "No subscriptions found in Stripe for this customer" };
    }

    // Update database with Stripe data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminSupabase.from("subscriptions") as any).upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      console.error("Error syncing subscription:", error);
      return { success: false, message: `Database error: ${error.message}` };
    }

    return {
      success: true,
      message: `Synced from Stripe: status is now "${subscription.status}"`,
      action: "synced"
    };
  } catch (err) {
    console.error("Stripe API error:", err);
    return { success: false, message: `Stripe error: ${err instanceof Error ? err.message : "Unknown error"}` };
  }
}

export async function syncUserSubscription(email: string): Promise<GrantAccessResult> {
  // Verify caller is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, message: "Not authorized" };
  }

  const adminSupabase = createAdminClient();

  // Find user by email
  const { data: targetProfile } = await adminSupabase
    .from("profiles")
    .select("id, email")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!targetProfile) {
    return { success: false, message: `No user found with email: ${email}` };
  }

  // Get their subscription to find stripe_customer_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingSub } = await (adminSupabase.from("subscriptions") as any)
    .select("stripe_customer_id")
    .eq("user_id", targetProfile.id)
    .single();

  if (!existingSub?.stripe_customer_id) {
    return { success: false, message: "User has no Stripe customer ID to sync" };
  }

  if (existingSub.stripe_customer_id.startsWith("manual_")) {
    return { success: false, message: "User has manual access, not a Stripe subscription" };
  }

  return await syncSubscriptionFromStripe(targetProfile.id, existingSub.stripe_customer_id);
}

export async function revokeAccess(email: string): Promise<GrantAccessResult> {
  // Verify caller is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, message: "Not authorized" };
  }

  const adminSupabase = createAdminClient();

  // Find user by email
  const { data: targetProfile } = await adminSupabase
    .from("profiles")
    .select("id, email")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!targetProfile) {
    return { success: false, message: `No user found with email: ${email}` };
  }

  // Update subscription to canceled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminSupabase.from("subscriptions") as any)
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", targetProfile.id);

  if (error) {
    console.error("Error revoking access:", error);
    return { success: false, message: `Database error: ${error.message}` };
  }

  return {
    success: true,
    message: `Access revoked for ${email}`,
    action: "updated"
  };
}

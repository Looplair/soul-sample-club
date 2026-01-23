import { NextResponse } from "next/server";
import { stripe, STRIPE_PRICE_ID } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const profileResult = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    const profile = profileResult.data as { email: string } | null;

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check for existing subscription (any status - to determine trial eligibility)
    const subscriptionResult = await adminSupabase
      .from("subscriptions")
      .select("stripe_customer_id, status")
      .eq("user_id", user.id)
      .limit(1);

    const existingSubscription = subscriptionResult.data?.[0] as { stripe_customer_id: string; status: string } | undefined;

    // Also check if this EMAIL has been used for any subscription before (prevent new account abuse)
    const emailSubscriptionResult = await adminSupabase
      .from("subscriptions")
      .select("id, user_id")
      .neq("user_id", user.id) // Different user
      .limit(1);

    // Join with profiles to check by email
    const profilesWithSameEmail = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("email", profile.email)
      .neq("id", user.id);

    let hasUsedTrialBefore = !!existingSubscription;

    // Check if any other account with same email has a subscription
    if (!hasUsedTrialBefore && profilesWithSameEmail.data && profilesWithSameEmail.data.length > 0) {
      const otherUserIds = profilesWithSameEmail.data.map(p => p.id);
      const otherSubs = await adminSupabase
        .from("subscriptions")
        .select("id")
        .in("user_id", otherUserIds)
        .limit(1);

      hasUsedTrialBefore = (otherSubs.data?.length ?? 0) > 0;
    }

    // Also check Stripe directly for any previous subscriptions with this email
    if (!hasUsedTrialBefore) {
      const existingCustomers = await stripe.customers.list({
        email: profile.email,
        limit: 10,
      });

      for (const customer of existingCustomers.data) {
        const customerSubs = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 1,
        });
        if (customerSubs.data.length > 0) {
          hasUsedTrialBefore = true;
          break;
        }
      }
    }

    let customerId = existingSubscription?.stripe_customer_id;

    // Create or retrieve Stripe customer
    if (!customerId) {
      // Check if customer already exists in Stripe with this email
      const existingCustomers = await stripe.customers.list({
        email: profile.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        // Update metadata if needed
        await stripe.customers.update(customerId, {
          metadata: {
            supabase_user_id: user.id,
          },
        });
      } else {
        const customer = await stripe.customers.create({
          email: profile.email,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        customerId = customer.id;
      }
    }

    // Build subscription data - only include trial if user hasn't used one before
    const subscriptionData: {
      metadata: { supabase_user_id: string };
      description: string;
      trial_period_days?: number;
    } = {
      metadata: {
        supabase_user_id: user.id,
      },
      description: "Soul Sample Club Membership",
    };

    // Only give trial if user has never had a subscription
    if (!hasUsedTrialBefore) {
      subscriptionData.trial_period_days = 7;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      subscription_data: subscriptionData,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/feed?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/feed?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      custom_text: {
        submit: {
          message: hasUsedTrialBefore
            ? "Subscribe to Soul Sample Club"
            : "Start your 7-day free trial. Cancel anytime.",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

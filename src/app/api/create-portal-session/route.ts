import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's subscription - try to find ANY subscription for this user
    const subscriptionResult = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const subscriptions = subscriptionResult.data as Array<{ stripe_customer_id: string; status: string }> | null;
    const subscription = subscriptions?.[0];

    if (subscriptionResult.error) {
      console.error("Error fetching subscription:", subscriptionResult.error);
      return NextResponse.json(
        { error: "Failed to fetch subscription data" },
        { status: 500 }
      );
    }

    if (!subscription?.stripe_customer_id) {
      console.log("No subscription found for user:", user.id);
      return NextResponse.json(
        { error: "No Stripe subscription found. If you subscribed through Patreon, manage your subscription there." },
        { status: 404 }
      );
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create portal session: ${errorMessage}` },
      { status: 500 }
    );
  }
}

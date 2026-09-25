import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBlockingPastDueSubscription } from "@/lib/payment-status";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.soulsampleclub.com";

// Sends a member with a failed payment straight to Stripe to pay it.
// Paying the open invoice fires invoice.paid, which restores access.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login?redirect=/api/billing/fix-payment`);
  }

  const pastDue = await getBlockingPastDueSubscription(user.id);
  if (!pastDue) {
    return NextResponse.redirect(`${APP_URL}/feed`);
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(pastDue.stripe_subscription_id, {
      expand: ["latest_invoice"],
    });
    const invoice = subscription.latest_invoice as Stripe.Invoice | null;

    if (invoice && invoice.status === "open" && invoice.hosted_invoice_url) {
      return NextResponse.redirect(invoice.hosted_invoice_url);
    }

    // Our row can be stale if a webhook was missed: sync it to Stripe's real status
    if (subscription.status !== "past_due" && subscription.status !== "unpaid") {
      const settled = subscription.status === "active" || subscription.status === "trialing";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (createAdminClient().from("subscriptions") as any)
        .update({ status: settled ? subscription.status : "canceled" })
        .eq("stripe_subscription_id", subscription.id);
      return NextResponse.redirect(`${APP_URL}${settled ? "/feed" : "/subscribe"}`);
    }

    // No payable invoice (e.g. already voided): let them update their card in the portal
    const portal = await stripe.billingPortal.sessions.create({
      customer: pastDue.stripe_customer_id,
      return_url: `${APP_URL}/feed`,
    });
    return NextResponse.redirect(portal.url);
  } catch (error) {
    console.error("fix-payment redirect failed:", error);
    return NextResponse.redirect(`${APP_URL}/account`);
  }
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper to get user ID from various Stripe objects
function getUserIdFromMetadata(
  obj: Stripe.Customer | Stripe.Subscription | Stripe.Checkout.Session
): string | null {
  if ("metadata" in obj && obj.metadata?.supabase_user_id) {
    return obj.metadata.supabase_user_id;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = getUserIdFromMetadata(session);

        if (!userId || !session.subscription || !session.customer) {
          console.error("Missing required data in checkout session");
          break;
        }

        // Retrieve full subscription object
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Upsert subscription in database
        const { error } = await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            status: subscription.status as any,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          },
          {
            onConflict: "stripe_subscription_id",
          }
        );

        if (error) {
          console.error("Error upserting subscription:", error);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        // Try to get user ID from subscription metadata first
        let userId = getUserIdFromMetadata(subscription);

        // If not in subscription, try customer metadata
        if (!userId) {
          const customer = await stripe.customers.retrieve(
            subscription.customer as string
          );
          if (!("deleted" in customer)) {
            userId = getUserIdFromMetadata(customer);
          }
        }

        if (!userId) {
          console.error("No user ID found for subscription:", subscription.id);
          break;
        }

        const { error } = await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            status: subscription.status as any,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          },
          {
            onConflict: "stripe_subscription_id",
          }
        );

        if (error) {
          console.error("Error upserting subscription:", error);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Error updating canceled subscription:", error);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", invoice.subscription as string);

          if (error) {
            console.error("Error updating subscription status:", error);
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          // Retrieve the latest subscription data
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );

          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: subscription.status as any,
              current_period_start: new Date(
                subscription.current_period_start * 1000
              ).toISOString(),
              current_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id);

          if (error) {
            console.error("Error updating subscription after payment:", error);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

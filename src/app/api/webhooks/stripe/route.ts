import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncUserToKlaviyo } from "@/lib/klaviyo";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// In-memory idempotency cache for processed webhook events
// For production with multiple servers, use Redis or database table
const processedEvents = new Map<string, number>();
const EVENT_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  processedEvents.forEach((timestamp, eventId) => {
    if (now - timestamp > EVENT_CACHE_TTL) {
      processedEvents.delete(eventId);
    }
  });
}, 10 * 60 * 1000); // Clean every 10 minutes

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

    // Idempotency check - skip if we've already processed this event
    if (processedEvents.has(event.id)) {
      return NextResponse.json({ received: true, cached: true });
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("subscriptions") as any).upsert(
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

        // Sync to Klaviyo with updated subscription type
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (profile) {
          const profileData = profile as { email: string; full_name: string | null };
          const subType = subscription.status === "trialing" ? "stripe_trialing" : "stripe_active";
          syncUserToKlaviyo({
            email: profileData.email,
            fullName: profileData.full_name,
            subscriptionType: subType,
          }).catch((err) => console.error("Klaviyo sync error:", err));
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("subscriptions") as any).upsert(
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

        // If user cancels during trial, cancel immediately so they don't get charged
        if (
          subscription.status === "trialing" &&
          subscription.cancel_at_period_end
        ) {
          console.log("Trial cancellation detected, canceling immediately:", subscription.id);
          try {
            await stripe.subscriptions.cancel(subscription.id);
          } catch (cancelErr) {
            console.error("Error immediately canceling trial subscription:", cancelErr);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        // Get user ID before updating
        let canceledUserId = getUserIdFromMetadata(subscription);
        if (!canceledUserId) {
          const customer = await stripe.customers.retrieve(
            subscription.customer as string
          );
          if (!("deleted" in customer)) {
            canceledUserId = getUserIdFromMetadata(customer);
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("subscriptions") as any)
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Error updating canceled subscription:", error);
        }

        // Sync to Klaviyo with canceled status
        if (canceledUserId) {
          const { data: canceledProfile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", canceledUserId)
            .single();

          if (canceledProfile) {
            const profileData = canceledProfile as { email: string; full_name: string | null };
            syncUserToKlaviyo({
              email: profileData.email,
              fullName: profileData.full_name,
              subscriptionType: "canceled",
            }).catch((err) => console.error("Klaviyo sync error:", err));
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase.from("subscriptions") as any)
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

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase.from("subscriptions") as any)
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

    // Mark event as processed
    processedEvents.set(event.id, Date.now());

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

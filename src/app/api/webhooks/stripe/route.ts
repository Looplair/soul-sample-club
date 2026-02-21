import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncUserToKlaviyo } from "@/lib/klaviyo";
import { sendStartTrialEvent } from "@/lib/meta-conversions";
import { notifyNewTrial, notifyTrialConverted } from "@/lib/notifications-admin";

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

    // Idempotency check using database - works across multiple server instances
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: idempotencyError } = await (supabase.from("webhook_events") as any)
      .insert({ event_id: event.id, event_type: event.type });

    if (idempotencyError) {
      // Unique constraint violation means we already processed this event
      if (idempotencyError.code === "23505") {
        return NextResponse.json({ received: true, deduplicated: true });
      }
      // Other DB errors - log but continue processing (fail open)
      console.warn("Webhook idempotency check error:", idempotencyError);
    }

    // Reject stale events for destructive actions (older than 1 hour)
    // This prevents delayed webhook retries from causing damage
    const eventAgeMs = Date.now() - event.created * 1000;
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const isStaleEvent = eventAgeMs > ONE_HOUR_MS;

    if (isStaleEvent && event.type === "customer.subscription.deleted") {
      console.warn(
        `Rejecting stale subscription.deleted event (${Math.round(eventAgeMs / 1000 / 60)} minutes old):`,
        event.id
      );
      // Still return 200 so Stripe doesn't keep retrying
      return NextResponse.json({ received: true, rejected: "stale_event" });
    }

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

          // Send Meta Conversions API event for new subscriptions (both trialing and active)
          if (subscription.status === "trialing" || subscription.status === "active") {
            sendStartTrialEvent({
              email: profileData.email,
              userId,
              firstName: profileData.full_name?.split(" ")[0],
            }).catch((err) => console.error("Meta Conversions API error:", err));
          }

          // Notify admin of new trial signup (only for old trial users)
          if (subscription.status === "trialing") {
            notifyNewTrial({
              email: profileData.email,
              name: profileData.full_name,
            }).catch((err) => console.error("Admin notification error:", err));
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        console.log(`Processing ${event.type}:`, {
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId: subscription.customer,
        });

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

        // CRITICAL FIX: Always fetch fresh subscription data from Stripe
        // Webhook data can be stale, especially during trial->active transitions
        const freshSubscription = await stripe.subscriptions.retrieve(subscription.id);

        console.log(`Fetched fresh subscription data:`, {
          status: freshSubscription.status,
          currentPeriodStart: new Date(freshSubscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(freshSubscription.current_period_end * 1000).toISOString(),
        });

        // When trial ends and converts to active, Stripe sends subscription.updated
        // with status=active. We should ALWAYS trust Stripe's active status.
        let resolvedSubStatus = freshSubscription.status;

        if (event.type === "customer.subscription.updated") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: existing } = await (supabase.from("subscriptions") as any)
            .select("status")
            .eq("stripe_subscription_id", freshSubscription.id)
            .single();

          // Only be protective when going FROM past_due TO trialing (not active)
          // If Stripe says active, trust it - payment went through
          if (
            existing?.status === "past_due" &&
            freshSubscription.status === "trialing"
          ) {
            // Check Stripe for the latest invoice status to confirm
            const latestInvoice = freshSubscription.latest_invoice;
            if (latestInvoice) {
              const invoice = await stripe.invoices.retrieve(
                typeof latestInvoice === "string" ? latestInvoice : latestInvoice.id
              );
              if (invoice.status === "open" || invoice.status === "uncollectible") {
                resolvedSubStatus = "past_due" as Stripe.Subscription.Status;
              }
            }
          }

          console.log(`Subscription update: existing=${existing?.status}, fresh_stripe=${freshSubscription.status}, resolved=${resolvedSubStatus}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("subscriptions") as any).upsert(
          {
            user_id: userId,
            stripe_customer_id: freshSubscription.customer as string,
            stripe_subscription_id: freshSubscription.id,
            status: resolvedSubStatus as any,
            current_period_start: new Date(
              freshSubscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              freshSubscription.current_period_end * 1000
            ).toISOString(),
            cancel_at_period_end: freshSubscription.cancel_at_period_end,
          },
          {
            onConflict: "stripe_subscription_id",
          }
        );

        if (error) {
          console.error("Error upserting subscription:", error);
        }

        // Sync to Klaviyo when subscription status changes
        const { data: subProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (subProfile) {
          const profileData = subProfile as { email: string; full_name: string | null };
          let klaviyoType: "stripe_active" | "stripe_trialing" | "canceled" = "stripe_active";

          if (resolvedSubStatus === "trialing") {
            klaviyoType = "stripe_trialing";
          } else if (resolvedSubStatus === "canceled") {
            klaviyoType = "canceled";
          }

          console.log(`Syncing to Klaviyo: ${profileData.email} - ${klaviyoType}`);

          syncUserToKlaviyo({
            email: profileData.email,
            fullName: profileData.full_name,
            subscriptionType: klaviyoType,
          }).catch((err) => console.error("Klaviyo sync error:", err));

          // Notify admin when trial converts to paid
          if (event.type === "customer.subscription.updated" && resolvedSubStatus === "active") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: previousSub } = await (supabase.from("subscriptions") as any)
              .select("status")
              .eq("stripe_subscription_id", freshSubscription.id)
              .single();

            if (previousSub?.status === "trialing") {
              console.log("Trial converted to active, notifying admin");
              notifyTrialConverted({
                email: profileData.email,
                name: profileData.full_name,
              }).catch((err) => console.error("Admin notification error:", err));
            }
          }
        }

        // If user cancels during trial, cancel immediately so they don't get charged
        if (
          freshSubscription.status === "trialing" &&
          freshSubscription.cancel_at_period_end
        ) {
          console.log("Trial cancellation detected, canceling immediately:", freshSubscription.id);
          try {
            await stripe.subscriptions.cancel(freshSubscription.id);
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

        // Only cancel if there isn't a newer active subscription for this user.
        // This prevents out-of-order webhook events from clobbering a new subscription.
        if (canceledUserId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: activeSubs } = await (supabase.from("subscriptions") as any)
            .select("id")
            .eq("user_id", canceledUserId)
            .in("status", ["active", "trialing"])
            .neq("stripe_subscription_id", subscription.id)
            .limit(1);

          if (activeSubs && activeSubs.length > 0) {
            console.log(
              "Skipping subscription.deleted — user has a newer active subscription:",
              subscription.id
            );
            break;
          }

          // Double-check with Stripe: does this customer have ANY active subscription?
          // This catches cases where the new subscription has a different ID but exists.
          const stripeCustomerId = subscription.customer as string;
          const activeStripeSubs = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: "active",
            limit: 1,
          });

          if (activeStripeSubs.data.length > 0) {
            console.log(
              "Skipping subscription.deleted — customer has active subscription in Stripe:",
              subscription.id,
              "active:",
              activeStripeSubs.data[0].id
            );
            break;
          }

          // Also check for trialing subscriptions
          const trialingStripeSubs = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: "trialing",
            limit: 1,
          });

          if (trialingStripeSubs.data.length > 0) {
            console.log(
              "Skipping subscription.deleted — customer has trialing subscription in Stripe:",
              subscription.id,
              "trialing:",
              trialingStripeSubs.data[0].id
            );
            break;
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

        console.log("Processing invoice.paid:", {
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          customerId: invoice.customer,
          amountPaid: invoice.amount_paid,
          billingReason: invoice.billing_reason,
        });

        if (invoice.subscription) {
          // Retrieve the latest subscription data
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );

          // If an invoice was paid, the subscription should be active.
          // For trial conversions (billing_reason: subscription_cycle), this is critical.
          // Always set to active when payment succeeds.
          const resolvedStatus = "active";

          // Try to get user ID from multiple sources:
          // 1. Subscription metadata
          // 2. Invoice parent.subscription_details.metadata (new Stripe API structure)
          // 3. Invoice line items metadata
          // 4. Customer metadata
          let paidUserId = getUserIdFromMetadata(subscription);

          // Check invoice parent subscription_details metadata
          if (!paidUserId) {
            const invoiceAny = invoice as any;
            if (invoiceAny.parent?.subscription_details?.metadata?.supabase_user_id) {
              paidUserId = invoiceAny.parent.subscription_details.metadata.supabase_user_id;
              console.log("Found user ID in invoice parent subscription_details:", paidUserId);
            }
          }

          // Check invoice line items metadata
          if (!paidUserId) {
            const invoiceAny = invoice as any;
            const lineItems = invoiceAny.lines?.data || [];
            for (const item of lineItems) {
              if (item.metadata?.supabase_user_id) {
                paidUserId = item.metadata.supabase_user_id;
                console.log("Found user ID in invoice line item:", paidUserId);
                break;
              }
            }
          }

          // Fallback to customer metadata
          if (!paidUserId) {
            const customer = await stripe.customers.retrieve(
              subscription.customer as string
            );
            if (!("deleted" in customer)) {
              paidUserId = getUserIdFromMetadata(customer);
              if (paidUserId) {
                console.log("Found user ID in customer metadata:", paidUserId);
              }
            }
          }

          // Final fallback: look up existing subscription in our database
          if (!paidUserId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: existingSub } = await (supabase.from("subscriptions") as any)
              .select("user_id")
              .eq("stripe_subscription_id", subscription.id)
              .single();

            if (existingSub?.user_id) {
              paidUserId = existingSub.user_id;
              console.log("Found user ID from existing subscription record:", paidUserId);
            }
          }

          if (paidUserId) {
            // Use upsert so this works even if the subscription row was deleted or never created
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from("subscriptions") as any).upsert(
              {
                user_id: paidUserId,
                stripe_customer_id: subscription.customer as string,
                stripe_subscription_id: subscription.id,
                status: resolvedStatus as any,
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
              console.error("Error updating subscription after payment:", error);
            } else {
              console.log("Successfully updated subscription to active for user:", paidUserId);
            }

            // Sync to Klaviyo - user is now a paying customer
            const { data: paidProfile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", paidUserId)
              .single();

            if (paidProfile) {
              const profileData = paidProfile as { email: string; full_name: string | null };
              syncUserToKlaviyo({
                email: profileData.email,
                fullName: profileData.full_name,
                subscriptionType: "stripe_active",
              }).catch((err) => console.error("Klaviyo sync error:", err));

              // Notify admin of trial conversion (only for subscription_cycle = trial ended)
              if (invoice.billing_reason === "subscription_cycle") {
                notifyTrialConverted({
                  email: profileData.email,
                  name: profileData.full_name,
                }).catch((err) => console.error("Admin notification error:", err));
              }
            }
          } else {
            // Fallback: update by subscription ID only
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from("subscriptions") as any)
              .update({
                status: resolvedStatus as any,
                current_period_start: new Date(
                  subscription.current_period_start * 1000
                ).toISOString(),
                current_period_end: new Date(
                  subscription.current_period_end * 1000
                ).toISOString(),
                cancel_at_period_end: subscription.cancel_at_period_end,
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", subscription.id);

            if (error) {
              console.error("Error updating subscription after payment:", error);
            }
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

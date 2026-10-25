import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { syncUserToKlaviyo } from "@/lib/klaviyo";
import { selectAll } from "@/lib/supabase/select-all";

export const dynamic = "force-dynamic";
// It checks every live subscription against Stripe; give it room to finish
export const maxDuration = 60;
const CONCURRENCY = 8;

/**
 * Automatic daily sync of all active subscriptions with Stripe
 * This runs as a Vercel Cron Job to catch any webhook failures or race conditions
 *
 * Setup in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-subscriptions",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function GET(request: Request) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // In production, require cron secret for security
    if (process.env.NODE_ENV === "production") {
      if (!cronSecret) {
        console.error("CRON_SECRET not configured");
        return NextResponse.json(
          { error: "Cron job not configured" },
          { status: 500 }
        );
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("Unauthorized cron request");
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const adminSupabase = createAdminClient();

    console.log("[CRON] Starting daily subscription sync...");

    // Get all subscriptions that might need syncing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let subscriptions: any[];
    try {
      // Every row (a plain select stops at 1,000). Manual grants and comps
      // aren't Stripe subscriptions, so there's nothing to check them against.
      subscriptions = (
        await selectAll<any>((from, to) =>
          (adminSupabase.from("subscriptions") as any)
            .select("*, profiles!inner(email, full_name)")
            .in("status", ["active", "trialing"])
            .order("id")
            .range(from, to)
        )
      ).filter((sub) => String(sub.stripe_subscription_id || "").startsWith("sub_"));
    } catch (fetchError) {
      console.error("[CRON] Error fetching subscriptions:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      );
    }

    const results = {
      total: subscriptions?.length || 0,
      synced: 0,
      unchanged: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[CRON] No subscriptions to sync");
      return NextResponse.json({
        message: "No subscriptions to sync",
        results,
      });
    }

    console.log(`[CRON] Found ${subscriptions.length} subscriptions to check`);

    // Sync each subscription, several at a time so the run finishes
    const syncOne = async (sub: any) => {
      try {
        // Fetch fresh data from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(
          sub.stripe_subscription_id
        );

        // Check if data needs updating
        const needsUpdate =
          stripeSubscription.status !== sub.status ||
          new Date(stripeSubscription.current_period_end * 1000).toISOString() !==
            sub.current_period_end ||
          stripeSubscription.cancel_at_period_end !== sub.cancel_at_period_end;

        if (!needsUpdate) {
          results.unchanged++;
          return;
        }

        console.log(`[CRON] Updating subscription ${sub.stripe_subscription_id}:`, {
          oldStatus: sub.status,
          newStatus: stripeSubscription.status,
          oldPeriodEnd: sub.current_period_end,
          newPeriodEnd: new Date(
            stripeSubscription.current_period_end * 1000
          ).toISOString(),
        });

        // Update in database with fresh data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (adminSupabase
          .from("subscriptions") as any)
          .update({
            status: stripeSubscription.status,
            current_period_start: new Date(
              stripeSubscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              stripeSubscription.current_period_end * 1000
            ).toISOString(),
            cancel_at_period_end: stripeSubscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.stripe_subscription_id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        // Sync to Klaviyo if status changed
        if (stripeSubscription.status !== sub.status) {
          const profile = sub.profiles;
          if (profile?.email) {
            const ended = ["canceled", "unpaid", "incomplete_expired"].includes(stripeSubscription.status);
            const klaviyoType: "stripe_active" | "stripe_trialing" | "canceled" = ended
              ? "canceled"
              : stripeSubscription.status === "trialing"
                ? "stripe_trialing"
                : "stripe_active";

            await syncUserToKlaviyo({
              email: profile.email,
              fullName: profile.full_name,
              subscriptionType: klaviyoType,
            });

            console.log(
              `[CRON] Synced to Klaviyo: ${profile.email} - ${klaviyoType}`
            );
          }
        }

        results.synced++;
      } catch (error) {
        console.error(
          `[CRON] Failed to sync subscription ${sub.stripe_subscription_id}:`,
          error
        );
        results.failed++;
        results.errors.push(
          `${sub.stripe_subscription_id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    };

    for (let i = 0; i < subscriptions.length; i += CONCURRENCY) {
      await Promise.all(subscriptions.slice(i, i + CONCURRENCY).map(syncOne));
    }

    console.log("[CRON] Sync complete:", results);

    return NextResponse.json({
      message: `Checked ${results.total} subscriptions: ${results.synced} updated, ${results.unchanged} unchanged, ${results.failed} failed`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Sync script error:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

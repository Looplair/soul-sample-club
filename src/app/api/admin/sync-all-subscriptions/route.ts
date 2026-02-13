import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { syncUserToKlaviyo } from "@/lib/klaviyo";

export const dynamic = "force-dynamic";

/**
 * One-time sync script to fix all subscriptions with stale data
 * This fetches fresh data from Stripe for all active subscriptions
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const profileData = profile as { is_admin: boolean } | null;
    if (!profileData?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // Get all subscriptions that might need syncing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subscriptions, error: fetchError } = await (adminSupabase
      .from("subscriptions") as any)
      .select("*, profiles!inner(email, full_name)")
      .in("status", ["active", "trialing"]);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      );
    }

    const results = {
      total: subscriptions?.length || 0,
      synced: 0,
      failed: 0,
      errors: [] as string[],
      details: [] as any[],
    };

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        message: "No subscriptions to sync",
        results,
      });
    }

    console.log(`Starting sync for ${subscriptions.length} subscriptions...`);

    // Sync each subscription
    for (const sub of subscriptions) {
      try {
        console.log(`Syncing subscription ${sub.stripe_subscription_id}...`);

        // Fetch fresh data from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(
          sub.stripe_subscription_id
        );

        console.log(`Stripe data for ${sub.stripe_subscription_id}:`, {
          status: stripeSubscription.status,
          current_period_end: new Date(
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

        // Sync to Klaviyo
        const profile = sub.profiles;
        if (profile?.email) {
          let klaviyoType: "stripe_active" | "stripe_trialing" =
            stripeSubscription.status === "trialing"
              ? "stripe_trialing"
              : "stripe_active";

          await syncUserToKlaviyo({
            email: profile.email,
            fullName: profile.full_name,
            subscriptionType: klaviyoType,
          });

          console.log(`Synced to Klaviyo: ${profile.email} - ${klaviyoType}`);
        }

        results.synced++;
        results.details.push({
          email: profile?.email,
          subscription_id: sub.stripe_subscription_id,
          old_period_end: sub.current_period_end,
          new_period_end: new Date(
            stripeSubscription.current_period_end * 1000
          ).toISOString(),
          old_status: sub.status,
          new_status: stripeSubscription.status,
          success: true,
        });
      } catch (error) {
        console.error(
          `Failed to sync subscription ${sub.stripe_subscription_id}:`,
          error
        );
        results.failed++;
        results.errors.push(
          `${sub.stripe_subscription_id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        results.details.push({
          email: sub.profiles?.email,
          subscription_id: sub.stripe_subscription_id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log("Sync complete:", results);

    return NextResponse.json({
      message: `Synced ${results.synced} of ${results.total} subscriptions`,
      results,
    });
  } catch (error) {
    console.error("Sync script error:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

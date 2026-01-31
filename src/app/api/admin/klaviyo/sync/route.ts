import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bulkSyncUsersToKlaviyo } from "@/lib/klaviyo";

export async function POST() {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const profileData = profile as { is_admin: boolean } | null;
    if (!profileData?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if Klaviyo is configured
    if (!process.env.KLAVIYO_PRIVATE_API_KEY) {
      return NextResponse.json(
        { error: "Klaviyo is not configured. Add KLAVIYO_PRIVATE_API_KEY to your environment variables." },
        { status: 400 }
      );
    }

    // Fetch all users with their subscription info
    const [usersResult, subscriptionsResult, patreonResult] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, created_at"),
      supabase.from("subscriptions").select("user_id, status"),
      supabase.from("patreon_links").select("user_id, is_active"),
    ]);

    if (usersResult.error) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Build subscription lookup
    const subscriptionMap: Record<string, string> = {};
    const subscriptions = subscriptionsResult.data as Array<{ user_id: string; status: string }> | null;
    if (subscriptions) {
      for (const sub of subscriptions) {
        subscriptionMap[sub.user_id] = sub.status;
      }
    }

    const patreonMap: Record<string, boolean> = {};
    const patreonLinks = patreonResult.data as Array<{ user_id: string; is_active: boolean }> | null;
    if (patreonLinks) {
      for (const link of patreonLinks) {
        patreonMap[link.user_id] = link.is_active;
      }
    }

    // Prepare users for sync
    const users = usersResult.data as Array<{ id: string; email: string; full_name: string | null; created_at: string }>;
    const usersToSync = users.map((u) => {
      let subscriptionType: "stripe_active" | "stripe_trialing" | "patreon" | "free" | "canceled" = "free";

      const stripeStatus = subscriptionMap[u.id];
      const hasActivePatreon = patreonMap[u.id] === true;

      if (stripeStatus === "active") {
        subscriptionType = "stripe_active";
      } else if (stripeStatus === "trialing") {
        subscriptionType = "stripe_trialing";
      } else if (hasActivePatreon) {
        // Patreon takes priority over canceled Stripe status
        subscriptionType = "patreon";
      } else if (stripeStatus === "canceled") {
        subscriptionType = "canceled";
      }

      return {
        email: u.email,
        fullName: u.full_name,
        subscriptionType,
        joinedAt: u.created_at,
      };
    });

    // Sync to Klaviyo
    const result = await bulkSyncUsersToKlaviyo(usersToSync);

    return NextResponse.json({
      success: result.success,
      message: `Synced ${result.synced} users to Klaviyo${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
      synced: result.synced,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Klaviyo sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync to Klaviyo" },
      { status: 500 }
    );
  }
}

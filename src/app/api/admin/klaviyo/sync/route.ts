import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

    // Use admin client to bypass RLS and fetch ALL users' data
    const adminSupabase = createAdminClient();

    // Fetch all users from auth.users (email is stored there, not in profiles)
    const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();

    if (authError) {
      console.error("Failed to fetch auth users:", authError);
      return NextResponse.json({ error: "Failed to fetch users: " + authError.message }, { status: 500 });
    }

    // Fetch profiles for full_name, and subscription info
    const [profilesResult, subscriptionsResult, patreonResult] = await Promise.all([
      adminSupabase.from("profiles").select("id, full_name"),
      adminSupabase.from("subscriptions").select("user_id, status, current_period_end"),
      adminSupabase.from("patreon_links").select("user_id, is_active"),
    ]);

    // Build profiles lookup
    const profilesMap: Record<string, { full_name: string | null }> = {};
    if (profilesResult.data) {
      for (const profile of profilesResult.data as Array<{ id: string; full_name: string | null }>) {
        profilesMap[profile.id] = { full_name: profile.full_name };
      }
    }

    // Build subscription lookup - only count subscriptions with valid current_period_end
    const subscriptionMap: Record<string, string> = {};
    const now = new Date().toISOString();
    const subscriptions = subscriptionsResult.data as Array<{ user_id: string; status: string; current_period_end: string | null }> | null;
    if (subscriptions) {
      for (const sub of subscriptions) {
        // Skip expired active/trialing rows (stale webhook data)
        if ((sub.status === "active" || sub.status === "trialing") && sub.current_period_end && sub.current_period_end < now) {
          // Treat as canceled
          if (!subscriptionMap[sub.user_id]) {
            subscriptionMap[sub.user_id] = "canceled";
          }
          continue;
        }
        // Prioritize: active > trialing > canceled > anything else
        const existing = subscriptionMap[sub.user_id];
        if (!existing || sub.status === "active" || (sub.status === "trialing" && existing !== "active")) {
          subscriptionMap[sub.user_id] = sub.status;
        }
      }
    }

    const patreonMap: Record<string, boolean> = {};
    const patreonLinks = patreonResult.data as Array<{ user_id: string; is_active: boolean }> | null;
    if (patreonLinks) {
      for (const link of patreonLinks) {
        patreonMap[link.user_id] = link.is_active;
      }
    }

    // Prepare users for sync - use authUsers.users from the admin API
    const usersToSync = authUsers.users
      .filter((u) => u.email) // Only sync users with email
      .map((u) => {
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

        // Get full_name from profiles or user_metadata
        const profileData = profilesMap[u.id];
        const fullName = profileData?.full_name || u.user_metadata?.full_name || u.user_metadata?.name || null;

        return {
          email: u.email!,
          fullName,
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

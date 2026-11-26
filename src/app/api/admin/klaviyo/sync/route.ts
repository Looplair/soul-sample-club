import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bulkImportProfiles } from "@/lib/klaviyo";
import { selectAll } from "@/lib/supabase/select-all";

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

    // Every auth user: listUsers returns 50 a page by default, so walk the pages
    const authUsersList: Array<{ id: string; email?: string; created_at: string; user_metadata?: Record<string, string> }> = [];
    for (let page = 1; ; page++) {
      const { data, error: authError } = await adminSupabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (authError) {
        console.error("Failed to fetch auth users:", authError);
        return NextResponse.json({ error: "Failed to fetch users: " + authError.message }, { status: 500 });
      }
      authUsersList.push(...data.users);
      if (data.users.length < 1000) break;
    }

    // Fetch profiles for full_name, and subscription info
    // Every row: a plain select stops at 1,000, and there are more profiles than that
    const [profilesResult, subscriptionsResult, patreonResult] = await Promise.all([
      selectAll((from, to) => adminSupabase.from("profiles").select("id, full_name").order("id").range(from, to)).then((data) => ({ data })),
      selectAll((from, to) =>
        adminSupabase
          .from("subscriptions")
          .select("user_id, status, current_period_start, current_period_end, cancel_at_period_end")
          .order("id")
          .range(from, to)
      ).then((data) => ({ data })),
      selectAll((from, to) => adminSupabase.from("patreon_links").select("user_id, is_active").order("id").range(from, to)).then((data) => ({ data })),
    ]);

    // Build profiles lookup
    const profilesMap: Record<string, { full_name: string | null }> = {};
    if (profilesResult.data) {
      for (const profile of profilesResult.data as Array<{ id: string; full_name: string | null }>) {
        profilesMap[profile.id] = { full_name: profile.full_name };
      }
    }

    // Build subscription lookup - only count subscriptions with valid current_period_end
    type Sub = { user_id: string; status: string; current_period_start: string | null; current_period_end: string | null; cancel_at_period_end: boolean | null };
    const subscriptionMap: Record<string, Sub & { status: string }> = {};
    const now = new Date().toISOString();
    const subscriptions = subscriptionsResult.data as Sub[] | null;
    if (subscriptions) {
      for (const sub of subscriptions) {
        // Skip expired active/trialing rows (stale webhook data)
        if ((sub.status === "active" || sub.status === "trialing") && sub.current_period_end && sub.current_period_end < now) {
          // Treat as canceled
          if (!subscriptionMap[sub.user_id]) {
            subscriptionMap[sub.user_id] = { ...sub, status: "canceled" };
          }
          continue;
        }
        // Prioritize: active > trialing > canceled > anything else
        const existing = subscriptionMap[sub.user_id]?.status;
        if (!existing || sub.status === "active" || (sub.status === "trialing" && existing !== "active")) {
          subscriptionMap[sub.user_id] = sub;
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

    // A yearly period is about 365 days, a monthly one about 30
    const billingOf = (sub: Sub): "monthly" | "yearly" | "" => {
      if (!sub.current_period_start || !sub.current_period_end) return "";
      const days = (Date.parse(sub.current_period_end) - Date.parse(sub.current_period_start)) / 86400000;
      return days >= 40 ? "yearly" : "monthly";
    };

    const profiles = authUsersList
      .filter((u) => u.email) // Only sync users with email
      .map((u) => {
        let subscriptionType: "stripe_active" | "stripe_trialing" | "patreon" | "free" | "canceled" = "free";

        const sub = subscriptionMap[u.id];
        const stripeStatus = sub?.status;
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
        const paying = subscriptionType === "stripe_active" || subscriptionType === "stripe_trialing";

        // Get full_name from profiles or user_metadata
        const fullName = profilesMap[u.id]?.full_name || u.user_metadata?.full_name || u.user_metadata?.name || "";
        const [firstName, ...rest] = fullName.split(" ");

        return {
          email: u.email!,
          first_name: firstName || undefined,
          last_name: rest.join(" ") || undefined,
          properties: {
            subscription_type: subscriptionType,
            // For segments like "monthly members who aren't leaving"
            billing: paying && sub ? billingOf(sub) : "",
            cancelling: paying && !!sub?.cancel_at_period_end,
            joined_at: u.created_at,
            source: "soul_sample_club",
          },
        };
      });

    // One bulk job instead of thousands of single calls; consent is left alone
    const result = await bulkImportProfiles(profiles);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Sent ${result.queued} people to Klaviyo. It takes a few minutes to show there.`
        : `Sent ${result.queued} of ${profiles.length} people to Klaviyo`,
      synced: result.queued,
      failed: profiles.length - result.queued,
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

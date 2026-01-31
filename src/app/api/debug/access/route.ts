import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    // Get ALL subscription rows for this user (no status filter)
    const allSubsResult = await adminSupabase
      .from("subscriptions")
      .select("id, status, current_period_end, current_period_start, stripe_subscription_id, cancel_at_period_end, created_at")
      .eq("user_id", user.id);

    // Auto-cleanup: mark any expired active/trialing rows as canceled
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase.from("subscriptions") as any)
      .update({ status: "canceled" })
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .lt("current_period_end", now);

    // Get active/trialing only WITH current_period_end check (what the download API checks)
    const activeSubsResult = await adminSupabase
      .from("subscriptions")
      .select("id, status, current_period_end")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .gte("current_period_end", now);

    // Get Patreon
    const patreonResult = await adminSupabase
      .from("patreon_links")
      .select("*")
      .eq("user_id", user.id);

    // What the download API would decide
    const hasActiveSubscription = (activeSubsResult.data?.length ?? 0) > 0;
    const hasPatreon = patreonResult.data?.some((p: { is_active: boolean }) => p.is_active) ?? false;
    const canDownload = hasActiveSubscription || hasPatreon;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      allSubscriptionRows: allSubsResult.data,
      allSubscriptionCount: allSubsResult.data?.length ?? 0,
      activeOrTrialingRows: activeSubsResult.data,
      activeOrTrialingCount: activeSubsResult.data?.length ?? 0,
      patreonLinks: patreonResult.data,
      verdict: {
        hasActiveSubscription,
        hasPatreon,
        canDownload,
        reason: canDownload
          ? hasActiveSubscription
            ? `User has ${activeSubsResult.data?.length} active/trialing subscription row(s)`
            : "User has active Patreon"
          : "No active subscription or Patreon - downloads should be BLOCKED",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

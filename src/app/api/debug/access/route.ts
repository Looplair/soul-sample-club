import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Debug endpoint to check subscription status
// DELETE THIS AFTER DEBUGGING
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

    // Get all subscriptions for this user
    const allSubs = await adminSupabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id);

    // Also get ALL subscriptions in the table for comparison
    const allSubsInDb = await adminSupabase
      .from("subscriptions")
      .select("user_id, status, stripe_customer_id")
      .limit(20);

    // Get all patreon links for this user
    const allPatreon = await adminSupabase
      .from("patreon_links")
      .select("*")
      .eq("user_id", user.id);

    // Get user profile
    const profile = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Check if profile exists by email
    const profileByEmail = await adminSupabase
      .from("profiles")
      .select("id, email")
      .eq("email", user.email || "")
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile.data,
      profile_error: profile.error,
      profile_by_email: profileByEmail.data,
      subscriptions_for_user: allSubs.data,
      subscriptions_error: allSubs.error,
      all_subscriptions_sample: allSubsInDb.data,
      patreon_links: allPatreon.data,
      patreon_error: allPatreon.error,
      debug_info: {
        user_id_type: typeof user.id,
        user_id_length: user.id?.length,
      }
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

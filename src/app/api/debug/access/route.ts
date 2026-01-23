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

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile.data,
      subscriptions: allSubs.data,
      subscriptions_error: allSubs.error,
      patreon_links: allPatreon.data,
      patreon_error: allPatreon.error,
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

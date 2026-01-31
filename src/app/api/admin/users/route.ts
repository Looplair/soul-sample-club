import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
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

    // Fetch all data with admin client to bypass RLS
    const [usersResult, downloadsResult, patreonResult] = await Promise.all([
      adminSupabase
        .from("profiles")
        .select(
          `
          id,
          email,
          full_name,
          is_admin,
          created_at,
          subscription:subscriptions(status, current_period_end)
        `
        )
        .order("created_at", { ascending: false }),
      adminSupabase.from("downloads").select("user_id"),
      adminSupabase.from("patreon_links").select("user_id, is_active, tier_title"),
    ]);

    return NextResponse.json({
      users: usersResult.data || [],
      downloads: downloadsResult.data || [],
      patreonLinks: patreonResult.data || [],
    });
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

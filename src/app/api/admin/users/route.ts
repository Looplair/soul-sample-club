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

    // Supabase PostgREST hard-caps responses at 1000 rows regardless of .limit().
    // We paginate in batches of 1000 until we've fetched every profile.
    const PAGE_SIZE = 1000;
    let allUsers: Record<string, unknown>[] = [];
    let page = 0;

    while (true) {
      const { data, error } = await adminSupabase
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
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error || !data || data.length === 0) break;
      allUsers = [...allUsers, ...(data as Record<string, unknown>[])];
      if (data.length < PAGE_SIZE) break; // last page
      page++;
    }

    // Downloads and patreon links — paginate these too so counts stay accurate
    const PAGE_SIZE_DL = 1000;
    let allDownloads: { user_id: string }[] = [];
    let dlPage = 0;
    while (true) {
      const { data } = await adminSupabase
        .from("downloads")
        .select("user_id")
        .range(dlPage * PAGE_SIZE_DL, (dlPage + 1) * PAGE_SIZE_DL - 1);
      if (!data || data.length === 0) break;
      allDownloads = [...allDownloads, ...(data as { user_id: string }[])];
      if (data.length < PAGE_SIZE_DL) break;
      dlPage++;
    }

    const { data: patreonData } = await adminSupabase
      .from("patreon_links")
      .select("user_id, is_active, tier_title");

    return NextResponse.json({
      users: allUsers,
      downloads: allDownloads,
      patreonLinks: patreonData || [],
    });
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

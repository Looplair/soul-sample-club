// src/app/api/drum-vault/[id]/collect/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid break ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Subscription check — MUST be active to collect
    const [stripeResult, patreonResult] = await Promise.all([
      adminSupabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"])
        .limit(1),
      adminSupabase
        .from("patreon_links")
        .select("is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single(),
    ]);

    const hasAccess =
      (stripeResult.data?.length ?? 0) > 0 || !!patreonResult.data;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Active subscription required to collect breaks" },
        { status: 403 }
      );
    }

    // Verify the break exists and is published
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breakResult = await (adminSupabase as any)
      .from("drum_breaks")
      .select("id, name")
      .eq("id", id)
      .eq("is_published", true)
      .single();

    if (breakResult.error || !breakResult.data) {
      return NextResponse.json({ error: "Break not found" }, { status: 404 });
    }

    // Insert collection (UNIQUE constraint handles duplicates gracefully)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (adminSupabase as any)
      .from("break_collections")
      .insert({ user_id: user.id, break_id: id });

    if (insertError) {
      // 23505 = unique_violation — already collected, that's fine
      if (insertError.code === "23505") {
        return NextResponse.json({ success: true, already_collected: true });
      }
      console.error("Error inserting collection:", insertError);
      return NextResponse.json({ error: "Failed to collect break" }, { status: 500 });
    }

    return NextResponse.json({ success: true, already_collected: false });
  } catch (error) {
    console.error("Collect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

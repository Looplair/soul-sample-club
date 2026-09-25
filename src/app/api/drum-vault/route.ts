// src/app/api/drum-vault/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DrumBreak, DrumBreakWithStatus } from "@/types/database";

export async function GET() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's last vault visit (for "New" badge)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileResult = await (adminSupabase as any)
      .from("profiles")
      .select("vault_last_visited")
      .eq("id", user.id)
      .single();
    const lastVisited = (profileResult.data as { vault_last_visited: string | null } | null)
      ?.vault_last_visited ?? null;

    // Fetch all published breaks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breaksResult = await (adminSupabase as any)
      .from("drum_breaks")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (breaksResult.error) {
      console.error("Error fetching drum breaks:", breaksResult.error);
      return NextResponse.json({ error: "Failed to fetch breaks" }, { status: 500 });
    }

    // Fetch user's collections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collectionsResult = await (adminSupabase as any)
      .from("break_collections")
      .select("break_id")
      .eq("user_id", user.id);

    const collectedIds = new Set(
      (collectionsResult.data ?? []).map((c: { break_id: string }) => c.break_id)
    );

    // Merge is_collected + is_new flag
    const breaks: DrumBreakWithStatus[] = (breaksResult.data as DrumBreak[]).map((b) => ({
      ...b,
      waveform_peaks: b.waveform_peaks as number[] | null,
      is_collected: collectedIds.has(b.id),
      is_new: lastVisited ? new Date(b.created_at) > new Date(lastVisited) : false,
    }));

    // Stats
    const total = breaks.length;
    const collected = breaks.filter((b) => b.is_collected).length;

    return NextResponse.json({ breaks, stats: { collected, total } });
  } catch (error) {
    console.error("Vault list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

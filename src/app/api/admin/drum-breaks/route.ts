// src/app/api/admin/drum-breaks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (adminSupabase as any)
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return null;
  return user;
}

export async function GET() {
  try {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const adminSupabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (adminSupabase as any)
      .from("drum_breaks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Count collections per break
    const breakIds = (data ?? []).map((b: { id: string }) => b.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: collectionCounts } = await (adminSupabase as any)
      .from("break_collections")
      .select("break_id")
      .in("break_id", breakIds);

    const countMap: Record<string, number> = {};
    (collectionCounts ?? []).forEach((c: { break_id: string }) => {
      countMap[c.break_id] = (countMap[c.break_id] ?? 0) + 1;
    });

    const breaksWithCounts = (data ?? []).map((b: { id: string }) => ({
      ...b,
      collection_count: countMap[b.id] ?? 0,
    }));

    return NextResponse.json({ breaks: breaksWithCounts });
  } catch (error) {
    console.error("Admin drum-breaks GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await request.json();
    const { name, bpm, file_path, preview_path, is_exclusive } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (adminSupabase as any)
      .from("drum_breaks")
      .insert({
        name,
        bpm: bpm ?? null,
        file_path: file_path ?? null,
        preview_path: preview_path ?? null,
        is_exclusive: is_exclusive ?? false,
        is_published: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ break: data }, { status: 201 });
  } catch (error) {
    console.error("Admin drum-breaks POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

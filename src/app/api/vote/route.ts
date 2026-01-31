import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { packId } = await request.json();

    if (!packId || !UUID_REGEX.test(packId)) {
      return NextResponse.json({ error: "Valid pack ID required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Check if already voted - pack_votes table may not be in types yet
    const existingVote = await adminSupabase
      .from("pack_votes")
      .select("id")
      .eq("user_id", user.id)
      .eq("pack_id", packId)
      .single();

    if (existingVote.data) {
      return NextResponse.json({ message: "Already voted" });
    }

    // Insert vote - @ts-expect-error for insert since pack_votes not in types
    const result = await adminSupabase.from("pack_votes")
      // @ts-expect-error - pack_votes table not in generated types
      .insert({
        user_id: user.id,
        pack_id: packId,
      });

    if (result.error) {
      console.error("Vote insert error:", result.error);
      return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { packId } = await request.json();

    if (!packId || !UUID_REGEX.test(packId)) {
      return NextResponse.json({ error: "Valid pack ID required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Delete vote
    const result = await adminSupabase
      .from("pack_votes")
      .delete()
      .eq("user_id", user.id)
      .eq("pack_id", packId);

    if (result.error) {
      console.error("Vote delete error:", result.error);
      return NextResponse.json({ error: "Failed to remove vote" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vote delete error:", error);
    return NextResponse.json({ error: "Failed to remove vote" }, { status: 500 });
  }
}

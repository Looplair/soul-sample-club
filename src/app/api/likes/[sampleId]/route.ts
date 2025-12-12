import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sampleId: string }> }
) {
  try {
    const { sampleId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if sample exists
    const { data: sample, error: sampleError } = await supabase
      .from("samples")
      .select("id")
      .eq("id", sampleId)
      .single();

    if (sampleError || !sample) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("sample_id", sampleId)
      .single();

    if (existingLike) {
      return NextResponse.json({ message: "Already liked" }, { status: 200 });
    }

    // Create like
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from("likes") as any).insert({
      user_id: user.id,
      sample_id: sampleId,
    });

    if (insertError) {
      console.error("Error creating like:", insertError);
      return NextResponse.json(
        { error: "Failed to like sample" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Liked successfully" }, { status: 201 });
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sampleId: string }> }
) {
  try {
    const { sampleId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the like
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase.from("likes") as any)
      .delete()
      .eq("user_id", user.id)
      .eq("sample_id", sampleId);

    if (deleteError) {
      console.error("Error removing like:", deleteError);
      return NextResponse.json(
        { error: "Failed to unlike sample" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Unliked successfully" }, { status: 200 });
  } catch (error) {
    console.error("Unlike error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sampleId: string }> }
) {
  try {
    const { sampleId } = await params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check subscription status
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: "Active subscription required" },
        { status: 403 }
      );
    }

    // Get sample with pack info
    const { data: sample, error: sampleError } = await supabase
      .from("samples")
      .select(
        `
        *,
        pack:packs(id, release_date, is_published)
      `
      )
      .eq("id", sampleId)
      .single();

    if (sampleError || !sample) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Check if pack is published
    if (!sample.pack?.is_published) {
      return NextResponse.json({ error: "Pack not available" }, { status: 404 });
    }

    // Check if pack is within 3-month window
    const releaseDate = new Date(sample.pack.release_date);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    if (releaseDate < threeMonthsAgo) {
      return NextResponse.json(
        { error: "Pack is outside access window" },
        { status: 403 }
      );
    }

    // Generate signed URL for the sample file (valid for 60 seconds)
    const { data: signedUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUrl(sample.file_path, 60, {
        download: `${sample.name}.wav`,
      });

    if (urlError || !signedUrl) {
      console.error("Error generating signed URL:", urlError);
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }

    // Record download for analytics
    await supabase.from("downloads").insert({
      user_id: user.id,
      sample_id: sampleId,
    });

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

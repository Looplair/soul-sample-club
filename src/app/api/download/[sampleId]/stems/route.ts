import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Sample } from "@/types/database";

// Type for sample with pack relation
interface SampleWithPack extends Sample {
  pack: {
    id: string;
    release_date: string;
    is_published: boolean;
  } | null;
}

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

    // Check subscription status using admin client to bypass RLS
    const subscriptionResult = await adminSupabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single();

    const subscription = subscriptionResult.data as { status: string; current_period_end: string } | null;

    // Check Patreon link status using admin client to bypass RLS
    const patreonResult = await adminSupabase
      .from("patreon_links")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    const hasPatreon = !!patreonResult.data;

    if (!subscription && !hasPatreon) {
      return NextResponse.json(
        { error: "Active subscription or Patreon membership required" },
        { status: 403 }
      );
    }

    // Get sample with pack info
    const sampleResult = await supabase
      .from("samples")
      .select(
        `
        *,
        pack:packs(id, release_date, is_published)
      `
      )
      .eq("id", sampleId)
      .single();

    const sample = sampleResult.data as SampleWithPack | null;

    if (sampleResult.error || !sample) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Check if sample has stems
    if (!sample.stems_path) {
      return NextResponse.json({ error: "No stems available for this sample" }, { status: 404 });
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

    // Generate signed URL for the stems file (valid for 60 seconds)
    const { data: signedUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUrl(sample.stems_path, 60, {
        download: `${sample.name}-stems.zip`,
      });

    if (urlError || !signedUrl) {
      console.error("Error generating signed URL:", urlError);
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (error) {
    console.error("Stems download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

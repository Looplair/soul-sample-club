import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Sample } from "@/types/database";

// Debug endpoint - should be removed in production
// This helps diagnose download issues

interface SampleWithPack extends Sample {
  pack: {
    id: string;
    name: string;
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

    // Get sample with pack info
    const sampleResult = await supabase
      .from("samples")
      .select(
        `
        *,
        pack:packs(id, name, release_date, is_published)
      `
      )
      .eq("id", sampleId)
      .single();

    const sample = sampleResult.data as SampleWithPack | null;

    if (sampleResult.error) {
      return NextResponse.json({
        error: "Sample query failed",
        details: sampleResult.error,
        sampleId,
      });
    }

    if (!sample) {
      return NextResponse.json({
        error: "Sample not found",
        sampleId,
      });
    }

    // Check if file exists in storage
    const { data: fileList, error: listError } = await adminSupabase.storage
      .from("samples")
      .list(sample.file_path.split("/").slice(0, -1).join("/"), {
        search: sample.file_path.split("/").pop(),
      });

    // Try to create signed URL
    const { data: signedUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUrl(sample.file_path, 60);

    // Check subscription
    const subscriptionResult = await adminSupabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .limit(1);

    // Check Patreon
    const patreonResult = await adminSupabase
      .from("patreon_links")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    // Check 3-month window
    const releaseDate = sample.pack ? new Date(sample.pack.release_date) : null;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const isWithinWindow = releaseDate ? releaseDate >= threeMonthsAgo : false;

    return NextResponse.json({
      sampleId,
      sample: {
        id: sample.id,
        name: sample.name,
        file_path: sample.file_path,
        preview_path: sample.preview_path,
        file_size: sample.file_size,
      },
      pack: sample.pack ? {
        id: sample.pack.id,
        name: sample.pack.name,
        release_date: sample.pack.release_date,
        is_published: sample.pack.is_published,
      } : null,
      storage: {
        fileExists: fileList && fileList.length > 0,
        fileListError: listError,
        signedUrlCreated: !!signedUrl,
        signedUrlError: urlError,
      },
      access: {
        hasActiveSubscription: (subscriptionResult.data?.length ?? 0) > 0,
        subscriptionStatus: subscriptionResult.data?.[0],
        hasPatreon: (patreonResult.data?.length ?? 0) > 0,
        isPackPublished: sample.pack?.is_published ?? false,
        isWithinWindow,
        releaseDate: sample.pack?.release_date,
        windowCutoff: threeMonthsAgo.toISOString(),
      },
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Debug download error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

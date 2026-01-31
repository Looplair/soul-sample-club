import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { isPackExpiredWithEndDate } from "@/lib/utils";
import type { Sample } from "@/types/database";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Type for sample with pack relation
interface SampleWithPack extends Sample {
  pack: {
    id: string;
    release_date: string;
    end_date: string | null;
    is_published: boolean;
  } | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sampleId: string }> }
) {
  try {
    const { sampleId } = await params;

    // Validate sampleId format
    if (!UUID_REGEX.test(sampleId)) {
      return NextResponse.json({ error: "Invalid sample ID format" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting - 100 downloads per minute per user
    const rateLimit = checkRateLimit(`download:${user.id}`, RATE_LIMITS.download);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many download requests. Please wait a moment." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Check subscription status using admin client to bypass RLS
    // Use limit(1) instead of single() because user may have multiple subscription rows
    const subscriptionResult = await adminSupabase
      .from("subscriptions")
      .select("status, current_period_end, user_id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .limit(1);

    const subscription = subscriptionResult.data?.[0] as { status: string; current_period_end: string } | undefined;

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
        pack:packs(id, release_date, end_date, is_published)
      `
      )
      .eq("id", sampleId)
      .single();

    const sample = sampleResult.data as SampleWithPack | null;

    if (sampleResult.error || !sample) {
      console.error("Sample not found:", { sampleId, error: sampleResult.error });
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Log sample info for debugging
    console.log("Download request:", {
      sampleId,
      sampleName: sample.name,
      filePath: sample.file_path,
      packId: sample.pack?.id,
      isPublished: sample.pack?.is_published,
    });

    // Check if pack is published
    if (!sample.pack?.is_published) {
      return NextResponse.json({ error: "Pack not available" }, { status: 404 });
    }

    // Check if pack is archived (expired based on end_date or default window)
    if (isPackExpiredWithEndDate(sample.pack.release_date, sample.pack.end_date)) {
      return NextResponse.json(
        { error: "Pack has been archived and is no longer available for download" },
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
      console.error("Error generating signed URL:", {
        error: urlError,
        filePath: sample.file_path,
        sampleId,
      });
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }

    console.log("Signed URL generated successfully for:", sample.name);

    // Record download for analytics (ignore errors - don't block download)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("downloads") as any).insert({
        user_id: user.id,
        sample_id: sampleId,
      });
    } catch (insertErr) {
      // Ignore insert errors (e.g., duplicate entry) - analytics shouldn't block downloads
      console.warn("Download analytics insert warning:", insertErr);
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

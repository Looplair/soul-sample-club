import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Get status of samples needing MP3 preview generation
 *
 * GET /api/admin/samples/batch-generate-previews
 * Returns list of samples without preview_path
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get samples without preview_path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pendingSamples, error: pendingError } = await (adminSupabase as any)
      .from("samples")
      .select("id, name, file_path, file_size")
      .is("preview_path", null)
      .order("created_at", { ascending: false });

    if (pendingError) {
      console.error("Error fetching pending samples:", pendingError);
      return NextResponse.json({ error: "Failed to fetch samples" }, { status: 500 });
    }

    // Get count of samples with preview_path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: completedCount } = await (adminSupabase as any)
      .from("samples")
      .select("*", { count: "exact", head: true })
      .not("preview_path", "is", null);

    return NextResponse.json({
      pending: pendingSamples?.length || 0,
      completed: completedCount || 0,
      samples: pendingSamples || [],
    });
  } catch (error) {
    console.error("Error getting batch status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Start batch processing to generate MP3 previews
 *
 * POST /api/admin/samples/batch-generate-previews
 * Body: { limit?: number } - max samples to process (default 10)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { limit = 10 } = await request.json().catch(() => ({}));

    // Get samples without preview_path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pendingSamples, error: pendingError } = await (adminSupabase as any)
      .from("samples")
      .select("id, name, file_path")
      .is("preview_path", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (pendingError) {
      console.error("Error fetching pending samples:", pendingError);
      return NextResponse.json({ error: "Failed to fetch samples" }, { status: 500 });
    }

    if (!pendingSamples || pendingSamples.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No samples need processing",
        processed: 0,
      });
    }

    // Process each sample
    const results: Array<{
      id: string;
      name: string;
      success: boolean;
      error?: string;
      size_reduction?: string;
    }> = [];

    for (const sample of pendingSamples) {
      try {
        // Call the generate-preview endpoint for each sample
        const response = await fetch(
          new URL("/api/admin/samples/generate-preview", request.url).toString(),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({ sampleId: sample.id }),
          }
        );

        const result = await response.json();

        if (response.ok && result.success) {
          results.push({
            id: sample.id,
            name: sample.name,
            success: true,
            size_reduction: result.size_reduction,
          });
        } else {
          results.push({
            id: sample.id,
            name: sample.name,
            success: false,
            error: result.error || "Unknown error",
          });
        }
      } catch (err) {
        results.push({
          id: sample.id,
          name: sample.name,
          success: false,
          error: err instanceof Error ? err.message : "Processing failed",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      processed: results.length,
      succeeded: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error("Error in batch processing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Type for sample with pack relation
interface SampleData {
  id: string;
  file_path: string;
  pack: {
    is_published: boolean;
  } | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sampleId: string }> }
) {
  try {
    const { sampleId } = await params;
    const adminSupabase = createAdminClient();

    // Public preview - no authentication required
    // Anyone can preview samples from published packs

    // Get sample with file path using admin client
    const sampleResult = await adminSupabase
      .from("samples")
      .select(
        `
        id,
        file_path,
        pack:packs(is_published)
      `
      )
      .eq("id", sampleId)
      .single();

    const sample = sampleResult.data as SampleData | null;

    if (sampleResult.error || !sample) {
      console.error("Sample not found:", sampleId, sampleResult.error);
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Check if pack is published
    if (!sample.pack?.is_published) {
      return NextResponse.json({ error: "Pack not available" }, { status: 404 });
    }

    // Use the main WAV file_path directly (no separate preview logic)
    let audioPath = sample.file_path;

    if (!audioPath) {
      console.error("No file_path for sample:", sampleId);
      return NextResponse.json(
        { error: "Audio file not available" },
        { status: 404 }
      );
    }

    // Normalize the path - remove leading slash if present
    audioPath = audioPath.replace(/^\/+/, "");

    console.log("Attempting to get URL for path:", audioPath);

    // Try signed URL first (more reliable)
    const { data: signedUrlData, error: signedError } = await adminSupabase.storage
      .from("samples")
      .createSignedUrl(audioPath, 3600); // 1 hour

    if (signedError) {
      console.error("Signed URL error:", signedError.message, "path:", audioPath);

      // Check if file exists
      const pathParts = audioPath.split("/");
      const folder = pathParts.slice(0, -1).join("/");
      const filename = pathParts[pathParts.length - 1];

      const { data: listData, error: listError } = await adminSupabase.storage
        .from("samples")
        .list(folder, { limit: 100 });

      console.log("Files in folder", folder, ":", listData?.map(f => f.name));
      console.log("Looking for:", filename);

      return NextResponse.json(
        { error: "Failed to generate audio URL", details: signedError.message },
        { status: 500 }
      );
    }

    console.log("Preview signed URL generated for sample:", sampleId);
    return NextResponse.json({ url: signedUrlData.signedUrl });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

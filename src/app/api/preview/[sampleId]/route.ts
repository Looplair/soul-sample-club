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

    // Check if client wants streaming audio or just the URL
    const url = new URL(request.url);
    const stream = url.searchParams.get("stream") === "true";

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

    // Use the main WAV file_path directly
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

    if (stream) {
      // Stream the audio directly through our API (bypasses CORS)
      const { data: fileData, error: downloadError } = await adminSupabase.storage
        .from("samples")
        .download(audioPath);

      if (downloadError || !fileData) {
        console.error("Download error:", downloadError?.message, "path:", audioPath);
        return NextResponse.json(
          { error: "Failed to download audio" },
          { status: 500 }
        );
      }

      // Return the audio file with proper headers
      const headers = new Headers();
      headers.set("Content-Type", "audio/wav");
      headers.set("Content-Length", fileData.size.toString());
      headers.set("Accept-Ranges", "bytes");
      headers.set("Cache-Control", "public, max-age=3600");

      return new NextResponse(fileData, {
        status: 200,
        headers,
      });
    } else {
      // Return signed URL (for clients that can handle CORS)
      const { data: signedUrlData, error: signedError } = await adminSupabase.storage
        .from("samples")
        .createSignedUrl(audioPath, 3600); // 1 hour

      if (signedError) {
        console.error("Signed URL error:", signedError.message, "path:", audioPath);
        return NextResponse.json(
          { error: "Failed to generate audio URL", details: signedError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ url: signedUrlData.signedUrl });
    }
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

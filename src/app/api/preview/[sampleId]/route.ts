import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Type for sample with pack relation
interface SampleData {
  id: string;
  file_path: string;
  preview_path: string | null;
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

    // Get sample with file path using admin client
    const sampleResult = await adminSupabase
      .from("samples")
      .select(
        `
        id,
        file_path,
        preview_path,
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

    // Prefer MP3 preview if available, otherwise fall back to WAV
    let audioPath = sample.preview_path || sample.file_path;

    if (!audioPath) {
      console.error("No file_path for sample:", sampleId);
      return NextResponse.json(
        { error: "Audio file not available" },
        { status: 404 }
      );
    }

    // Normalize the path - remove leading slash if present
    // Do NOT include bucket name in path - just folder/filename
    audioPath = audioPath.replace(/^\/+/, "");

    // Use PUBLIC URL for previews - signed URLs cause issues with waveform libraries
    // that make multiple fetches, range requests, and retries
    const { data: publicUrlData } = adminSupabase.storage
      .from("samples")
      .getPublicUrl(audioPath);

    if (!publicUrlData?.publicUrl) {
      console.error("Failed to get public URL for:", audioPath);
      return NextResponse.json(
        { error: "Failed to generate audio URL", path: audioPath },
        { status: 500 }
      );
    }

    // Determine content type based on file extension
    const isMP3 = audioPath.toLowerCase().endsWith('.mp3');

    return NextResponse.json({
      url: publicUrlData.publicUrl,
      format: isMP3 ? 'mp3' : 'wav'
    });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

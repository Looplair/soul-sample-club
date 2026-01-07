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
    audioPath = audioPath.replace(/^\/+/, "");

    // If preview_path is set (MP3), verify the file actually exists
    // by checking the storage. If it doesn't exist, fall back to WAV
    if (sample.preview_path && audioPath.toLowerCase().endsWith('.mp3')) {
      // Check if MP3 file exists by trying to get its metadata
      const folderPath = audioPath.split('/').slice(0, -1).join('/');
      const fileName = audioPath.split('/').pop();

      const { data: files } = await adminSupabase.storage
        .from("samples")
        .list(folderPath, { search: fileName });

      const mp3Exists = files && files.some(f => f.name === fileName);

      if (!mp3Exists) {
        // MP3 doesn't exist, fall back to WAV
        console.log("MP3 preview not found, falling back to WAV:", audioPath);
        audioPath = sample.file_path.replace(/^\/+/, "");
      }
    }

    // Generate signed URL
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

    // Determine content type based on file extension
    const isMP3 = audioPath.toLowerCase().endsWith('.mp3');

    return NextResponse.json({
      url: signedUrlData.signedUrl,
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

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Type for sample with pack relation
interface SamplePreview {
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
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get sample with preview path and file path
    const sampleResult = await supabase
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

    const sample = sampleResult.data as SamplePreview | null;

    if (sampleResult.error || !sample) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Check if pack is published
    if (!sample.pack?.is_published) {
      return NextResponse.json({ error: "Pack not available" }, { status: 404 });
    }

    // Use preview_path if available, otherwise fall back to file_path
    const audioPath = sample.preview_path || sample.file_path;

    if (!audioPath) {
      return NextResponse.json(
        { error: "Preview not available" },
        { status: 404 }
      );
    }

    // Generate signed URL for preview from the samples bucket (valid for 5 minutes)
    const { data: signedUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUrl(audioPath, 300);

    if (urlError || !signedUrl) {
      console.error("Error generating preview URL:", urlError);
      return NextResponse.json(
        { error: "Failed to generate preview URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

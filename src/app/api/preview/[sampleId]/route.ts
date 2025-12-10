import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Type for sample with pack relation
interface SamplePreview {
  id: string;
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

    // Get sample with preview path
    const sampleResult = await supabase
      .from("samples")
      .select(
        `
        id,
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

    // Check if preview exists
    if (!sample.preview_path) {
      return NextResponse.json(
        { error: "Preview not available" },
        { status: 404 }
      );
    }

    // Generate signed URL for preview (valid for 5 minutes)
    // Previews are shorter clips, so we can be more generous with time
    const { data: signedUrl, error: urlError } = await adminSupabase.storage
      .from("previews")
      .createSignedUrl(sample.preview_path, 300);

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

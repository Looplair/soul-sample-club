import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// This route generates a presigned URL for direct upload to Supabase Storage
// This bypasses Next.js body size limits entirely

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Verify user is authenticated and is admin
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin using admin client (bypasses RLS)
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const profileData = profile as { is_admin: boolean } | null;
    if (!profileData?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { sampleId, packId, fileName } = body;

    if (!sampleId || !packId || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate the file path
    const stemsFileName = `${packId}/${Date.now()}-stems.zip`;

    // Create a signed upload URL (valid for 10 minutes)
    const { data: uploadUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUploadUrl(stemsFileName);

    if (urlError || !uploadUrl) {
      console.error("Error creating signed upload URL:", urlError);
      return NextResponse.json(
        { error: "Failed to create upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl: uploadUrl.signedUrl,
      token: uploadUrl.token,
      path: stemsFileName,
      sampleId,
    });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const profileData = profile as { is_admin: boolean } | null;
    if (!profileData?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { packId } = body;

    if (!packId) {
      return NextResponse.json({ error: "Missing packId" }, { status: 400 });
    }

    const zipPath = `pack-zips/${packId}/${Date.now()}-full-pack.zip`;

    const { data: uploadUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUploadUrl(zipPath);

    if (urlError || !uploadUrl) {
      console.error("Error creating signed upload URL:", urlError);
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    return NextResponse.json({
      token: uploadUrl.token,
      path: zipPath,
    });
  } catch (error) {
    console.error("Pack zip presign error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

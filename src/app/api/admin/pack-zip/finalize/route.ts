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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { packId, zipPath } = body;

    if (!packId || !zipPath) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updateData, error: dbError } = await (adminSupabase as any)
      .from("packs")
      .update({ pack_zip_path: zipPath })
      .eq("id", packId)
      .select();

    if (dbError) {
      console.error("Pack zip database update error:", dbError);
      return NextResponse.json({ error: "Failed to update database", details: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      pack_zip_path: zipPath,
      pack: updateData?.[0],
    });
  } catch (error) {
    console.error("Pack zip finalize error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

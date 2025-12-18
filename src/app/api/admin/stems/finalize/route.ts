import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// This route updates the database after a successful direct upload to storage

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Verify user is authenticated and is admin
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const profileData = profile as { role: string } | null;
    if (profileData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { sampleId, stemsPath } = body;

    if (!sampleId || !stemsPath) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("Finalizing stems upload:", { sampleId, stemsPath });

    // Update the sample record using admin client (bypasses RLS)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updateData, error: dbError } = await (adminSupabase as any)
      .from("samples")
      .update({ stems_path: stemsPath })
      .eq("id", sampleId)
      .select();

    if (dbError) {
      console.error("Stems database update error:", dbError);
      return NextResponse.json(
        { error: "Failed to update database", details: dbError.message },
        { status: 500 }
      );
    }

    console.log("Database updated:", updateData);

    return NextResponse.json({
      success: true,
      stems_path: stemsPath,
      sample: updateData?.[0],
    });
  } catch (error) {
    console.error("Finalize error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Get the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const sampleId = formData.get("sampleId") as string;
    const packId = formData.get("packId") as string;

    if (!file || !sampleId || !packId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("Admin stems upload:", { sampleId, packId, fileName: file.name, size: file.size });

    // Generate the file path
    const stemsFileName = `${packId}/${Date.now()}-stems.zip`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to storage using admin client (bypasses RLS)
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from("samples")
      .upload(stemsFileName, buffer, {
        contentType: "application/zip",
        upsert: false,
      });

    if (uploadError) {
      console.error("Stems storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload stems file", details: uploadError.message },
        { status: 500 }
      );
    }

    console.log("Stems file uploaded:", uploadData);

    // Update the sample record using admin client (bypasses RLS)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updateData, error: dbError } = await (adminSupabase as any)
      .from("samples")
      .update({ stems_path: stemsFileName })
      .eq("id", sampleId)
      .select();

    if (dbError) {
      console.error("Stems database update error:", dbError);
      // Try to clean up the uploaded file
      await adminSupabase.storage.from("samples").remove([stemsFileName]);
      return NextResponse.json(
        { error: "Failed to update database", details: dbError.message },
        { status: 500 }
      );
    }

    console.log("Database updated:", updateData);

    return NextResponse.json({
      success: true,
      stems_path: stemsFileName,
      sample: updateData?.[0],
    });
  } catch (error) {
    console.error("Admin stems upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

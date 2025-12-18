"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadStems(formData: FormData) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Verify user is authenticated and is admin
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const profileData = profile as { role: string } | null;
    if (profileData?.role !== "admin") {
      return { error: "Forbidden" };
    }

    // Get the form data
    const file = formData.get("file") as File;
    const sampleId = formData.get("sampleId") as string;
    const packId = formData.get("packId") as string;

    if (!file || !sampleId || !packId) {
      return { error: "Missing required fields" };
    }

    console.log("Server action stems upload:", { sampleId, packId, fileName: file.name, size: file.size });

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
      return { error: "Failed to upload stems file", details: uploadError.message };
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
      return { error: "Failed to update database", details: dbError.message };
    }

    console.log("Database updated:", updateData);

    return {
      success: true,
      stems_path: stemsFileName,
      sample: updateData?.[0],
    };
  } catch (error) {
    console.error("Server action stems upload error:", error);
    return { error: "Internal server error" };
  }
}

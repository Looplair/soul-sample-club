// src/app/api/drum-vault/[id]/download/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid break ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ownership check — must have collected this break
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collectionResult = await (adminSupabase as any)
      .from("break_collections")
      .select("id")
      .eq("user_id", user.id)
      .eq("break_id", id)
      .single();

    if (collectionResult.error || !collectionResult.data) {
      return NextResponse.json(
        { error: "You have not collected this break" },
        { status: 403 }
      );
    }

    // Get break file path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breakResult = await (adminSupabase as any)
      .from("drum_breaks")
      .select("name, file_path")
      .eq("id", id)
      .single();

    if (breakResult.error || !breakResult.data) {
      return NextResponse.json({ error: "Break not found" }, { status: 404 });
    }

    const drumBreak = breakResult.data as { name: string; file_path: string | null };

    if (!drumBreak.file_path) {
      return NextResponse.json({ error: "File not available" }, { status: 404 });
    }

    // Generate signed download URL (valid 60 seconds)
    const { data: signedUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUrl(drumBreak.file_path, 60, {
        download: `${drumBreak.name}.wav`,
      });

    if (urlError || !signedUrl) {
      console.error("Error generating signed URL:", urlError);
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (error) {
    console.error("Vault download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

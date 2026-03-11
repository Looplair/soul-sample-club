// src/app/api/drum-vault/[id]/preview/route.ts
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

    // Auth check — any logged-in user can preview
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get break audio path (prefer preview_path for smaller file)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breakResult = await (adminSupabase as any)
      .from("drum_breaks")
      .select("preview_path, file_path")
      .eq("id", id)
      .eq("is_published", true)
      .single();

    if (breakResult.error || !breakResult.data) {
      return NextResponse.json({ error: "Break not found" }, { status: 404 });
    }

    const br = breakResult.data as { preview_path: string | null; file_path: string | null };
    let audioPath = br.preview_path || br.file_path;

    if (!audioPath) {
      return NextResponse.json({ error: "Audio not available" }, { status: 404 });
    }

    audioPath = audioPath.replace(/^\/+/, "");

    // Use public URL for streaming (same reason as existing preview route)
    const { data: publicUrlData } = adminSupabase.storage
      .from("samples")
      .getPublicUrl(audioPath);

    if (!publicUrlData?.publicUrl) {
      return NextResponse.json({ error: "Failed to generate audio URL" }, { status: 500 });
    }

    const isMP3 = audioPath.toLowerCase().endsWith(".mp3");
    return NextResponse.json({ url: publicUrlData.publicUrl, format: isMP3 ? "mp3" : "wav" });
  } catch (error) {
    console.error("Vault preview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

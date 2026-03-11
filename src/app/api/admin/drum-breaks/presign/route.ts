// src/app/api/admin/drum-breaks/presign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (adminSupabase as any)
      .from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { fileName, type } = body; // type: 'full' | 'preview'

    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    const prefix = type === "preview" ? "drum-breaks/previews" : "drum-breaks/full";
    const storagePath = `${prefix}/${Date.now()}-${fileName}`;

    const { data: uploadUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUploadUrl(storagePath);

    if (urlError || !uploadUrl) {
      console.error("Error creating signed upload URL:", urlError);
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: uploadUrl.signedUrl,
      token: uploadUrl.token,
      path: storagePath,
    });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

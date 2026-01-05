import ffmpegPath from "ffmpeg-static";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { sampleId } = await request.json();

    if (!sampleId) {
      return NextResponse.json({ error: "Missing sampleId" }, { status: 400 });
    }

    // Fetch sample
    const { data: sample, error: sampleError } = await (adminSupabase as any)
      .from("samples")
      .select("id, file_path")
      .eq("id", sampleId)
      .single();

    if (sampleError || !sample) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Download WAV from Supabase Storage
    const { data: wavData, error: downloadError } =
      await adminSupabase.storage
        .from("samples")
        .download(sample.file_path);

    if (downloadError || !wavData) {
      throw new Error("Failed to download WAV");
    }

    const inputPath = join(tmpdir(), `${sample.id}.wav`);
    const outputPath = join(tmpdir(), `${sample.id}.mp3`);

    const buffer = Buffer.from(await wavData.arrayBuffer());
    await writeFile(inputPath, buffer);

    // Run FFmpeg
      await execAsync(
        `"${ffmpegPath}" -y -i "${inputPath}" -vn -ar 44100 -ac 2 -b:a 128k "${outputPath}"`
      );


    // Upload MP3 preview
    const mp3Buffer = await import("fs/promises").then(fs =>
      fs.readFile(outputPath)
    );

    const previewPath = sample.file_path.replace(/\.wav$/i, ".mp3");

    const { error: uploadError } = await adminSupabase.storage
      .from("samples")
      .upload(previewPath, mp3Buffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error("Failed to upload MP3 preview");
    }

    // Update DB
    await (adminSupabase as any)
      .from("samples")
      .update({ preview_path: previewPath })
      .eq("id", sample.id);

    // Cleanup
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return NextResponse.json({
      success: true,
      preview_path: previewPath,
    });
  } catch (err) {
    console.error("Preview generation failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to convert to MP3" },
      { status: 500 }
    );
  }
}

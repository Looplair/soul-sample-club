// Supabase Edge Function: generate-preview
// Automatically converts WAV uploads to MP3 previews (30 second limit)
// Triggered by storage.object.created on the samples bucket

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { FFmpeg } from "https://esm.sh/@ffmpeg/ffmpeg@0.12.10";
import { fetchFile } from "https://esm.sh/@ffmpeg/util@0.12.1";

interface StoragePayload {
  type: string;
  table: string;
  record: {
    id: string;
    bucket_id: string;
    name: string;
    owner: string | null;
    created_at: string;
    updated_at: string;
    last_accessed_at: string;
    metadata: Record<string, unknown> | null;
  } | null;
  schema: string;
  old_record: unknown;
}

serve(async (req: Request) => {
  try {
    const payload: StoragePayload = await req.json();
    const record = payload?.record;

    if (!record) {
      console.log("No record in payload");
      return new Response("No record", { status: 200 });
    }

    const { bucket_id, name } = record;

    // Only process WAV files in the samples bucket
    if (bucket_id !== "samples") {
      console.log("Ignoring non-samples bucket:", bucket_id);
      return new Response("Ignored: wrong bucket", { status: 200 });
    }

    if (!name.toLowerCase().endsWith(".wav")) {
      console.log("Ignoring non-WAV file:", name);
      return new Response("Ignored: not a WAV file", { status: 200 });
    }

    // Prevent infinite loops - don't process if MP3 already exists
    const previewPath = name.replace(/\.wav$/i, ".mp3");

    console.log(`Processing WAV: ${name}`);
    console.log(`Will create MP3: ${previewPath}`);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response("Missing env vars", { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download the WAV file
    console.log("Downloading WAV file...");
    const { data: wavData, error: downloadError } = await supabase.storage
      .from("samples")
      .download(name);

    if (downloadError || !wavData) {
      console.error("Failed to download WAV:", downloadError);
      return new Response(`Download error: ${downloadError?.message}`, { status: 500 });
    }

    console.log(`Downloaded WAV: ${wavData.size} bytes`);

    // Initialize FFmpeg WASM
    console.log("Loading FFmpeg WASM...");
    const ffmpeg = new FFmpeg();

    await ffmpeg.load({
      coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
      wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
    });

    console.log("FFmpeg loaded successfully");

    // Write input file
    await ffmpeg.writeFile("input.wav", await fetchFile(wavData));

    // Convert to MP3 (30 second preview, stereo, 44.1kHz, 128kbps)
    console.log("Converting to MP3 (30s preview)...");
    await ffmpeg.exec([
      "-t", "30",           // Limit to 30 seconds
      "-i", "input.wav",    // Input file
      "-ac", "2",           // Stereo
      "-ar", "44100",       // 44.1kHz sample rate
      "-b:a", "128k",       // 128kbps bitrate
      "-y",                 // Overwrite output
      "output.mp3"          // Output file
    ]);

    // Read the output MP3
    const mp3Data = await ffmpeg.readFile("output.mp3");
    console.log(`MP3 generated: ${mp3Data.length} bytes`);

    // Upload MP3 to storage
    console.log("Uploading MP3...");
    const { error: uploadError } = await supabase.storage
      .from("samples")
      .upload(previewPath, mp3Data, {
        contentType: "audio/mpeg",
        upsert: true
      });

    if (uploadError) {
      console.error("Failed to upload MP3:", uploadError);
      return new Response(`Upload error: ${uploadError.message}`, { status: 500 });
    }

    console.log("MP3 uploaded successfully");

    // Update the database record with the preview path
    console.log("Updating database...");
    const { error: updateError } = await supabase
      .from("samples")
      .update({ preview_path: previewPath })
      .eq("file_path", name);

    if (updateError) {
      console.error("Failed to update database:", updateError);
      // Don't fail - the MP3 is already uploaded
    } else {
      console.log("Database updated successfully");
    }

    console.log(`Preview generation complete: ${previewPath}`);
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, {
      status: 500
    });
  }
});

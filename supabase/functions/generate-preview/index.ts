// Supabase Edge Function to generate MP3 previews from WAV files
// Triggered via database webhook when a new sample is inserted

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SamplePayload {
  type: "INSERT" | "UPDATE";
  table: string;
  record: {
    id: string;
    file_path: string;
    preview_path: string | null;
  };
  old_record: null | {
    id: string;
    file_path: string;
    preview_path: string | null;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook payload
    const payload: SamplePayload = await req.json();

    console.log("Received payload:", JSON.stringify(payload, null, 2));

    // Only process INSERT events or UPDATE events where preview_path is still null
    if (payload.type !== "INSERT" && payload.type !== "UPDATE") {
      return new Response(
        JSON.stringify({ message: "Ignoring non-INSERT/UPDATE event" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sample = payload.record;

    // Skip if preview already exists
    if (sample.preview_path) {
      return new Response(
        JSON.stringify({ message: "Preview already exists, skipping" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if file_path is not a WAV file
    if (!sample.file_path || !sample.file_path.toLowerCase().endsWith(".wav")) {
      return new Response(
        JSON.stringify({ message: "Not a WAV file, skipping" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing sample ${sample.id}: ${sample.file_path}`);

    // Download the WAV file from storage
    const { data: wavData, error: downloadError } = await supabase.storage
      .from("samples")
      .download(sample.file_path);

    if (downloadError || !wavData) {
      console.error("Download error:", downloadError);
      throw new Error(`Failed to download WAV file: ${downloadError?.message}`);
    }

    console.log(`Downloaded WAV file, size: ${wavData.size} bytes`);

    // Convert WAV to MP3 using FFmpeg via external service
    // Since Deno Edge Functions can't run FFmpeg directly, we use a cloud encoding approach
    // Option 1: Use a simple audio conversion - create a lower quality WAV as "preview"
    // Option 2: Call an external FFmpeg service

    // For now, we'll use the browser-compatible approach:
    // Read the WAV, and upload it as-is but we'll mark it as needing conversion
    // The actual conversion will happen via the admin batch process

    // Actually, let's use the lamejs library approach for pure JS MP3 encoding
    const wavBuffer = await wavData.arrayBuffer();
    const wavArray = new Uint8Array(wavBuffer);

    // Parse WAV header to get audio parameters
    const wavInfo = parseWavHeader(wavArray);
    console.log("WAV info:", wavInfo);

    if (!wavInfo) {
      throw new Error("Invalid WAV file format");
    }

    // Extract PCM data (skip WAV header)
    const pcmData = wavArray.slice(wavInfo.dataOffset);

    // Convert to Int16Array for processing
    const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);

    // Simple MP3 encoding using lamejs loaded from CDN
    const { default: lamejs } = await import("https://esm.sh/lamejs@1.2.1");

    const mp3Encoder = new lamejs.Mp3Encoder(wavInfo.numChannels, wavInfo.sampleRate, 128);
    const mp3Data: Uint8Array[] = [];

    const sampleBlockSize = 1152; // Must be multiple of 576 for LAME

    if (wavInfo.numChannels === 2) {
      // Stereo
      const leftChannel = new Int16Array(samples.length / 2);
      const rightChannel = new Int16Array(samples.length / 2);

      for (let i = 0; i < samples.length; i += 2) {
        leftChannel[i / 2] = samples[i];
        rightChannel[i / 2] = samples[i + 1];
      }

      for (let i = 0; i < leftChannel.length; i += sampleBlockSize) {
        const leftChunk = leftChannel.subarray(i, i + sampleBlockSize);
        const rightChunk = rightChannel.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(new Uint8Array(mp3buf));
        }
      }
    } else {
      // Mono
      for (let i = 0; i < samples.length; i += sampleBlockSize) {
        const chunk = samples.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3Encoder.encodeBuffer(chunk);
        if (mp3buf.length > 0) {
          mp3Data.push(new Uint8Array(mp3buf));
        }
      }
    }

    // Flush remaining data
    const mp3End = mp3Encoder.flush();
    if (mp3End.length > 0) {
      mp3Data.push(new Uint8Array(mp3End));
    }

    // Combine all MP3 chunks
    const totalLength = mp3Data.reduce((acc, chunk) => acc + chunk.length, 0);
    const mp3Buffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of mp3Data) {
      mp3Buffer.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(`Generated MP3, size: ${mp3Buffer.length} bytes`);

    // Upload the MP3 preview
    const previewPath = sample.file_path.replace(/\.wav$/i, ".mp3");

    const { error: uploadError } = await supabase.storage
      .from("samples")
      .upload(previewPath, mp3Buffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload MP3: ${uploadError.message}`);
    }

    console.log(`Uploaded MP3 to: ${previewPath}`);

    // Update the sample record with the preview path
    const { error: updateError } = await supabase
      .from("samples")
      .update({ preview_path: previewPath })
      .eq("id", sample.id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update sample record: ${updateError.message}`);
    }

    console.log(`Updated sample ${sample.id} with preview_path: ${previewPath}`);

    return new Response(
      JSON.stringify({
        success: true,
        sample_id: sample.id,
        preview_path: previewPath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing sample:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// Parse WAV header to extract audio parameters
function parseWavHeader(data: Uint8Array): {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
  dataOffset: number;
} | null {
  // Check RIFF header
  if (
    data[0] !== 0x52 || // R
    data[1] !== 0x49 || // I
    data[2] !== 0x46 || // F
    data[3] !== 0x46    // F
  ) {
    return null;
  }

  // Check WAVE format
  if (
    data[8] !== 0x57 ||  // W
    data[9] !== 0x41 ||  // A
    data[10] !== 0x56 || // V
    data[11] !== 0x45    // E
  ) {
    return null;
  }

  // Find fmt chunk
  let offset = 12;
  while (offset < data.length - 8) {
    const chunkId = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
    const chunkSize = data[offset + 4] | (data[offset + 5] << 8) | (data[offset + 6] << 16) | (data[offset + 7] << 24);

    if (chunkId === "fmt ") {
      const numChannels = data[offset + 10] | (data[offset + 11] << 8);
      const sampleRate = data[offset + 12] | (data[offset + 13] << 8) | (data[offset + 14] << 16) | (data[offset + 15] << 24);
      const bitsPerSample = data[offset + 22] | (data[offset + 23] << 8);

      // Now find data chunk
      let dataOffset = offset + 8 + chunkSize;
      while (dataOffset < data.length - 8) {
        const dataChunkId = String.fromCharCode(data[dataOffset], data[dataOffset + 1], data[dataOffset + 2], data[dataOffset + 3]);
        if (dataChunkId === "data") {
          return {
            numChannels,
            sampleRate,
            bitsPerSample,
            dataOffset: dataOffset + 8, // Skip "data" + size
          };
        }
        const dataChunkSize = data[dataOffset + 4] | (data[dataOffset + 5] << 8) | (data[dataOffset + 6] << 16) | (data[dataOffset + 7] << 24);
        dataOffset += 8 + dataChunkSize;
      }
    }

    offset += 8 + chunkSize;
  }

  return null;
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
// @ts-expect-error - lamejs doesn't have TypeScript definitions
import lamejs from "lamejs";

/**
 * Generate MP3 preview for a sample
 * Converts WAV to 128kbps MP3 for faster streaming
 * Uses lamejs (pure JS) which works on Vercel serverless
 *
 * POST /api/admin/samples/generate-preview
 * Body: { sampleId: string }
 */
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sample, error: sampleError } = await (adminSupabase as any)
      .from("samples")
      .select("id, file_path, preview_path")
      .eq("id", sampleId)
      .single();

    if (sampleError || !sample) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Skip if already has MP3 preview
    if (sample.preview_path && sample.preview_path.endsWith('.mp3')) {
      return NextResponse.json({
        success: true,
        message: "MP3 preview already exists",
        preview_path: sample.preview_path,
      });
    }

    // Download WAV from Supabase Storage
    const { data: wavData, error: downloadError } = await adminSupabase.storage
      .from("samples")
      .download(sample.file_path);

    if (downloadError || !wavData) {
      console.error("Failed to download WAV:", downloadError);
      return NextResponse.json({ error: "Failed to download WAV file" }, { status: 500 });
    }

    // Convert WAV to MP3
    const wavBuffer = await wavData.arrayBuffer();
    const mp3Data = convertWavToMp3(wavBuffer);

    if (!mp3Data) {
      return NextResponse.json({ error: "Failed to convert WAV to MP3" }, { status: 500 });
    }

    // Generate preview path
    const previewPath = sample.file_path.replace(/\.wav$/i, ".mp3");

    // Upload MP3 to Supabase
    const { error: uploadError } = await adminSupabase.storage
      .from("samples")
      .upload(previewPath, mp3Data, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload MP3:", uploadError);
      return NextResponse.json({ error: "Failed to upload MP3" }, { status: 500 });
    }

    // Update DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase as any)
      .from("samples")
      .update({ preview_path: previewPath })
      .eq("id", sample.id);

    const originalSize = wavBuffer.byteLength;
    const mp3Size = mp3Data.byteLength;
    const reduction = ((1 - mp3Size / originalSize) * 100).toFixed(1);

    return NextResponse.json({
      success: true,
      preview_path: previewPath,
      original_size: originalSize,
      mp3_size: mp3Size,
      size_reduction: `${reduction}%`,
    });
  } catch (err) {
    console.error("Preview generation failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to convert to MP3" },
      { status: 500 }
    );
  }
}

/**
 * Convert WAV buffer to MP3 using lamejs (pure JavaScript)
 */
function convertWavToMp3(wavBuffer: ArrayBuffer): Uint8Array | null {
  try {
    const view = new DataView(wavBuffer);

    // Verify WAV header
    const riff = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    if (riff !== "RIFF") {
      console.error("Not a valid WAV file - missing RIFF header");
      return null;
    }

    // Parse WAV header
    let offset = 12;
    let numChannels = 2;
    let sampleRate = 44100;
    let bitsPerSample = 16;
    let dataOffset = 0;
    let dataSize = 0;

    while (offset < wavBuffer.byteLength - 8) {
      const chunkId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === "fmt ") {
        numChannels = view.getUint16(offset + 10, true);
        sampleRate = view.getUint32(offset + 12, true);
        bitsPerSample = view.getUint16(offset + 22, true);
      } else if (chunkId === "data") {
        dataOffset = offset + 8;
        dataSize = chunkSize;
        break;
      }

      offset += 8 + chunkSize;
      if (chunkSize % 2 !== 0) offset++;
    }

    if (dataOffset === 0 || dataSize === 0) {
      console.error("Could not find data chunk in WAV");
      return null;
    }

    console.log(`WAV: ${numChannels}ch, ${sampleRate}Hz, ${bitsPerSample}bit`);

    // Extract PCM samples
    const bytesPerSample = bitsPerSample / 8;
    const totalSamples = Math.floor(dataSize / (bytesPerSample * numChannels));

    // Create sample arrays
    const leftChannel = new Int16Array(totalSamples);
    const rightChannel = numChannels === 2 ? new Int16Array(totalSamples) : null;

    // Read samples
    for (let i = 0; i < totalSamples; i++) {
      const sampleOffset = dataOffset + i * bytesPerSample * numChannels;

      if (bitsPerSample === 16) {
        leftChannel[i] = view.getInt16(sampleOffset, true);
        if (rightChannel) {
          rightChannel[i] = view.getInt16(sampleOffset + 2, true);
        }
      } else if (bitsPerSample === 24) {
        // Convert 24-bit to 16-bit
        const left24 =
          (view.getInt8(sampleOffset + 2) << 16) |
          (view.getUint8(sampleOffset + 1) << 8) |
          view.getUint8(sampleOffset);
        leftChannel[i] = left24 >> 8;

        if (rightChannel) {
          const right24 =
            (view.getInt8(sampleOffset + 5) << 16) |
            (view.getUint8(sampleOffset + 4) << 8) |
            view.getUint8(sampleOffset + 3);
          rightChannel[i] = right24 >> 8;
        }
      } else if (bitsPerSample === 32) {
        // 32-bit int to 16-bit
        leftChannel[i] = view.getInt32(sampleOffset, true) >> 16;
        if (rightChannel) {
          rightChannel[i] = view.getInt32(sampleOffset + 4, true) >> 16;
        }
      }
    }

    // Initialize MP3 encoder - 128kbps
    const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128);
    const mp3Data: number[] = [];
    const sampleBlockSize = 1152;

    for (let i = 0; i < totalSamples; i += sampleBlockSize) {
      const leftChunk = leftChannel.subarray(i, i + sampleBlockSize);
      const rightChunk = rightChannel
        ? rightChannel.subarray(i, i + sampleBlockSize)
        : leftChunk;

      const mp3buf =
        numChannels === 1
          ? mp3encoder.encodeBuffer(leftChunk)
          : mp3encoder.encodeBuffer(leftChunk, rightChunk);

      if (mp3buf.length > 0) {
        mp3Data.push(...mp3buf);
      }
    }

    // Flush encoder
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(...mp3buf);
    }

    console.log(`Converted ${totalSamples} samples to ${mp3Data.length} bytes MP3`);

    return new Uint8Array(mp3Data);
  } catch (error) {
    console.error("Error converting WAV to MP3:", error);
    return null;
  }
}

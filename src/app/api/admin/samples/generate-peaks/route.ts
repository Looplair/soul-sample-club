import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generate waveform peaks for a sample
 * This extracts peak amplitude data from the audio file for fast waveform rendering
 *
 * POST /api/admin/samples/generate-peaks
 * Body: { sampleId: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
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
      return NextResponse.json({ error: "Sample ID required" }, { status: 400 });
    }

    // Get sample info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sample, error: sampleError } = await (supabase as any)
      .from("samples")
      .select("id, file_path, preview_path")
      .eq("id", sampleId)
      .single() as { data: { id: string; file_path: string; preview_path: string | null } | null; error: unknown };

    if (sampleError || !sample) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Download the audio file
    const filePath = sample.preview_path || sample.file_path;
    const { data: fileData, error: downloadError } = await adminSupabase.storage
      .from("samples")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Error downloading file:", downloadError);
      return NextResponse.json({ error: "Failed to download audio file" }, { status: 500 });
    }

    // Convert to ArrayBuffer and extract peaks
    const arrayBuffer = await fileData.arrayBuffer();
    const peaks = extractPeaksFromWav(arrayBuffer);

    if (!peaks) {
      return NextResponse.json({ error: "Failed to extract peaks" }, { status: 500 });
    }

    // Save peaks to database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (adminSupabase as any)
      .from("samples")
      .update({ waveform_peaks: peaks })
      .eq("id", sampleId);

    if (updateError) {
      console.error("Error saving peaks:", updateError);
      return NextResponse.json({ error: "Failed to save peaks" }, { status: 500 });
    }

    return NextResponse.json({ success: true, peakCount: peaks.length });
  } catch (error) {
    console.error("Error generating peaks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Extract waveform peaks from WAV file
 * Returns array of normalized peak values (0-1)
 */
function extractPeaksFromWav(arrayBuffer: ArrayBuffer): number[] | null {
  try {
    const view = new DataView(arrayBuffer);

    // Parse WAV header
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (riff !== "RIFF") {
      console.error("Not a valid WAV file");
      return null;
    }

    // Find format chunk
    let offset = 12;
    let numChannels = 2;
    let bitsPerSample = 16;
    let dataOffset = 0;
    let dataSize = 0;

    while (offset < arrayBuffer.byteLength - 8) {
      const chunkId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === "fmt ") {
        numChannels = view.getUint16(offset + 10, true);
        bitsPerSample = view.getUint16(offset + 22, true);
      } else if (chunkId === "data") {
        dataOffset = offset + 8;
        dataSize = chunkSize;
        break;
      }

      offset += 8 + chunkSize;
      // Align to even byte
      if (chunkSize % 2 !== 0) offset++;
    }

    if (dataOffset === 0 || dataSize === 0) {
      console.error("Could not find data chunk");
      return null;
    }

    // Calculate samples
    const bytesPerSample = bitsPerSample / 8;
    const totalSamples = Math.floor(dataSize / (bytesPerSample * numChannels));

    // We want about 200-500 peaks for display
    const targetPeaks = 300;
    const samplesPerPeak = Math.max(1, Math.floor(totalSamples / targetPeaks));

    const peaks: number[] = [];
    const maxVal = Math.pow(2, bitsPerSample - 1);

    for (let i = 0; i < totalSamples; i += samplesPerPeak) {
      let maxPeak = 0;

      // Find max value in this segment
      const segmentEnd = Math.min(i + samplesPerPeak, totalSamples);
      for (let j = i; j < segmentEnd; j++) {
        const sampleOffset = dataOffset + j * bytesPerSample * numChannels;

        // Read sample (handle 16-bit and 24-bit)
        let sampleValue = 0;
        if (bitsPerSample === 16) {
          sampleValue = view.getInt16(sampleOffset, true);
        } else if (bitsPerSample === 24) {
          const b0 = view.getUint8(sampleOffset);
          const b1 = view.getUint8(sampleOffset + 1);
          const b2 = view.getInt8(sampleOffset + 2);
          sampleValue = (b2 << 16) | (b1 << 8) | b0;
        } else if (bitsPerSample === 32) {
          sampleValue = view.getInt32(sampleOffset, true);
        }

        const normalized = Math.abs(sampleValue) / maxVal;
        if (normalized > maxPeak) {
          maxPeak = normalized;
        }
      }

      // Clamp to 0-1 range
      peaks.push(Math.min(1, Math.max(0, maxPeak)));
    }

    return peaks;
  } catch (error) {
    console.error("Error parsing WAV:", error);
    return null;
  }
}

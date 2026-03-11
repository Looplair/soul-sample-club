// src/app/api/admin/drum-breaks/[id]/generate-peaks/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breakResult = await (adminSupabase as any)
      .from("drum_breaks")
      .select("id, file_path, preview_path")
      .eq("id", id)
      .single();

    const drumBreak = breakResult.data as { id: string; file_path: string | null; preview_path: string | null } | null;
    if (breakResult.error || !drumBreak) {
      return NextResponse.json({ error: "Break not found" }, { status: 404 });
    }

    const filePath = drumBreak.preview_path || drumBreak.file_path;
    if (!filePath) {
      return NextResponse.json({ error: "No audio file uploaded yet" }, { status: 400 });
    }

    const { data: fileData, error: downloadError } = await adminSupabase.storage
      .from("samples").download(filePath);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: "Failed to download audio file" }, { status: 500 });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const peaks = extractPeaksFromWav(arrayBuffer);
    if (!peaks) {
      return NextResponse.json({ error: "Failed to extract peaks (file may not be WAV)" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (adminSupabase as any)
      .from("drum_breaks").update({ waveform_peaks: peaks }).eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to save peaks" }, { status: 500 });
    }

    return NextResponse.json({ success: true, peakCount: peaks.length });
  } catch (error) {
    console.error("Error generating peaks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Identical to /api/admin/samples/generate-peaks/route.ts — verbatim copy
function extractPeaksFromWav(arrayBuffer: ArrayBuffer): number[] | null {
  try {
    const view = new DataView(arrayBuffer);
    const riff = String.fromCharCode(view.getUint8(0),view.getUint8(1),view.getUint8(2),view.getUint8(3));
    if (riff !== "RIFF") return null;
    let offset = 12, numChannels = 2, bitsPerSample = 16, dataOffset = 0, dataSize = 0;
    while (offset < arrayBuffer.byteLength - 8) {
      const chunkId = String.fromCharCode(view.getUint8(offset),view.getUint8(offset+1),view.getUint8(offset+2),view.getUint8(offset+3));
      const chunkSize = view.getUint32(offset+4, true);
      if (chunkId === "fmt ") { numChannels = view.getUint16(offset+10,true); bitsPerSample = view.getUint16(offset+22,true); }
      else if (chunkId === "data") { dataOffset = offset+8; dataSize = chunkSize; break; }
      offset += 8 + chunkSize; if (chunkSize % 2 !== 0) offset++;
    }
    if (!dataOffset || !dataSize) return null;
    const bytesPerSample = bitsPerSample / 8;
    const totalSamples = Math.floor(dataSize / (bytesPerSample * numChannels));
    const samplesPerPeak = Math.max(1, Math.floor(totalSamples / 300));
    const peaks: number[] = [];
    const maxVal = Math.pow(2, bitsPerSample - 1);
    for (let i = 0; i < totalSamples; i += samplesPerPeak) {
      let maxPeak = 0;
      for (let j = i; j < Math.min(i + samplesPerPeak, totalSamples); j++) {
        const so = dataOffset + j * bytesPerSample * numChannels;
        let sv = 0;
        if (bitsPerSample === 16) sv = view.getInt16(so, true);
        else if (bitsPerSample === 24) { sv = (view.getInt8(so+2) << 16) | (view.getUint8(so+1) << 8) | view.getUint8(so); }
        else if (bitsPerSample === 32) sv = view.getInt32(so, true);
        const n = Math.abs(sv) / maxVal;
        if (n > maxPeak) maxPeak = n;
      }
      peaks.push(Math.min(1, Math.max(0, maxPeak)));
    }
    return peaks;
  } catch { return null; }
}

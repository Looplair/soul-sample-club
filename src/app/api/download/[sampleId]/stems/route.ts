import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPackExpiredWithEndDate } from "@/lib/utils";
import type { Sample } from "@/types/database";

/**
 * Uploaded stems zips were made with Finder's "Compress", which bakes in
 * a __MACOSX/ folder of AppleDouble resource-fork files (._filename).
 * macOS's own unzip quietly reabsorbs those and hides them; Windows
 * Explorer just dumps them as confusing extra files. Rather than touch
 * the originals in storage, we lazily produce a stripped copy the first
 * time it's requested and reuse it after that.
 */
async function getOrCreateCleanStemsPath(
  adminSupabase: ReturnType<typeof createAdminClient>,
  originalPath: string
): Promise<string> {
  const cleanPath = originalPath.replace(/\.zip$/i, "-clean.zip");

  const { data: existing } = await adminSupabase.storage
    .from("samples")
    .list(cleanPath.split("/").slice(0, -1).join("/"), {
      search: cleanPath.split("/").pop(),
    });
  if (existing?.some((f) => cleanPath.endsWith(f.name))) {
    return cleanPath;
  }

  const { data: original, error: downloadError } = await adminSupabase.storage
    .from("samples")
    .download(originalPath);
  if (downloadError || !original) {
    throw new Error(`Failed to download original stems: ${downloadError?.message}`);
  }

  const zip = await JSZip.loadAsync(await original.arrayBuffer());
  const cleaned = new JSZip();
  for (const [entryPath, entry] of Object.entries(zip.files)) {
    const basename = entryPath.split("/").pop() || "";
    if (entryPath.startsWith("__MACOSX/") || basename.startsWith("._") || basename === ".DS_Store") {
      continue;
    }
    if (entry.dir) {
      cleaned.folder(entryPath);
    } else {
      cleaned.file(entryPath, await entry.async("nodebuffer"));
    }
  }
  const cleanedBuffer = await cleaned.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  const { error: uploadError } = await adminSupabase.storage
    .from("samples")
    .upload(cleanPath, cleanedBuffer, { contentType: "application/zip", upsert: true });
  if (uploadError) {
    throw new Error(`Failed to upload cleaned stems: ${uploadError.message}`);
  }

  return cleanPath;
}

// Type for sample with pack relation
interface SampleWithPack extends Sample {
  pack: {
    id: string;
    release_date: string;
    end_date: string | null;
    is_published: boolean;
  } | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sampleId: string }> }
) {
  try {
    const { sampleId } = await params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-cleanup first: mark any expired active/trialing rows as canceled
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase.from("subscriptions") as any)
      .update({ status: "canceled" })
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .lt("current_period_end", now);

    // Then check subscription status (past_due has no access until the failed payment is fixed)
    const subscriptionResult = await adminSupabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .limit(1);

    const subscription = subscriptionResult.data?.[0] as { status: string; current_period_end: string } | undefined;

    // Check Patreon link status using admin client to bypass RLS
    const patreonResult = await adminSupabase
      .from("patreon_links")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    const hasPatreon = !!patreonResult.data;

    if (!subscription && !hasPatreon) {
      return NextResponse.json(
        { error: "Active subscription or Patreon membership required" },
        { status: 403 }
      );
    }

    // Get sample with pack info
    const sampleResult = await supabase
      .from("samples")
      .select(
        `
        *,
        pack:packs(id, release_date, end_date, is_published)
      `
      )
      .eq("id", sampleId)
      .single();

    const sample = sampleResult.data as SampleWithPack | null;

    if (sampleResult.error || !sample) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Check if sample has stems
    if (!sample.stems_path) {
      return NextResponse.json({ error: "No stems available for this sample" }, { status: 404 });
    }

    // Check if pack is published
    if (!sample.pack?.is_published) {
      return NextResponse.json({ error: "Pack not available" }, { status: 404 });
    }

    // Check if pack is archived (expired based on end_date or default window)
    if (isPackExpiredWithEndDate(sample.pack.release_date, sample.pack.end_date)) {
      return NextResponse.json(
        { error: "Pack has been archived and is no longer available for download" },
        { status: 403 }
      );
    }

    // Serve a stripped copy (no __MACOSX junk) rather than the original —
    // see getOrCreateCleanStemsPath for why.
    const cleanPath = await getOrCreateCleanStemsPath(adminSupabase, sample.stems_path);

    // Generate signed URL for the stems file (valid for 60 seconds)
    const { data: signedUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUrl(cleanPath, 60, {
        download: `${sample.name}-stems.zip`,
      });

    if (urlError || !signedUrl) {
      console.error("Error generating signed URL:", urlError);
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (error) {
    console.error("Stems download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPackExpiredWithEndDate } from "@/lib/utils";
import type { Pack } from "@/types/database";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ packId: string }> }
) {
  try {
    const { packId } = await params;

    if (!UUID_REGEX.test(packId)) {
      return NextResponse.json({ error: "Invalid pack ID format" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check subscription
    const now = new Date().toISOString();
    const subscriptionResult = await adminSupabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .gte("current_period_end", now)
      .limit(1);

    const hasSubscription = (subscriptionResult.data?.length ?? 0) > 0;

    // Check Patreon
    const patreonResult = await adminSupabase
      .from("patreon_links")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    const hasPatreon = !!patreonResult.data;

    if (!hasSubscription && !hasPatreon) {
      return NextResponse.json(
        { error: "Active subscription or Patreon membership required" },
        { status: 403 }
      );
    }

    // Fetch pack
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const packResult = await (adminSupabase as any)
      .from("packs")
      .select("id, name, release_date, end_date, is_published, pack_zip_path, is_returned")
      .eq("id", packId)
      .single();

    const pack = packResult.data as (Pack & { pack_zip_path: string | null }) | null;

    if (packResult.error || !pack) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    }

    if (!pack.is_published) {
      return NextResponse.json({ error: "Pack not available" }, { status: 404 });
    }

    if (!pack.pack_zip_path) {
      return NextResponse.json({ error: "No ZIP available for this pack" }, { status: 404 });
    }

    // Check expiry — mirrors pack page logic exactly
    const isReturned = pack.is_returned ?? false;
    const endDate = pack.end_date ?? null;
    const isExpired = isReturned
      ? (endDate ? isPackExpiredWithEndDate(pack.release_date, endDate) : false)
      : isPackExpiredWithEndDate(pack.release_date, endDate);

    if (isExpired) {
      return NextResponse.json(
        { error: "Pack has been archived and is no longer available for download" },
        { status: 403 }
      );
    }

    // Generate signed URL valid for 300 seconds (larger file needs more time to initiate)
    const { data: signedUrl, error: urlError } = await adminSupabase.storage
      .from("samples")
      .createSignedUrl(pack.pack_zip_path, 300, {
        download: `${pack.name} - Full Pack.zip`,
      });

    if (urlError || !signedUrl) {
      console.error("Error generating pack zip signed URL:", urlError);
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (error) {
    console.error("Pack zip download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPackExpiredWithEndDate } from "@/lib/utils";

// Cookie-authenticated, so never cache this.
export const dynamic = "force-dynamic";

interface PackRow {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  release_date: string;
  end_date: string | null;
  is_published: boolean;
  is_bonus: boolean;
}

interface SampleRow {
  id: string;
  pack_id: string;
  name: string;
  bpm: number | null;
  key: string | null;
  duration: number | null;
  stems_path: string | null;
  order_index: number | null;
  waveform_peaks: unknown;
}

/**
 * Library manifest for the Soul Sample Club Bridge desktop app.
 *
 * The Bridge signs in through a real browser window against this same
 * origin, so it arrives here with normal Supabase session cookies and no
 * separate token scheme is needed. Everything returned is metadata only —
 * audio still goes through /api/download/[sampleId], which re-checks
 * access and issues its own short-lived signed URL.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Same access rules as the download route: an active/trialing/past_due
    // Stripe subscription, or a live Patreon link.
    const subscriptionResult = await adminSupabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .limit(1);

    const hasStripe = !!subscriptionResult.data?.length;

    const patreonResult = await adminSupabase
      .from("patreon_links")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const hasPatreon = !!patreonResult.data;
    const active = hasStripe || hasPatreon;

    const profileResult = await adminSupabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const account = {
      user: {
        id: user.id,
        email: user.email,
        name: (profileResult.data as { full_name: string | null } | null)?.full_name ?? null,
      },
      access: {
        active,
        source: hasStripe ? "stripe" : hasPatreon ? "patreon" : null,
      },
    };

    // No membership: still a valid, signed-in response — the app shows a
    // membership prompt rather than an error screen.
    if (!active) {
      return NextResponse.json({ ...account, packs: [], samples: [] });
    }

    const packsResult = await adminSupabase
      .from("packs")
      .select("id, name, description, cover_image_url, release_date, end_date, is_published, is_bonus")
      .eq("is_published", true)
      .order("release_date", { ascending: false });

    const packs = (packsResult.data ?? []) as PackRow[];

    if (!packs.length) {
      return NextResponse.json({ ...account, packs: [], samples: [] });
    }

    const samplesResult = await adminSupabase
      .from("samples")
      .select("id, pack_id, name, bpm, key, duration, stems_path, order_index, waveform_peaks")
      .in(
        "pack_id",
        packs.map((p) => p.id)
      )
      .order("order_index", { ascending: true });

    const samples = (samplesResult.data ?? []) as SampleRow[];

    // Archived packs stay in the manifest so the Bridge can show what's
    // already downloaded, but downloads for them are refused server-side.
    const packPayload = packs.map((p) => ({
      id: p.id,
      name: p.name,
      cover_image_url: p.cover_image_url,
      release_date: p.release_date,
      end_date: p.end_date,
      archived: isPackExpiredWithEndDate(p.release_date, p.end_date),
      bonus: p.is_bonus,
    }));

    const packById = new Map(packPayload.map((p) => [p.id, p]));

    const samplePayload = samples.map((s) => {
      const pack = packById.get(s.pack_id);
      return {
        id: s.id,
        pack_id: s.pack_id,
        pack_name: pack?.name ?? "",
        name: s.name,
        bpm: s.bpm,
        key: s.key,
        duration: s.duration,
        has_stems: !!s.stems_path,
        peaks: s.waveform_peaks ?? null,
        release_date: pack?.release_date ?? null,
        archived: pack?.archived ?? false,
        bonus: pack?.bonus ?? false,
      };
    });

    return NextResponse.json({
      ...account,
      packs: packPayload,
      samples: samplePayload,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Bridge library error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

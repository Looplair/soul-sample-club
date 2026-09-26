import { createAdminClient } from "@/lib/supabase/admin";
import { trackKlaviyoEvent } from "@/lib/klaviyo";
import { SITE_URL } from "@/lib/site";

// Free pack funnel (/free). The pack is chosen in Admin → Settings.
//
// Welcome offer for people who claimed the free pack: $1.99/month for 3
// months, then $6.99. Stripe coupon: $5 off, repeating for 3 months.
// Leave empty to hide the offer; set to the coupon ID to switch it on.
export const FREE_PACK_OFFER_COUPON: string = "FREEPACK199";

// The offer is shown once, straight after the download, for this long. It
// really does end: checkout stops applying the coupon (plus a few minutes'
// grace for anyone already on the Stripe page).
export const OFFER_MINUTES = 30;
const CHECKOUT_GRACE_MS = 5 * 60 * 1000;

export interface FreePackTrack {
  id: string;
  name: string;
  bpm: number | null;
  key: string | null;
  duration: number | null;
  peaks: number[];
  hasStems: boolean;
}

export interface FreePack {
  id: string;
  slug: string | null;
  name: string;
  cover_image_url: string | null;
  pack_zip_path: string;
  tracks: FreePackTrack[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = () => createAdminClient() as any;

export async function getFreePackId(): Promise<string | null> {
  const { data } = await db().from("homepage_settings").select("free_pack_id").eq("id", "singleton").maybeSingle();
  return data?.free_pack_id ?? null;
}

/** The current free pack, or null if none is chosen or it has no ZIP to give away */
export async function getFreePack(): Promise<FreePack | null> {
  const id = await getFreePackId();
  if (!id) return null;
  const { data: p } = await db()
    .from("packs")
    .select("id, slug, name, cover_image_url, pack_zip_path, samples(id, name, bpm, key, duration, order_index, waveform_peaks, stems_path)")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  if (!p?.pack_zip_path) return null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    cover_image_url: p.cover_image_url,
    pack_zip_path: p.pack_zip_path,
    tracks: [...(p.samples || [])]
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        bpm: s.bpm,
        key: s.key,
        duration: s.duration,
        peaks: Array.isArray(s.waveform_peaks) ? s.waveform_peaks : [],
        hasStems: !!s.stems_path,
      })),
  };
}

/** Active Stripe subscription or Patreon link: these people already have the whole catalog */
export async function userHasAccess(userId: string): Promise<boolean> {
  const [subs, patreon] = await Promise.all([
    db().from("subscriptions").select("id").eq("user_id", userId).in("status", ["active", "trialing"]).limit(1),
    db().from("patreon_links").select("id").eq("user_id", userId).eq("is_active", true).limit(1),
  ]);
  return (subs.data?.length ?? 0) > 0 || (patreon.data?.length ?? 0) > 0;
}

/** Records the claim; returns true only the first time (so the email fires once) */
export async function recordClaim(userId: string, packId: string): Promise<boolean> {
  const { error } = await db().from("free_pack_claims").insert({ user_id: userId, pack_id: packId });
  if (!error) return true;
  if (error.code !== "23505") console.error("recordClaim:", error.message); // 23505 = already claimed
  return false;
}

/** Records the claim and, the first time only, tells Klaviyo so the "Claimed Free Pack" email flow runs */
export async function claimFreePack(userId: string, email: string | undefined, pack: FreePack): Promise<boolean> {
  const first = await recordClaim(userId, pack.id);
  if (first && email) {
    await trackKlaviyoEvent(email, "Claimed Free Pack", { pack_name: pack.name, download_page: `${SITE_URL}/free` });
  }
  return first;
}

/** When this user's one-time welcome offer ends, or null if it hasn't started */
export async function getOfferDeadline(userId: string): Promise<Date | null> {
  const { data } = await db()
    .from("free_pack_claims")
    .select("offer_started_at")
    .eq("user_id", userId)
    .not("offer_started_at", "is", null)
    .order("offer_started_at", { ascending: true })
    .limit(1);
  const started = data?.[0]?.offer_started_at;
  return started ? new Date(new Date(started).getTime() + OFFER_MINUTES * 60_000) : null;
}

/** Starts the offer window the first time only, and returns when it ends */
export async function startOffer(userId: string, packId: string): Promise<Date | null> {
  const existing = await getOfferDeadline(userId);
  if (existing) return existing;
  await db()
    .from("free_pack_claims")
    .update({ offer_started_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("pack_id", packId)
    .is("offer_started_at", null);
  return getOfferDeadline(userId);
}

/** Checkout only applies the welcome coupon while the window is open */
export async function offerIsLive(userId: string): Promise<boolean> {
  const deadline = await getOfferDeadline(userId);
  return !!deadline && deadline.getTime() + CHECKOUT_GRACE_MS > Date.now();
}
/* eslint-enable @typescript-eslint/no-explicit-any */

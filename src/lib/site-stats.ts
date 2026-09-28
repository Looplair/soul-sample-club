import { createAdminClient } from "@/lib/supabase/admin";

// Admin reports built from site_events (see /api/track) and free_pack_claims.
// Each returns null when the tables aren't there yet, so the admin can say so.

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = () => createAdminClient() as any;

export interface Counts {
  total: number;
  last7: number;
  last30: number;
}

const WEEK_MS = 7 * 86400000;
const OFFER_GRACE_MS = 35 * 60_000; // 30-minute offer plus the checkout grace
const recent = (iso: string | null | undefined) => !!iso && Date.now() - Date.parse(iso) < WEEK_MS;

async function eventCounts(event: string, pathLike: string): Promise<Map<string, Counts>> {
  const { data, error } = await db().from("site_event_counts").select("path, total, last7, last30").eq("event", event).like("path", pathLike);
  if (error) throw error;
  return new Map(
    (data ?? []).map((r: any) => [r.path, { total: Number(r.total), last7: Number(r.last7), last30: Number(r.last30) }])
  );
}

/** Views per guide, keyed by slug */
export async function getGuideViews(): Promise<Map<string, Counts> | null> {
  try {
    const byPath = await eventCounts("view", "/guides/%");
    return new Map(Array.from(byPath, ([path, c]) => [path.replace("/guides/", ""), c]));
  } catch (error) {
    console.error("getGuideViews:", error);
    return null;
  }
}

export interface FunnelStep {
  label: string;
  total: number;
  last7: number;
  since?: string; // when counting started, for steps added after launch
}

export interface FreePackFunnel {
  steps: FunnelStep[];
  paidViaOffer: number;
  paidLater: number;
  stillMembers: number;
  alreadyMembers: number;
}

/** The /free funnel, from first visit to paying member */
export async function getFreePackFunnel(): Promise<FreePackFunnel | null> {
  try {
    const empty: Counts = { total: 0, last7: 0, last30: 0 };
    const [views, ctas, claimsRes] = await Promise.all([
      eventCounts("view", "/free"),
      eventCounts("free_cta", "/free"),
      db().from("free_pack_claims").select("user_id, created_at, downloaded_at, offer_started_at, offer_checkout_at"),
    ]);
    if (claimsRes.error) throw claimsRes.error;
    const claims: any[] = claimsRes.data ?? [];

    // One entry per person: their first claim and the earliest time of each later step
    const people = new Map<string, { claimed: string; downloaded?: string; offer?: string; checkout?: string }>();
    for (const c of claims) {
      const p = people.get(c.user_id);
      const min = (a?: string, b?: string | null) => (!b ? a : !a || b < a ? b : a);
      people.set(c.user_id, {
        claimed: min(p?.claimed, c.created_at)!,
        downloaded: min(p?.downloaded, c.downloaded_at),
        offer: min(p?.offer, c.offer_started_at),
        checkout: min(p?.checkout, c.offer_checkout_at),
      });
    }

    // Subscriptions for everyone who claimed
    const ids = Array.from(people.keys());
    const subs: any[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await db().from("subscriptions").select("user_id, created_at, status").in("user_id", ids.slice(i, i + 200));
      if (error) throw error;
      subs.push(...(data ?? []));
    }

    let paid = 0, paid7 = 0, paidViaOffer = 0, paidLater = 0, stillMembers = 0, alreadyMembers = 0;
    for (const [userId, p] of Array.from(people)) {
      const theirs = subs.filter((s) => s.user_id === userId).sort((a, b) => a.created_at.localeCompare(b.created_at));
      if (theirs.some((s) => s.created_at < p.claimed)) alreadyMembers++;
      const joined = theirs.find((s) => s.created_at >= p.claimed);
      if (!joined) continue;
      paid++;
      if (recent(joined.created_at)) paid7++;
      if (p.offer && Date.parse(joined.created_at) <= Date.parse(p.offer) + OFFER_GRACE_MS) paidViaOffer++;
      else paidLater++;
      if (theirs.some((s) => s.created_at >= p.claimed && ["active", "trialing", "past_due"].includes(s.status))) stillMembers++;
    }

    const all = Array.from(people.values());
    const step = (label: string, times: (string | undefined)[], since?: string): FunnelStep => ({
      label,
      total: times.filter(Boolean).length,
      last7: times.filter(recent).length,
      since,
    });
    const visits = views.get("/free") ?? empty;
    const taps = ctas.get("/free") ?? empty;

    return {
      steps: [
        { label: "Visited /free (logged out)", total: visits.total, last7: visits.last7, since: "28 Sep" },
        { label: 'Tapped "Get it free"', total: taps.total, last7: taps.last7, since: "28 Sep" },
        step("Created an account and claimed", all.map((p) => p.claimed)),
        step("Downloaded the pack", all.map((p) => p.downloaded), "28 Sep"),
        step("Saw the $1.99 offer", all.map((p) => p.offer)),
        step("Clicked the offer's checkout", all.map((p) => p.checkout), "28 Sep"),
        { label: "Became a paying member", total: paid, last7: paid7 },
      ],
      paidViaOffer,
      paidLater,
      stillMembers,
      alreadyMembers,
    };
  } catch (error) {
    console.error("getFreePackFunnel:", error);
    return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

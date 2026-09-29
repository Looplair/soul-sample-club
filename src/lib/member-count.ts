import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// The "X of 5,000" counter. Real numbers only: active or trialing Stripe
// members, plus the Patreon total the admin enters (falls back to Patreon
// members who linked an account on the site). Refreshed every 10 minutes.

export const MEMBER_CAP = 5000;

export interface MemberCount {
  total: number;
  stripe: number;
  patreon: number;
  patreonIsManual: boolean;
}

async function count(): Promise<MemberCount | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    const [subs, linked, settings] = await Promise.all([
      db.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trialing"]),
      db.from("patreon_links").select("id", { count: "exact", head: true }).eq("is_active", true),
      db.from("homepage_settings").select("patreon_member_count").eq("id", "singleton").maybeSingle(),
    ]);
    const stripe = subs.count ?? 0;
    const manual = settings.data?.patreon_member_count as number | null | undefined;
    const patreon = typeof manual === "number" && manual > 0 ? manual : linked.count ?? 0;
    return { total: stripe + patreon, stripe, patreon, patreonIsManual: typeof manual === "number" && manual > 0 };
  } catch (error) {
    console.error("getMemberCount:", error);
    return null;
  }
}

export const getMemberCount = unstable_cache(count, ["member-count-v1"], { revalidate: 600, tags: ["member-count"] });

/** Rounded down to a clean figure for display, e.g. 2,137 -> "2,130+" */
export function displayCount(total: number): string {
  const step = total >= 1000 ? 10 : 5;
  return `${(Math.floor(total / step) * step).toLocaleString("en-US")}+`;
}

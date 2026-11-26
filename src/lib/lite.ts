import { createAdminClient } from "@/lib/supabase/admin";

// Lite members are members everywhere (account, library, announcements...). The one
// difference: they can only download packs marked as Lite packs. Every check here
// fails open to full access, so a lookup error never locks a paying member out.

/** True when everything that gives this person access is a Lite plan (no full subscription, no Patreon). */
export async function isLiteOnly(userId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const [subs, patreon] = await Promise.all([
    admin.from("subscriptions").select("plan").eq("user_id", userId).in("status", ["active", "trialing"]),
    admin.from("patreon_links").select("id").eq("user_id", userId).eq("is_active", true).limit(1),
  ]);
  if (subs.error || patreon.error) return false;
  if (patreon.data?.length) return false;
  const rows = (subs.data ?? []) as { plan: string | null }[];
  return rows.length > 0 && rows.every((r) => r.plan === "lite");
}

/** Pack IDs marked as Lite packs. */
export async function litePackIds(): Promise<Set<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (createAdminClient() as any).from("packs").select("id").eq("is_lite", true);
  if (error) return new Set();
  return new Set(((data ?? []) as { id: string }[]).map((p) => p.id));
}

/** For download routes: true when this person is Lite-only and the pack isn't a Lite pack. */
export async function liteBlocksPack(userId: string, packId: string | null | undefined): Promise<boolean> {
  if (!packId || !(await isLiteOnly(userId))) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (createAdminClient() as any).from("packs").select("is_lite").eq("id", packId).maybeSingle();
  if (error) return false;
  return !data?.is_lite;
}

export const LITE_BLOCKED = {
  error: "This pack isn't part of Lite. Upgrade to the full membership to download it.",
  code: "lite",
} as const;

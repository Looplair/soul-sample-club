// src/app/vault/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VaultClient } from "./VaultClient";
import type { DrumBreakWithStatus } from "@/types/database";

export const metadata = {
  title: "Drum Vault | Soul Sample Club",
  description: "Members-only drum breaks, yours to keep forever.",
};

export default async function VaultPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // Auth gate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Subscription gate — do NOT add .gte("current_period_end") — matches canonical download route
  const [stripeResult, patreonResult] = await Promise.all([
    adminSupabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .limit(1),
    adminSupabase
      .from("patreon_links")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single(),
  ]);

  const hasAccess =
    (stripeResult.data?.length ?? 0) > 0 || !!patreonResult.data;
  if (!hasAccess) redirect("/subscribe");

  const now = new Date().toISOString();

  // Fetch breaks + collection status
  const [breaksResult, collectionsResult, profileResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminSupabase as any)
      .from("drum_breaks")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminSupabase as any)
      .from("break_collections")
      .select("break_id")
      .eq("user_id", user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminSupabase as any)
      .from("profiles")
      .select("vault_last_visited")
      .eq("id", user.id)
      .single(),
  ]);

  const lastVisited = (profileResult.data as { vault_last_visited: string | null } | null)
    ?.vault_last_visited ?? null;

  const collectedIds = new Set(
    (collectionsResult.data ?? []).map((c: { break_id: string }) => c.break_id)
  );

  const breaks: DrumBreakWithStatus[] = (breaksResult.data ?? []).map((b: {
    id: string; name: string; bpm: number | null; file_path: string | null;
    preview_path: string | null; waveform_peaks: number[] | null;
    is_published: boolean; is_exclusive: boolean; created_at: string; updated_at: string;
  }) => ({
    ...b,
    is_collected: collectedIds.has(b.id),
    is_new: lastVisited ? new Date(b.created_at) > new Date(lastVisited) : false,
  }));

  // Update vault_last_visited (fire and forget — don't block render)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (adminSupabase as any)
    .from("profiles")
    .update({ vault_last_visited: now })
    .eq("id", user.id)
    .then(() => {})
    .catch((err: Error) => console.warn("vault_last_visited update failed:", err));

  const stats = {
    collected: breaks.filter((b) => b.is_collected).length,
    total: breaks.length,
  };

  return <VaultClient breaks={breaks} stats={stats} />;
}

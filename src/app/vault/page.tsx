// src/app/vault/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VaultClient } from "./VaultClient";
import type { DrumBreakWithStatus, Profile } from "@/types/database";
import { hidePaths } from "@/lib/hide-paths";
import { Navbar } from "@/components/layout";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { getNotificationsForUser } from "@/lib/notifications";

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

  const now = new Date().toISOString();

  // Fetch breaks + collection status + hasUsedTrial, plus what the menu needs
  const [breaksResult, collectionsResult, anySubResult, profileResult, { notifications, unreadCount }] = await Promise.all([
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
    // Check if user has ever had any subscription (for hasUsedTrial)
    adminSupabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    getNotificationsForUser(user.id),
  ]);

  const hasUsedTrial = (anySubResult.data?.length ?? 0) > 0;

  const collectedIds = new Set(
    (collectionsResult.data ?? []).map((c: { break_id: string }) => c.break_id)
  );

  const breaks: DrumBreakWithStatus[] = hidePaths(breaksResult.data ?? []).map((b: {
    id: string; name: string; bpm: number | null; file_path: string | null;
    preview_path: string | null; waveform_peaks: number[] | null;
    is_published: boolean; is_exclusive: boolean; created_at: string; updated_at: string;
  }) => ({
    ...b,
    is_collected: collectedIds.has(b.id),
    is_new: new Date(b.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  }));

  // Update vault_last_visited (fire and forget, don't block render)
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

  return (
    <div className="ssc min-h-screen overflow-x-clip">
      <Navbar user={profileResult.data as Profile | null} notifications={notifications} unreadCount={unreadCount} />
      <VaultClient breaks={breaks} stats={stats} hasUsedTrial={hasUsedTrial} isLoggedIn={true} />
      <SiteFooter />
    </div>
  );
}

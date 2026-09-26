import { createAdminClient } from "@/lib/supabase/admin";
import type { GuidePack } from "@/components/guides/GuidePackEmbed";

type Row = GuidePack & { samples: (GuidePack["samples"][number] & { order_index: number })[] };

/** Published packs (these IDs, or all non-bonus releases) in the shape article embeds need */
export async function getGuidePacks(ids?: string[]): Promise<GuidePack[]> {
  if (ids && ids.length === 0) return [];
  let query = createAdminClient()
    .from("packs")
    .select("id, name, description, cover_image_url, samples(id, name, bpm, key, duration, order_index)")
    .eq("is_published", true)
    .order("release_date", { ascending: false });
  // Embeds render whatever a guide references; the editor's picker only offers
  // real SSC releases, never bonus packs
  query = ids ? query.in("id", ids) : query.eq("is_bonus", false);
  const { data } = await query;
  return ((data || []) as Row[]).map((p) => ({ ...p, samples: [...p.samples].sort((a, b) => a.order_index - b.order_index) }));
}

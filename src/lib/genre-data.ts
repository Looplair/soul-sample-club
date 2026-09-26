import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPackExpiredWithEndDate } from "@/lib/utils";

export interface GenrePack {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  release_date: string;
  styles: string[];
  archived: boolean;
  samples: { id: string; name: string; bpm: number | null; key: string | null; duration: number | null }[];
}

export interface GenreStats {
  releases: number;
  tracks: number;
  tempoRange: [number, number] | null;
  topKeys: string[];
}

type Row = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  release_date: string;
  end_date: string | null;
  is_returned: boolean | null;
  styles: string[] | null;
  samples: (GenrePack["samples"][number] & { order_index: number })[];
};

// Same rule the catalog uses: returned packs only expire on an explicit end date
function isArchived(p: Row): boolean {
  if (p.is_returned) return p.end_date ? new Date() > new Date(p.end_date) : false;
  return isPackExpiredWithEndDate(p.release_date, p.end_date);
}

/** Real (non-bonus) published releases tagged with this genre, newest first (cached per request) */
export const getGenrePacks = cache(async (tag: string): Promise<GenrePack[]> => {
  const { data, error } = await createAdminClient()
    .from("packs")
    .select("id, name, description, cover_image_url, release_date, end_date, is_returned, styles, samples(id, name, bpm, key, duration, order_index)")
    .eq("is_published", true)
    .eq("is_bonus", false)
    .contains("genres", [tag])
    .order("release_date", { ascending: false });
  if (error) {
    console.error("getGenrePacks:", error.message);
    return [];
  }
  return ((data || []) as unknown as Row[]).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    cover_image_url: p.cover_image_url,
    release_date: p.release_date,
    styles: p.styles || [],
    archived: isArchived(p),
    samples: [...p.samples].sort((a, b) => a.order_index - b.order_index),
  }));
});

/** For each genre tag: how many real packs feature it, and how many are still in the catalog */
export const getGenreAvailability = cache(async (): Promise<Record<string, { live: number; total: number }>> => {
  const { data } = await createAdminClient()
    .from("packs")
    .select("genres, release_date, end_date, is_returned")
    .eq("is_published", true)
    .eq("is_bonus", false);
  const out: Record<string, { live: number; total: number }> = {};
  for (const p of (data || []) as (Row & { genres: string[] | null })[]) {
    const live = !isArchived({ ...p, samples: [] } as Row);
    for (const g of p.genres || []) {
      out[g] ??= { live: 0, total: 0 };
      out[g].total += 1;
      if (live) out[g].live += 1;
    }
  }
  return out;
});

function percentileRange(values: number[]): [number, number] {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))];
  return [at(0.1), at(0.9)];
}

/** Real numbers from the packs, shown in the stats strip */
export function getGenreStats(packs: GenrePack[]): GenreStats {
  const samples = packs.flatMap((p) => p.samples);
  // Ignore obviously wrong BPMs (typos like 1176)
  const bpms = samples.map((s) => s.bpm).filter((b): b is number => !!b && b >= 40 && b <= 200);
  const keyCounts = new Map<string, number>();
  samples.forEach((s) => s.key && keyCounts.set(s.key, (keyCounts.get(s.key) || 0) + 1));
  return {
    releases: packs.length,
    tracks: samples.length,
    // Typical range (10th to 90th percentile), so one double-time track doesn't stretch it
    tempoRange: bpms.length ? percentileRange(bpms) : null,
    topKeys: Array.from(keyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      // "C Minor" -> "Cm", "F Major" -> "F": how producers write keys
      .map(([k]) => k.replace(/\s*minor$/i, "m").replace(/\s*major$/i, "")),
  };
}

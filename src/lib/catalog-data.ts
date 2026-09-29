import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { hidePaths } from "@/lib/hide-paths";
import { compactPeaks } from "@/lib/peaks";

// Every published pack with its samples, for the homepage and catalog.
// Cached for 60 seconds (so admin edits show within a minute) instead of
// querying on every visit. Waveforms are trimmed to the 120 points the site
// draws, and storage paths are hidden before anything leaves the server.

export const getCatalogPacks = unstable_cache(
  async () => {
    const { data, error } = await createAdminClient()
      .from("packs")
      .select("*, samples(*)")
      .eq("is_published", true)
      .order("release_date", { ascending: false });
    if (error) throw error; // errors aren't cached, the next visit retries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = ((data as any[]) ?? []).map((p) => ({
      ...p,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      samples: (p.samples ?? []).map((s: any) => ({ ...s, waveform_peaks: compactPeaks(s.waveform_peaks) })),
    }));
    return hidePaths(rows);
  },
  ["catalog-packs-v1"],
  { revalidate: 60, tags: ["packs"] }
);

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Heart, Download, Music, Package } from "lucide-react";
import type { Sample, Pack } from "@/types/database";
import { LibraryTabs } from "@/components/library/LibraryTabs";
import { hidePaths } from "@/lib/hide-paths";
import { withCoverColors } from "@/lib/cover-color";
import { PageHead, StatTile } from "@/components/member/MemberUI";

export const metadata = {
  title: "My Library | Soul Sample Club",
  description: "Your liked samples and download history",
};

// Type for sample with pack relation
interface SampleWithPack extends Sample {
  pack: Pack;
}

// Type for like with sample and pack
interface LikeWithSample {
  id: string;
  sample_id: string;
  created_at: string;
  sample: SampleWithPack;
}

// Type for download with sample and pack
interface DownloadWithSample {
  id: string;
  sample_id: string;
  downloaded_at: string;
  sample: SampleWithPack;
}

// Get user's liked samples
async function getLikedSamples(userId: string): Promise<SampleWithPack[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (supabase as any)
    .from("likes")
    .select(`
      id,
      sample_id,
      created_at,
      sample:samples(
        *,
        pack:packs(*)
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (result.error) {
    console.error("Error fetching likes:", result.error);
    return [];
  }

  // Extract samples from likes
  const likes = hidePaths(result.data as unknown as LikeWithSample[]);
  return likes
    .filter((like) => like.sample && like.sample.pack)
    .map((like) => like.sample);
}

// Get user's download history
async function getDownloadHistory(userId: string): Promise<SampleWithPack[]> {
  const supabase = await createClient();

  const result = await supabase
    .from("downloads")
    .select(`
      id,
      sample_id,
      downloaded_at,
      sample:samples(
        *,
        pack:packs(*)
      )
    `)
    .eq("user_id", userId)
    .order("downloaded_at", { ascending: false })
    .limit(200);

  if (result.error) {
    console.error("Error fetching downloads:", result.error);
    return [];
  }

  // Extract samples from downloads (dedupe by sample_id)
  const downloads = hidePaths(result.data as unknown as DownloadWithSample[]);
  const seen = new Set<string>();
  return downloads
    .filter((download) => {
      if (!download.sample || !download.sample.pack || seen.has(download.sample_id)) {
        return false;
      }
      seen.add(download.sample_id);
      return true;
    })
    .map((download) => download.sample);
}

// Get liked sample IDs for quick lookup
async function getLikedSampleIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (supabase as any)
    .from("likes")
    .select("sample_id")
    .eq("user_id", userId);

  if (result.error) {
    return new Set();
  }

  return new Set((result.data || []).map((like: { sample_id: string }) => like.sample_id));
}

// Check if user has access (Stripe subscription OR active Patreon)
// Uses admin client to bypass RLS
async function checkUserAccess(userId: string): Promise<boolean> {
  const adminSupabase = createAdminClient();

  // Check Stripe subscription
  // Use limit(1) instead of single() because user may have multiple subscription rows
  // Filter by current_period_end to catch stale rows where webhook didn't fire
  const now = new Date().toISOString();
  const stripeResult = await adminSupabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .gte("current_period_end", now)
    .limit(1);

  // Auto-cleanup: mark any expired active/trialing rows as canceled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminSupabase.from("subscriptions") as any)
    .update({ status: "canceled" })
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .lt("current_period_end", now);

  if ((stripeResult.data?.length ?? 0) > 0) {
    return true;
  }

  // Check Patreon
  const patreonResult = await adminSupabase
    .from("patreon_links")
    .select("is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  return !!patreonResult.data;
}

// Group samples by pack
function groupByPack(samples: SampleWithPack[]): Map<string, { pack: Pack; samples: SampleWithPack[] }> {
  const groups = new Map<string, { pack: Pack; samples: SampleWithPack[] }>();

  for (const sample of samples) {
    const packId = sample.pack.id;
    if (!groups.has(packId)) {
      groups.set(packId, { pack: sample.pack, samples: [] });
    }
    groups.get(packId)!.samples.push(sample);
  }

  return groups;
}

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [likedSamples, downloadHistory, likedIds, canDownload] = await Promise.all([
    getLikedSamples(user.id),
    getDownloadHistory(user.id),
    getLikedSampleIds(user.id),
    checkUserAccess(user.id),
  ]);

  // Group by pack
  const likedByPack = groupByPack(likedSamples);
  const downloadsByPack = groupByPack(downloadHistory);

  // Convert to arrays for serialization
  const likedGroupsArray = Array.from(likedByPack.values());
  const downloadsGroupsArray = Array.from(downloadsByPack.values());

  // Cover-lit pack boxes: one glow per pack that appears in either tab
  const packsInLibrary = new Map<string, Pack>();
  for (const g of [...likedGroupsArray, ...downloadsGroupsArray]) packsInLibrary.set(g.pack.id, g.pack);
  const lit = await withCoverColors(Array.from(packsInLibrary.values()).map((p) => ({ id: p.id, cover_image_url: p.cover_image_url })));
  const packGlows = Object.fromEntries(lit.map((p) => [p.id, p.glow]));

  const packCount = new Set([...Array.from(likedByPack.keys()), ...Array.from(downloadsByPack.keys())]).size;
  const uniqueCount = new Set([...likedSamples.map((s) => s.id), ...downloadHistory.map((s) => s.id)]).size;

  return (
    <div>
      <PageHead pill="Your library" title="Library" body="Everything you've liked and downloaded, grouped by pack." />

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Liked" value={likedSamples.length} icon={<Heart className="h-3.5 w-3.5" />} />
        <StatTile label="Downloaded" value={downloadHistory.length} icon={<Download className="h-3.5 w-3.5" />} />
        <StatTile label="Packs" value={packCount} icon={<Package className="h-3.5 w-3.5" />} />
        <StatTile label="Unique" value={uniqueCount} icon={<Music className="h-3.5 w-3.5" />} />
      </div>

      {/* Tabs with search and grouped content */}
      <div className="mt-10">
        <LibraryTabs
          likedGroups={likedGroupsArray}
          downloadGroups={downloadsGroupsArray}
          likedSampleIds={Array.from(likedIds)}
          canDownload={canDownload}
          totalLiked={likedSamples.length}
          totalDownloaded={downloadHistory.length}
          packGlows={packGlows}
        />
      </div>
    </div>
  );
}

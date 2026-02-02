export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Heart, Download, Clock, Music, Package } from "lucide-react";
import type { Sample, Pack } from "@/types/database";
import { LibraryTabs } from "@/components/library/LibraryTabs";

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
  const likes = result.data as unknown as LikeWithSample[];
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
  const downloads = result.data as unknown as DownloadWithSample[];
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
    .in("status", ["active", "trialing", "past_due"])
    .gte("current_period_end", now)
    .limit(1);

  // Auto-cleanup: mark any expired active/trialing rows as canceled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminSupabase.from("subscriptions") as any)
    .update({ status: "canceled" })
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
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

  return (
    <div className="section">
      <div className="container-app">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-h1 text-white mb-2">My Library</h1>
          <p className="text-body-lg text-text-muted">
            Your saved samples and download history
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-grey-800/50 border border-grey-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-error mb-1">
              <Heart className="w-4 h-4" />
              <span className="text-caption text-snow/60">Liked</span>
            </div>
            <p className="text-h3 text-snow">{likedSamples.length}</p>
          </div>
          <div className="bg-grey-800/50 border border-grey-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-success mb-1">
              <Download className="w-4 h-4" />
              <span className="text-caption text-snow/60">Downloaded</span>
            </div>
            <p className="text-h3 text-snow">{downloadHistory.length}</p>
          </div>
          <div className="bg-grey-800/50 border border-grey-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Package className="w-4 h-4" />
              <span className="text-caption text-snow/60">Packs</span>
            </div>
            <p className="text-h3 text-snow">{new Set([...Array.from(likedByPack.keys()), ...Array.from(downloadsByPack.keys())]).size}</p>
          </div>
          <div className="bg-grey-800/50 border border-grey-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-warning mb-1">
              <Music className="w-4 h-4" />
              <span className="text-caption text-snow/60">Unique</span>
            </div>
            <p className="text-h3 text-snow">{new Set([...likedSamples.map(s => s.id), ...downloadHistory.map(s => s.id)]).size}</p>
          </div>
        </div>

        {/* Tabs with search and grouped content */}
        <LibraryTabs
          likedGroups={likedGroupsArray}
          downloadGroups={downloadsGroupsArray}
          likedSampleIds={Array.from(likedIds)}
          canDownload={canDownload}
          totalLiked={likedSamples.length}
          totalDownloaded={downloadHistory.length}
        />
      </div>
    </div>
  );
}

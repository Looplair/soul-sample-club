import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CollapsibleSampleList } from "@/components/audio/CollapsibleSampleList";
import { Heart, Download, Clock } from "lucide-react";
import type { Sample, Pack } from "@/types/database";

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
    .limit(50);

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
  const stripeResult = await adminSupabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .limit(1);

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

function SampleListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-grey-800/50 rounded-card p-4 animate-pulse">
          <div className="flex gap-4 items-center mb-3">
            <div className="w-8 h-4 bg-grey-700 rounded" />
            <div className="w-5 h-5 bg-grey-700 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-grey-700 rounded w-48" />
              <div className="h-3 bg-grey-700 rounded w-32" />
            </div>
            <div className="w-24 h-8 bg-grey-700 rounded-full" />
          </div>
          <div className="h-12 bg-grey-800 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-12 bg-grey-800/30 rounded-card">
      <div className="w-12 h-12 rounded-full bg-grey-700 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-text-subtle" />
      </div>
      <h3 className="text-body font-medium text-white mb-1">{title}</h3>
      <p className="text-body-sm text-text-muted">{description}</p>
    </div>
  );
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Liked Samples */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-error" />
              <h2 className="text-h3 text-white">Liked Samples</h2>
              <span className="text-caption text-text-muted ml-auto">
                {likedSamples.length} {likedSamples.length === 1 ? "sample" : "samples"}
              </span>
            </div>

            <Suspense fallback={<SampleListSkeleton />}>
              {likedSamples.length > 0 ? (
                <CollapsibleSampleList
                  samples={likedSamples}
                  canDownload={canDownload}
                  likedSampleIds={likedIds}
                  showPackName
                  initialCount={5}
                />
              ) : (
                <EmptyState
                  icon={Heart}
                  title="No liked samples yet"
                  description="Heart samples you love to save them here"
                />
              )}
            </Suspense>
          </section>

          {/* Download History */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-success" />
              <h2 className="text-h3 text-white">Recent Downloads</h2>
              <span className="text-caption text-text-muted ml-auto">
                {downloadHistory.length} {downloadHistory.length === 1 ? "sample" : "samples"}
              </span>
            </div>

            <Suspense fallback={<SampleListSkeleton />}>
              {downloadHistory.length > 0 ? (
                <CollapsibleSampleList
                  samples={downloadHistory}
                  canDownload={canDownload}
                  likedSampleIds={likedIds}
                  showPackName
                  initialCount={5}
                />
              ) : (
                <EmptyState
                  icon={Clock}
                  title="No downloads yet"
                  description="Samples you download will appear here"
                />
              )}
            </Suspense>
          </section>
        </div>
      </div>
    </div>
  );
}

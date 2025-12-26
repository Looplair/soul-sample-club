import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PackGrid } from "@/components/packs/PackGrid";
import { SubscriptionBanner } from "@/components/packs/SubscriptionBanner";
import { ActivityFeed } from "@/components/feed";
import { PackCardSkeleton } from "@/components/ui";
import { TrendingUp, Sparkles, Clock } from "lucide-react";
import type { Subscription, Sample, Pack } from "@/types/database";

export const metadata = {
  title: "Dashboard | Soul Sample Club",
};

// Type for pack with sample count (for PackGrid)
interface PackWithSampleCount extends Pack {
  samples: { count: number }[];
}

// Type for pack with full samples (for ActivityFeed)
interface PackWithSamples extends Pack {
  samples: Sample[];
}

// Get packs from last 3 months with sample count (for PackGrid)
async function getActivePacks(): Promise<PackWithSampleCount[]> {
  const supabase = await createClient();

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const result = await supabase
    .from("packs")
    .select(
      `
      *,
      samples:samples(count)
    `
    )
    .eq("is_published", true)
    .gte("release_date", threeMonthsAgo.toISOString().split("T")[0])
    .order("release_date", { ascending: false });

  if (result.error) {
    console.error("Error fetching packs:", result.error);
    return [];
  }

  return (result.data as PackWithSampleCount[]) || [];
}

// Get ALL published packs with full samples (for ActivityFeed)
async function getAllPacksWithSamples(): Promise<PackWithSamples[]> {
  const supabase = await createClient();

  const result = await supabase
    .from("packs")
    .select(
      `
      *,
      samples(*)
    `
    )
    .eq("is_published", true)
    .order("release_date", { ascending: false });

  if (result.error) {
    console.error("Error fetching packs:", result.error);
    return [];
  }

  return (result.data as PackWithSamples[]) || [];
}

async function getUserSubscription(): Promise<Subscription | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const result = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single();

  return result.data as Subscription | null;
}

function PackGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <PackCardSkeleton key={i} />
      ))}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-grey-800/50 rounded-card p-4 animate-pulse">
          <div className="flex gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-grey-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-grey-700 rounded w-24" />
              <div className="h-5 bg-grey-700 rounded w-48" />
              <div className="h-3 bg-grey-700 rounded w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const [activePacks, allPacksWithSamples, subscription] = await Promise.all([
    getActivePacks(),
    getAllPacksWithSamples(),
    getUserSubscription(),
  ]);

  const hasActiveSubscription = !!subscription;

  return (
    <div className="section">
      <div className="container-app">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-h1 text-white mb-2">Releases</h1>
          <p className="text-body-lg text-text-muted">
            Browse and download from the catalog
          </p>
        </div>

        {/* Subscription Banner */}
        {!hasActiveSubscription && <SubscriptionBanner />}

        {/* Mobile-first layout: Stack on mobile, side-by-side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Pack Grid */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            {/* Active Releases Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-success" />
                <h2 className="text-h3 text-white">Available Releases</h2>
                <span className="text-caption text-text-muted ml-auto">
                  Last 3 months
                </span>
              </div>

              <Suspense fallback={<PackGridSkeleton />}>
                <PackGrid packs={activePacks} hasSubscription={hasActiveSubscription} />
              </Suspense>

              {activePacks.length === 0 && (
                <div className="text-center py-12 bg-grey-800/30 rounded-card">
                  <div className="w-12 h-12 rounded-full bg-grey-700 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-text-subtle" />
                  </div>
                  <h3 className="text-body font-medium text-white mb-1">No active releases</h3>
                  <p className="text-body-sm text-text-muted">
                    Check back soon for new releases!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Activity Feed */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="lg:sticky lg:top-24">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-white" />
                <h2 className="text-h3 text-white">Activity</h2>
              </div>

              <Suspense fallback={<FeedSkeleton />}>
                <ActivityFeed
                  packs={allPacksWithSamples}
                  hasSubscription={hasActiveSubscription}
                  limit={8}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

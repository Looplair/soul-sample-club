import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PackGrid } from "@/components/packs/PackGrid";
import { SubscriptionBanner } from "@/components/packs/SubscriptionBanner";
import { PackCardSkeleton } from "@/components/ui";
import type { Subscription } from "@/types/database";

export const metadata = {
  title: "Dashboard | Soul Sample Club",
};

// Type for pack with sample count
interface PackWithCount {
  id: string;
  name: string;
  description: string;
  cover_image_url: string | null;
  release_date: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  samples: { count: number }[];
}

async function getAccessiblePacks(): Promise<PackWithCount[]> {
  const supabase = await createClient();

  // Get packs from the last 3 months
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

  return (result.data as PackWithCount[]) || [];
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

export default async function DashboardPage() {
  const [packs, subscription] = await Promise.all([
    getAccessiblePacks(),
    getUserSubscription(),
  ]);

  const hasActiveSubscription = !!subscription;

  return (
    <div className="section">
      <div className="container-app">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-h1 text-white mb-2">Sample Packs</h1>
          <p className="text-body-lg text-text-muted">
            Browse and download premium sample packs from the last 3 months
          </p>
        </div>

        {/* Subscription Banner */}
        {!hasActiveSubscription && <SubscriptionBanner />}

        {/* Pack Grid */}
        <Suspense fallback={<PackGridSkeleton />}>
          <PackGrid packs={packs} hasSubscription={hasActiveSubscription} />
        </Suspense>

        {/* Empty State */}
        {packs.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-grey-800 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-text-subtle"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
            <h3 className="text-h3 text-white mb-2">No packs available yet</h3>
            <p className="text-body text-text-muted">
              Check back soon for new sample packs!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

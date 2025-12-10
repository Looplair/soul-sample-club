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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-24">
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
        <div className="mb-48">
          <h1 className="text-h1 text-snow mb-8">Sample Packs</h1>
          <p className="text-body-lg text-snow/60">
            Browse and download premium sample packs from the last 3 months
          </p>
        </div>

        {!hasActiveSubscription && <SubscriptionBanner />}

        <Suspense fallback={<PackGridSkeleton />}>
          <PackGrid packs={packs} hasSubscription={hasActiveSubscription} />
        </Suspense>

        {packs.length === 0 && (
          <div className="text-center py-64">
            <p className="text-body-lg text-snow/60">
              No packs available yet. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

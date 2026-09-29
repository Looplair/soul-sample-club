import { createClient } from "@/lib/supabase/server";
import type { Subscription, Sample, Pack } from "@/types/database";
import { hidePaths } from "@/lib/hide-paths";
import { withCoverColors } from "@/lib/cover-color";
import { GlassBox } from "@/components/ssc/Glass";
import { PackCard } from "@/components/ssc/PackCard";
import { SubscribeCTA } from "@/components/ui/SubscribeCTA";
import { PageHead } from "@/components/member/MemberUI";
import { ActivityList } from "@/components/member/ActivityList";

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

  return hidePaths((result.data as PackWithSamples[]) || []);
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

export default async function DashboardPage() {
  const [activePacks, allPacksWithSamples, subscription] = await Promise.all([
    getActivePacks(),
    getAllPacksWithSamples(),
    getUserSubscription(),
  ]);

  const hasActiveSubscription = !!subscription;
  const lit = await withCoverColors(activePacks);

  return (
    <div>
      <PageHead pill="Members" title="Releases" body="Browse and download from the last three months of the catalog." />

      {/* Subscribe prompt */}
      {!hasActiveSubscription && (
        <GlassBox plain className="mt-8 flex flex-col gap-5 rounded-[24px] p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="ssc-display text-[clamp(1.3rem,2.4vw,1.8rem)]">Unlock every pack</p>
            <p className="ssc-body mt-2 max-w-lg text-[15px] leading-relaxed">
              Subscribe to download anything released in the last three months. Cancel anytime.
            </p>
          </div>
          <SubscribeCTA isLoggedIn hasSubscription={false} plan="monthly" bare className="ssc-btn ssc-btn--primary flex-shrink-0">
            Subscribe to download
          </SubscribeCTA>
        </GlassBox>
      )}

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-8">
        {/* Available releases */}
        <section className="order-2 lg:order-1 lg:col-span-2">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2 className="ssc-display text-[clamp(1.4rem,2.6vw,2rem)]">Available now</h2>
            <span className="text-[13px] text-white/55">Last 3 months</span>
          </div>

          {lit.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {lit.map((p) => (
                <PackCard
                  key={p.id}
                  className="!w-full"
                  pack={{
                    id: p.id,
                    slug: p.slug,
                    name: p.name,
                    cover_image_url: p.cover_image_url,
                    release_date: p.release_date,
                    end_date: p.end_date,
                    is_returned: p.is_returned,
                    glow: p.glow,
                    sampleCount: p.samples[0]?.count || 0,
                  }}
                />
              ))}
            </div>
          ) : (
            <GlassBox plain className="rounded-[24px] px-6 py-14 text-center">
              <p className="ssc-display text-[1.3rem]">No active releases</p>
              <p className="ssc-body mt-2 text-[15px]">A new pack lands every week. Check back soon.</p>
            </GlassBox>
          )}
        </section>

        {/* Activity */}
        <aside className="order-1 lg:order-2 lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <h2 className="ssc-display mb-5 text-[clamp(1.4rem,2.6vw,2rem)]">Activity</h2>
            <ActivityList packs={allPacksWithSamples} hasSubscription={hasActiveSubscription} limit={8} />
          </div>
        </aside>
      </div>
    </div>
  );
}

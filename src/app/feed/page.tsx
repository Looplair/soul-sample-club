export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navbar } from "@/components/layout";
import { MetaPixelCheckoutSuccess } from "@/components/analytics/MetaPixelEvents";
import { getNotificationsForUser } from "@/lib/notifications";
import { hasPublishedGuides } from "@/lib/guides";
import { SubscribeCTA } from "@/components/ui/SubscribeCTA";
import { Pill } from "@/components/ssc/Glass";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { CatalogBrowser, type CatalogPack } from "@/components/ssc/catalog/CatalogBrowser";
import { withCoverColors } from "@/lib/cover-color";
import { compactPeaks } from "@/lib/peaks";
import type { Sample, NotificationWithReadStatus, Profile } from "@/types/database";
import { packPath } from "@/lib/pack-url";
import { hidePaths } from "@/lib/hide-paths";

export const metadata = {
  title: "Catalog | Soul Sample Club",
  description:
    "Browse every Soul Sample Club release: exclusive, pre-cleared soul, jazz and gospel sample packs with full stems. Preview everything free.",
  alternates: { canonical: "/feed" },
};

interface PackWithSamples {
  id: string;
  slug?: string | null;
  genres?: string[] | null;
  name: string;
  description: string;
  cover_image_url: string | null;
  hero_image_url: string | null;
  release_date: string;
  end_date: string | null;
  is_published: boolean;
  is_staff_pick?: boolean;
  is_bonus: boolean;
  is_returned?: boolean;
  scheduled_publish_at: string | null;
  created_at: string;
  updated_at: string;
  samples: Sample[];
}

// Get ALL published packs for the feed
async function getAllPacks(): Promise<PackWithSamples[]> {
  const adminSupabase = createAdminClient();

  const result = await adminSupabase
    .from("packs")
    .select(`*, samples(*)`)
    .eq("is_published", true)
    .order("release_date", { ascending: false });

  if (result.error) {
    console.error("Error fetching packs:", result.error);
    return [];
  }

  return hidePaths((result.data as PackWithSamples[]) || []);
}

// Check if user is logged in and has subscription
// Uses admin client for subscription/patreon checks to bypass RLS
async function getUserState(): Promise<{ isLoggedIn: boolean; hasSubscription: boolean; hasPatreon: boolean; userId: string | null; hasUsedTrial: boolean }> {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isLoggedIn: false, hasSubscription: false, hasPatreon: false, userId: null, hasUsedTrial: false };
    }

    // Check for active subscription with valid period end date
    const now = new Date().toISOString();
    const subResult = await adminSupabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .gte("current_period_end", now)
      .limit(1);

    let hasPatreon = false;
    try {
      const patreonResult = await adminSupabase
        .from("patreon_links")
        .select("is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);
      hasPatreon = (patreonResult.data?.length ?? 0) > 0;
    } catch {
      // Table might not exist yet
    }

    // Check if user has ever had any subscription (for trial messaging)
    const anySubResult = await adminSupabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    return {
      isLoggedIn: true,
      hasSubscription: (subResult.data?.length ?? 0) > 0,
      hasPatreon,
      userId: user.id,
      hasUsedTrial: (anySubResult.data?.length ?? 0) > 0,
    };
  } catch {
    return { isLoggedIn: false, hasSubscription: false, hasPatreon: false, userId: null, hasUsedTrial: false };
  }
}

// Helper to check if pack is archived
// Returned packs are only archived if they have an explicit end_date that has passed
function isArchived(pack: PackWithSamples): boolean {
  if (pack.is_returned) {
    return pack.end_date ? new Date() > new Date(pack.end_date) : false;
  }
  if (pack.end_date && new Date() > new Date(pack.end_date)) {
    return true;
  }
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return new Date(pack.release_date) < threeMonthsAgo;
}

export default async function FeedPage() {
  const [allPacks, userState, hasGuides] = await Promise.all([getAllPacks(), getUserState(), hasPublishedGuides()]);
  const { isLoggedIn, hasSubscription, hasPatreon, userId, hasUsedTrial } = userState;
  const hasAccess = hasSubscription || hasPatreon;

  const [{ notifications, unreadCount }, profile] = await Promise.all([
    userId
      ? getNotificationsForUser(userId)
      : Promise.resolve({ notifications: [] as NotificationWithReadStatus[], unreadCount: 0 }),
    userId
      ? (await createClient()).from("profiles").select("*").eq("id", userId).single().then((r) => r.data as Profile | null)
      : Promise.resolve(null),
  ]);

  const lit = await withCoverColors(allPacks);
  const packs: CatalogPack[] = lit.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    cover_image_url: p.cover_image_url,
    release_date: p.release_date,
    end_date: p.end_date,
    is_returned: p.is_returned,
    glow: p.glow,
    archived: isArchived(p),
    isBonus: p.is_bonus,
    genres: p.genres ?? [],
    sampleCount: p.samples.length,
    samples: [...p.samples]
      .sort((a, b) => a.order_index - b.order_index)
      .map((s) => ({ id: s.id, name: s.name, bpm: s.bpm, key: s.key, duration: s.duration, peaks: compactPeaks(s.waveform_peaks), hasStems: !!s.stems_path })),
  }));
  const available = packs.filter((p) => !p.archived);
  const sampleTotal = available.reduce((n, p) => n + p.samples.length, 0);
  const latest = available.find((p) => p.cover_image_url);

  return (
    <div className="ssc min-h-screen overflow-x-clip">
      {/* Meta Pixel conversion tracking */}
      <Suspense fallback={null}>
        <MetaPixelCheckoutSuccess />
      </Suspense>

      <Navbar
        user={profile}
        notifications={notifications}
        unreadCount={unreadCount}
        latest={latest ? { name: latest.name, href: packPath(latest), cover_image_url: latest.cover_image_url } : undefined}
      />

      <main className="px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        <div className="mx-auto max-w-[1240px]">
          <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <Pill>Catalog</Pill>
              <h1 className="ssc-display mt-4 text-[clamp(2.4rem,5.4vw,4.4rem)]">The catalog</h1>
              <p className="ssc-body mt-3 text-[clamp(1rem,1.3vw,1.125rem)]">
                {available.length} packs and {sampleTotal} compositions available right now. Preview any of them free.
              </p>
            </div>
            {!hasAccess && (
              <div className="flex flex-col items-start gap-2 md:items-end">
                <SubscribeCTA isLoggedIn={isLoggedIn} hasSubscription={false} plan="monthly" bare className="ssc-btn ssc-btn--primary">
                  {isLoggedIn && hasUsedTrial ? "Subscribe to download" : "Start for $0.99"}
                </SubscribeCTA>
                <span className="text-[13px] text-white/55">
                  Or{" "}
                  <SubscribeCTA isLoggedIn={isLoggedIn} hasSubscription={false} plan="yearly" bare className="font-medium text-white underline underline-offset-4">
                    $35 a year
                  </SubscribeCTA>
                  , offer price
                </span>
              </div>
            )}
          </header>

          {isLoggedIn && (
            <Link
              href="/vault"
              className="ssc-glass ssc-glass--plain group relative mt-8 flex items-center justify-between gap-4 rounded-2xl px-5 py-4 transition-colors hover:border-white/20"
            >
              <div>
                <p className="ssc-label">Members only</p>
                <p className="ssc-display mt-1 text-[1.3rem]">Drum Vault</p>
              </div>
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/75 transition-colors group-hover:text-white">
                Hand-picked drum breaks, yours to keep →
              </span>
            </Link>
          )}

          <div className="mt-8">
            <CatalogBrowser packs={packs} hasAccess={hasAccess} isLoggedIn={isLoggedIn} />
          </div>
        </div>
      </main>

      <SiteFooter showGuides={hasGuides} />
    </div>
  );
}

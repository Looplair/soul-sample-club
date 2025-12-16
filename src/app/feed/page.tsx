import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActivityFeed } from "@/components/feed";
import { PackCard } from "@/components/packs/PackCard";
import { Button } from "@/components/ui";
import { TrendingUp, Sparkles, LogIn, Music, MessageCircle } from "lucide-react";
import type { Sample, Subscription } from "@/types/database";

export const metadata = {
  title: "Catalog | Soul Sample Club",
  description: "Discover the latest releases, trending sounds, and staff picks",
};

// Type for pack with samples
interface PackWithSamples {
  id: string;
  name: string;
  description: string;
  cover_image_url: string | null;
  release_date: string;
  is_published: boolean;
  is_staff_pick?: boolean;
  created_at: string;
  updated_at: string;
  samples: Sample[];
}

// Get ALL published packs for the feed - uses admin client for public access
async function getAllPacks(): Promise<PackWithSamples[]> {
  const adminSupabase = createAdminClient();

  const result = await adminSupabase
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

// Get new packs (last 7 days) - uses admin client for public access
async function getNewPacks(): Promise<PackWithSamples[]> {
  const adminSupabase = createAdminClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await adminSupabase
    .from("packs")
    .select(
      `
      *,
      samples:samples(count)
    `
    )
    .eq("is_published", true)
    .gte("release_date", sevenDaysAgo.toISOString().split("T")[0])
    .order("release_date", { ascending: false })
    .limit(4);

  if (result.error) {
    console.error("Error fetching new packs:", result.error);
    return [];
  }

  return (result.data as PackWithSamples[]) || [];
}

// Check if user is logged in and has subscription
async function getUserState(): Promise<{ isLoggedIn: boolean; hasSubscription: boolean; hasPatreon: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isLoggedIn: false, hasSubscription: false, hasPatreon: false };
    }

    // Check subscription
    const subResult = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single();

    // Check Patreon (if table exists)
    let hasPatreon = false;
    try {
      const patreonResult = await supabase
        .from("patreon_links")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      hasPatreon = !!patreonResult.data;
    } catch {
      // Table might not exist yet
    }

    return {
      isLoggedIn: true,
      hasSubscription: !!(subResult.data as Subscription | null),
      hasPatreon,
    };
  } catch {
    return { isLoggedIn: false, hasSubscription: false, hasPatreon: false };
  }
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
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

function PackGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square rounded-2xl bg-grey-700" />
        </div>
      ))}
    </div>
  );
}

export default async function FeedPage() {
  const [allPacks, newPacks, userState] = await Promise.all([
    getAllPacks(),
    getNewPacks(),
    getUserState(),
  ]);

  const { isLoggedIn, hasSubscription, hasPatreon } = userState;
  const hasAccess = hasSubscription || hasPatreon;

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <header className="border-b border-grey-700 bg-charcoal/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-app h-16 flex items-center justify-between">
          <Link href="/feed" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-button group-hover:shadow-glow-white-soft transition-shadow duration-300">
              <span className="text-charcoal font-bold text-base">S</span>
            </div>
            <span className="text-h4 text-white hidden sm:block">Soul Sample Club</span>
          </Link>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/chat">
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Chat
                  </Button>
                </Link>
                <Link href="/library">
                  <Button variant="ghost" size="sm">
                    Library
                  </Button>
                </Link>
                <Link href="/account">
                  <Button variant="secondary" size="sm">
                    Account
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    <LogIn className="w-4 h-4 mr-1" />
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">
                    Sign up free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="section">
        <div className="container-app">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-display text-white mb-4">
              Explore the Catalog
            </h1>
            <p className="text-body-lg text-text-muted max-w-2xl mx-auto">
              Browse all releases. Preview any track.
              {!isLoggedIn && " Sign up free to save favorites."}
              {isLoggedIn && !hasAccess && " Subscribe or link Patreon to download."}
            </p>
          </div>

          {/* New Releases Section */}
          {newPacks.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-success" />
                <h2 className="text-h2 text-white">New Releases</h2>
              </div>
              <Suspense fallback={<PackGridSkeleton />}>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {newPacks.map((pack) => {
                    const sampleCount = Array.isArray(pack.samples)
                      ? pack.samples.length
                      : (pack.samples as { count: number }[])?.[0]?.count || 0;
                    return (
                      <PackCard
                        key={pack.id}
                        pack={pack}
                        sampleCount={sampleCount}
                        hasSubscription={hasAccess}
                      />
                    );
                  })}
                </div>
              </Suspense>
            </section>
          )}

          {/* All Releases Section */}
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-white" />
              <h2 className="text-h2 text-white">All Releases</h2>
            </div>
            <Suspense fallback={<PackGridSkeleton />}>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {allPacks.map((pack) => {
                  const sampleCount = Array.isArray(pack.samples)
                    ? pack.samples.length
                    : 0;
                  return (
                    <PackCard
                      key={pack.id}
                      pack={pack}
                      sampleCount={sampleCount}
                      hasSubscription={hasAccess}
                    />
                  );
                })}
              </div>
            </Suspense>
          </section>

          {/* Activity Feed Section */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-white" />
              <h2 className="text-h2 text-white">Activity Feed</h2>
            </div>

            <Suspense fallback={<FeedSkeleton />}>
              <ActivityFeed
                packs={allPacks}
                hasSubscription={hasAccess}
                limit={20}
              />
            </Suspense>
          </section>

          {/* CTA Section for non-logged-in users */}
          {!isLoggedIn && (
            <section className="mt-16 text-center">
              <div className="bg-gradient-to-r from-white/5 to-transparent border border-white/10 rounded-2xl p-8 sm:p-12">
                <Music className="w-12 h-12 text-white mx-auto mb-4" />
                <h2 className="text-h2 text-white mb-3">
                  Ready to start creating?
                </h2>
                <p className="text-body-lg text-text-muted mb-6 max-w-lg mx-auto">
                  Sign up for free and preview every track in the catalog.
                  Subscribe or link your Patreon to download.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/signup">
                    <Button size="lg">
                      Create free account
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="secondary" size="lg">
                      Log in
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-grey-700 py-8 mt-16">
        <div className="container-app text-center">
          <p className="text-body-sm text-text-subtle">
            Soul Sample Club - Premium sounds for music producers
          </p>
        </div>
      </footer>
    </div>
  );
}

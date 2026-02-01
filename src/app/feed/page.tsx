export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PackCard } from "@/components/packs/PackCard";
import { Button } from "@/components/ui";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getNotificationsForUser } from "@/lib/notifications";
import { Music, LogIn, Archive, User, Sparkles, Star } from "lucide-react";
import type { Sample, Subscription, NotificationWithReadStatus } from "@/types/database";

export const metadata = {
  title: "Catalog | Soul Sample Club",
  description: "Discover the latest releases, trending sounds, and staff picks",
};

interface PackWithSamples {
  id: string;
  name: string;
  description: string;
  cover_image_url: string | null;
  release_date: string;
  end_date: string | null;
  is_published: boolean;
  is_staff_pick?: boolean;
  is_bonus: boolean;
  is_returned?: boolean;
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

  return (result.data as PackWithSamples[]) || [];
}

// Check if user is logged in and has subscription
// Uses admin client for subscription/patreon checks to bypass RLS
async function getUserState(): Promise<{ isLoggedIn: boolean; hasSubscription: boolean; hasPatreon: boolean; userId: string | null }> {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isLoggedIn: false, hasSubscription: false, hasPatreon: false, userId: null };
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

    return {
      isLoggedIn: true,
      hasSubscription: (subResult.data?.length ?? 0) > 0,
      hasPatreon,
      userId: user.id,
    };
  } catch {
    return { isLoggedIn: false, hasSubscription: false, hasPatreon: false, userId: null };
  }
}

function PackGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square rounded-2xl bg-grey-700" />
          <div className="mt-3 space-y-2">
            <div className="h-4 bg-grey-700 rounded w-3/4" />
            <div className="h-3 bg-grey-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper to check if pack is archived (older than 3 months, and not returned)
function isArchived(pack: PackWithSamples): boolean {
  if (pack.is_returned) return false;
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return new Date(pack.release_date) < threeMonthsAgo;
}

export default async function FeedPage() {
  const [allPacks, userState] = await Promise.all([
    getAllPacks(),
    getUserState(),
  ]);

  const { isLoggedIn, hasSubscription, hasPatreon, userId } = userState;
  const hasAccess = hasSubscription || hasPatreon;

  // Fetch notifications for logged-in users
  const { notifications, unreadCount } = userId
    ? await getNotificationsForUser(userId)
    : { notifications: [] as NotificationWithReadStatus[], unreadCount: 0 };

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <header className="border-b border-grey-700 bg-charcoal/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-app h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Image
              src="/logo.svg"
              alt="Soul Sample Club"
              width={160}
              height={36}
              className="h-7 sm:h-9 w-auto"
              priority
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn && userId ? (
              <>
                <NotificationBell
                  userId={userId}
                  initialNotifications={notifications}
                  initialUnreadCount={unreadCount}
                />
                <Link href="/library" className="hidden sm:block">
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
                    <LogIn className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Log in</span>
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">
                    <span className="hidden sm:inline">Start free trial</span>
                    <span className="sm:hidden">Free trial</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - extra padding on mobile for bottom nav + now playing bar */}
      <main className={`section ${isLoggedIn ? 'pb-32 sm:pb-0' : ''}`}>
        <div className="container-app">
          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-h1 sm:text-display text-white mb-3 sm:mb-4">
              Explore the Catalog
            </h1>
            <p className="text-body sm:text-body-lg text-text-muted max-w-2xl mx-auto">
              Browse all releases. Preview any track.
              {!isLoggedIn && " Sign up free to save favorites."}
              {isLoggedIn && !hasAccess && " Subscribe or link Patreon to download."}
            </p>

            {/* Free Trial Banner - for non-subscribed users */}
            {isLoggedIn && !hasAccess && (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm text-white">Subscribe to download — includes a 7-day free trial</span>
                <Link href="/account?tab=billing" className="text-sm text-white underline hover:no-underline ml-1">
                  Subscribe →
                </Link>
              </div>
            )}
          </div>

          {/* Staff Picks Section - Show if there are any */}
          {(() => {
            const staffPicks = allPacks.filter(p => p.is_staff_pick && !isArchived(p));
            if (staffPicks.length === 0) return null;
            return (
              <section className="mb-12 sm:mb-16">
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-h3 sm:text-h2 text-white">Staff Picks</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {staffPicks.slice(0, 4).map((pack) => (
                    <PackCard
                      key={pack.id}
                      pack={pack}
                      sampleCount={Array.isArray(pack.samples) ? pack.samples.length : 0}
                      hasSubscription={hasAccess}
                    />
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Recently Added Section */}
          {(() => {
            const recentPacks = allPacks.filter(p => !isArchived(p)).slice(0, 4);
            const olderPacks = allPacks.filter(p => !isArchived(p)).slice(4);
            const archivedPacks = allPacks.filter(p => isArchived(p));

            return (
              <>
                {recentPacks.length > 0 && (
                  <section className="mb-12 sm:mb-16">
                    <div className="flex items-center gap-2 mb-4 sm:mb-6">
                      <Sparkles className="w-5 h-5 text-white" />
                      <h2 className="text-h3 sm:text-h2 text-white">Recently Added</h2>
                      <span className="text-caption text-text-muted ml-2">
                        New this month
                      </span>
                    </div>
                    <Suspense fallback={<PackGridSkeleton />}>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {recentPacks.map((pack) => (
                          <PackCard
                            key={pack.id}
                            pack={pack}
                            sampleCount={Array.isArray(pack.samples) ? pack.samples.length : 0}
                            hasSubscription={hasAccess}
                          />
                        ))}
                      </div>
                    </Suspense>
                  </section>
                )}

                {olderPacks.length > 0 && (
                  <section className="mb-12 sm:mb-16">
                    <div className="flex items-center gap-2 mb-4 sm:mb-6">
                      <Music className="w-5 h-5 text-white" />
                      <h2 className="text-h3 sm:text-h2 text-white">Available Now</h2>
                      <span className="text-caption text-text-muted ml-2">
                        {olderPacks.length} packs
                      </span>
                    </div>
                    <Suspense fallback={<PackGridSkeleton />}>
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {olderPacks.map((pack) => (
                          <PackCard
                            key={pack.id}
                            pack={pack}
                            sampleCount={Array.isArray(pack.samples) ? pack.samples.length : 0}
                            hasSubscription={hasAccess}
                          />
                        ))}
                      </div>
                    </Suspense>
                  </section>
                )}

                {archivedPacks.length > 0 && (
                  <section className="mb-12 sm:mb-16">
                    <div className="flex items-center gap-2 mb-4 sm:mb-6">
                      <Archive className="w-5 h-5 text-text-muted" />
                      <h2 className="text-h3 sm:text-h2 text-text-muted">Archive</h2>
                      <span className="text-caption text-text-subtle ml-2">
                        Past releases (preview only)
                      </span>
                    </div>
                    <Suspense fallback={<PackGridSkeleton />}>
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {archivedPacks.map((pack) => (
                          <div key={pack.id} className="opacity-60 hover:opacity-100 transition-opacity duration-200">
                            <PackCard
                              pack={pack}
                              sampleCount={Array.isArray(pack.samples) ? pack.samples.length : 0}
                              hasSubscription={hasAccess}
                            />
                          </div>
                        ))}
                      </div>
                    </Suspense>
                  </section>
                )}
              </>
            );
          })()}

          {/* CTA Section for non-logged-in users */}
          {!isLoggedIn && (
            <section className="text-center">
              <div className="bg-gradient-to-r from-white/5 to-transparent border border-white/10 rounded-2xl p-6 sm:p-8 lg:p-12">
                <Music className="w-10 h-10 sm:w-12 sm:h-12 text-white mx-auto mb-3 sm:mb-4" />
                <h2 className="text-h3 sm:text-h2 text-white mb-2 sm:mb-3">
                  Ready to start creating?
                </h2>
                <p className="text-body sm:text-body-lg text-text-muted mb-4 sm:mb-6 max-w-lg mx-auto">
                  Sign up for free and preview every track in the catalog.
                  Subscribe or link your Patreon to download.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/signup">
                    <Button size="lg" className="w-full sm:w-auto">
                      Create free account
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                      Log in
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Mobile-only bottom nav for logged in users */}
          {isLoggedIn && (
            <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-charcoal-elevated/95 backdrop-blur-xl border-t border-grey-700 z-40 safe-area-bottom">
              <div className="flex items-center justify-around h-14">
                <Link href="/" className="flex flex-col items-center gap-1 py-2 px-4 text-white">
                  <Music className="w-5 h-5" />
                  <span className="text-[10px]">Catalog</span>
                </Link>
                <Link href="/library" className="flex flex-col items-center gap-1 py-2 px-4 text-text-muted">
                  <Archive className="w-5 h-5" />
                  <span className="text-[10px]">Library</span>
                </Link>
                <Link href="/account" className="flex flex-col items-center gap-1 py-2 px-4 text-text-muted">
                  <User className="w-5 h-5" />
                  <span className="text-[10px]">Account</span>
                </Link>
              </div>
            </nav>
          )}
        </div>
      </main>

      {/* Footer - hidden on mobile when bottom nav is showing */}
      <footer className={`border-t border-grey-700 py-6 sm:py-8 ${isLoggedIn ? 'hidden sm:block' : ''}`}>
        <div className="container-app text-center">
          <p className="text-caption sm:text-body-sm text-text-subtle">
            Soul Sample Club - Premium sounds for music producers
          </p>
        </div>
      </footer>
    </div>
  );
}

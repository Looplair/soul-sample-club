import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PackCard } from "@/components/packs/PackCard";
import { Button } from "@/components/ui";
import { Music, LogIn, MessageCircle, Archive } from "lucide-react";
import type { Sample, Subscription } from "@/types/database";

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
  is_published: boolean;
  is_staff_pick?: boolean;
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
async function getUserState(): Promise<{ isLoggedIn: boolean; hasSubscription: boolean; hasPatreon: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isLoggedIn: false, hasSubscription: false, hasPatreon: false };
    }

    const subResult = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single();

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

// Helper to check if pack is archived (older than 3 months)
function isArchived(releaseDate: string): boolean {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return new Date(releaseDate) < threeMonthsAgo;
}

export default async function FeedPage() {
  const [allPacks, userState] = await Promise.all([
    getAllPacks(),
    getUserState(),
  ]);

  const { isLoggedIn, hasSubscription, hasPatreon } = userState;
  const hasAccess = hasSubscription || hasPatreon;

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <header className="border-b border-grey-700 bg-charcoal/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-app h-14 sm:h-16 flex items-center justify-between">
          <Link href="/feed" className="flex items-center gap-2 sm:gap-3 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white flex items-center justify-center shadow-button group-hover:shadow-glow-white-soft transition-shadow duration-300">
              <span className="text-charcoal font-bold text-sm sm:text-base">S</span>
            </div>
            <span className="font-wordmark text-lg sm:text-xl tracking-wider text-white uppercase hidden sm:block">
              Soul Sample Club
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/chat" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Chat
                  </Button>
                </Link>
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
                    <span className="hidden sm:inline">Sign up free</span>
                    <span className="sm:hidden">Sign up</span>
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
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-h1 sm:text-display text-white mb-3 sm:mb-4">
              Explore the Catalog
            </h1>
            <p className="text-body sm:text-body-lg text-text-muted max-w-2xl mx-auto">
              Browse all releases. Preview any track.
              {!isLoggedIn && " Sign up free to save favorites."}
              {isLoggedIn && !hasAccess && " Subscribe or link Patreon to download."}
            </p>
          </div>

          {/* Releases Section */}
          <section className="mb-12 sm:mb-16">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <Music className="w-5 h-5 text-white" />
              <h2 className="text-h3 sm:text-h2 text-white">Releases</h2>
              <span className="text-caption text-text-muted ml-2">
                {allPacks.length} packs
              </span>
            </div>

            <Suspense fallback={<PackGridSkeleton />}>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {allPacks.map((pack) => {
                  const sampleCount = Array.isArray(pack.samples)
                    ? pack.samples.length
                    : 0;
                  const archived = isArchived(pack.release_date);
                  return (
                    <div
                      key={pack.id}
                      className={archived ? "opacity-50 hover:opacity-100 transition-opacity duration-200" : ""}
                    >
                      <PackCard
                        pack={pack}
                        sampleCount={sampleCount}
                        hasSubscription={hasAccess}
                      />
                    </div>
                  );
                })}
              </div>
            </Suspense>
          </section>

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
            <nav className="sm:hidden fixed bottom-20 left-0 right-0 bg-charcoal-elevated/95 backdrop-blur-xl border-t border-grey-700 z-30">
              <div className="flex items-center justify-around h-14">
                <Link href="/feed" className="flex flex-col items-center gap-1 text-white">
                  <Music className="w-5 h-5" />
                  <span className="text-[10px]">Catalog</span>
                </Link>
                <Link href="/library" className="flex flex-col items-center gap-1 text-text-muted">
                  <Archive className="w-5 h-5" />
                  <span className="text-[10px]">Library</span>
                </Link>
                <Link href="/chat" className="flex flex-col items-center gap-1 text-text-muted">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-[10px]">Chat</span>
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

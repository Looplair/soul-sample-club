export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bebas_Neue } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PackCard } from "@/components/packs/PackCard";
import { Button } from "@/components/ui";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MetaPixelCheckoutSuccess } from "@/components/analytics/MetaPixelEvents";
import { getNotificationsForUser } from "@/lib/notifications";
import { Music, LogIn, Archive, User, Sparkles, RotateCcw, Trophy, Play } from "lucide-react";
import { ScarcityBanner } from "@/components/layout/ScarcityBanner";
import { ArchivedPacksSection } from "@/components/catalog/ArchivedPacksSection";
import { VaultButton } from "@/components/vault/VaultButton";
import { SubscribeCTA } from "@/components/ui/SubscribeCTA";
import type { Sample, Subscription, NotificationWithReadStatus } from "@/types/database";

const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "Catalog | Soul Sample Club",
  description: "Discover the latest releases, trending sounds, and staff picks",
};

interface PackWithSamples {
  id: string;
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

  return (result.data as PackWithSamples[]) || [];
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
      .in("status", ["active", "trialing", "past_due"])
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
  const [allPacks, userState] = await Promise.all([
    getAllPacks(),
    getUserState(),
  ]);

  const { isLoggedIn, hasSubscription, hasPatreon, userId, hasUsedTrial } = userState;
  const hasAccess = hasSubscription || hasPatreon;

  // Fetch notifications for logged-in users
  const { notifications, unreadCount } = userId
    ? await getNotificationsForUser(userId)
    : { notifications: [] as NotificationWithReadStatus[], unreadCount: 0 };

  return (
    <div className="min-h-screen bg-charcoal overflow-x-hidden">
      {/* Meta Pixel conversion tracking */}
      <Suspense fallback={null}>
        <MetaPixelCheckoutSuccess />
      </Suspense>

      {/* Header */}
      <header className="border-b border-grey-700 bg-charcoal/90 backdrop-blur-xl sticky top-0 z-40">
        {!hasAccess && <ScarcityBanner />}
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
                <VaultButton />
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
                    <span className="hidden sm:inline">Start for $0.99</span>
                    <span className="sm:hidden">Sign up</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`${isLoggedIn ? 'section pb-32 sm:pb-0' : 'pt-6 sm:pt-10 pb-16'}`}>
        <div className="container-app">

          {/* ============================================================
              LOGGED-OUT VIEW — Premium editorial layout
              ============================================================ */}
          {!isLoggedIn && (() => {
            const activePacks = allPacks.filter(p => !isArchived(p) && !p.is_returned);
            const returnedPacks = allPacks.filter(p => p.is_returned && !isArchived(p));
            const archivedPacks = allPacks.filter(p => isArchived(p));
            const heroPack = activePacks[0];
            const gridPacks = [...activePacks.slice(1), ...returnedPacks];

            return (
              <div className="space-y-5 sm:space-y-7">

                {/* HERO — Latest drop */}
                {heroPack && (
                  <Link
                    href={`/packs/${heroPack.id}`}
                    className="group block relative rounded-2xl overflow-hidden"
                    style={{ aspectRatio: "21/9", minHeight: "220px" }}
                  >
                    {heroPack.cover_image_url && (
                      <Image
                        src={heroPack.cover_image_url}
                        alt={heroPack.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        sizes="100vw"
                        priority
                      />
                    )}
                    {/* Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

                    {/* Badge */}
                    <div className="absolute top-4 sm:top-6 left-4 sm:left-6">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-charcoal text-[10px] font-bold tracking-[0.12em] uppercase">
                        <Sparkles className="w-2.5 h-2.5" />
                        Latest Drop
                      </span>
                    </div>

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 lg:p-10">
                      <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-1.5 sm:mb-3 leading-tight tracking-tight">
                        {heroPack.name}
                      </h2>
                      {heroPack.description && (
                        <p className="text-white/60 text-sm sm:text-base mb-4 max-w-lg line-clamp-2 hidden sm:block">
                          {heroPack.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-charcoal text-sm font-semibold group-hover:bg-white/90 transition-colors">
                          <Play className="w-3 h-3" fill="currentColor" />
                          Preview
                        </span>
                        <span className="text-white/40 text-xs sm:text-sm">
                          {Array.isArray(heroPack.samples) ? heroPack.samples.length : 0} tracks
                        </span>
                      </div>
                    </div>
                  </Link>
                )}

                {/* ACTIVE PACKS GRID */}
                {gridPacks.length > 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 [&>*:last-child:nth-child(odd)]:max-sm:col-span-2 [&>*:last-child:nth-child(odd)]:max-sm:max-w-[calc(50%-6px)] [&>*:last-child:nth-child(odd)]:max-sm:mx-auto">
                    {gridPacks.map(pack => (
                      <PackCard
                        key={pack.id}
                        pack={pack}
                        sampleCount={Array.isArray(pack.samples) ? pack.samples.length : 0}
                        hasSubscription={false}
                      />
                    ))}
                  </div>
                )}

                {/* ARCHIVE BLUR WALL */}
                {archivedPacks.length > 0 && (
                  <ArchivedPacksSection archivedPacks={archivedPacks} />
                )}

              </div>
            );
          })()}

          {/* ============================================================
              LOGGED-IN VIEW — Existing experience (unchanged)
              ============================================================ */}
          {isLoggedIn && (
            <>
              {/* Page header */}
              <div className="text-center mb-8 sm:mb-12">
                <h1 className="text-h1 sm:text-display text-white mb-3 sm:mb-4">
                  Explore the Catalog
                </h1>
                <p className="text-body sm:text-body-lg text-text-muted max-w-2xl mx-auto">
                  Browse all releases. Preview any track.
                  {!hasAccess && " Subscribe or link Patreon to download."}
                </p>
                {!hasAccess && (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <SubscribeCTA
                      isLoggedIn={isLoggedIn}
                      hasSubscription={hasAccess}
                      plan="monthly"
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      {hasUsedTrial ? "Subscribe to download" : "First month $0.99"}
                    </SubscribeCTA>
                    <SubscribeCTA
                      isLoggedIn={isLoggedIn}
                      hasSubscription={hasAccess}
                      plan="yearly"
                      variant="ghost"
                      size="sm"
                      className="rounded-full border border-white/20 hover:border-white/40"
                    >
                      $49/year — lock in your rate
                    </SubscribeCTA>
                  </div>
                )}
              </div>

              {/* Drum Vault teaser */}
              <Link
                href="/vault"
                className="block mb-10 group relative overflow-hidden rounded-2xl border border-[#1A1A1A] hover:border-[#2A2A2A] transition-all"
                style={{ background: "linear-gradient(135deg, #0A0A0A 0%, #111 50%, #0A0A0A 100%)" }}
              >
                <div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 100%)" }}
                />
                <div className="relative z-10 flex flex-col items-center justify-center text-center py-10 px-6">
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#333] mb-3">Members Only</div>
                  <div
                    className={`${bebasNeue.className} leading-none mb-3`}
                    style={{
                      fontSize: "clamp(64px, 12vw, 112px)",
                      letterSpacing: "0.04em",
                      background: "linear-gradient(180deg, #fff 0%, #555 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Drum Vault
                  </div>
                  <p className="text-[12px] text-[#333] tracking-[0.08em] uppercase mb-5">
                    Hand-picked drum breaks — collect yours forever
                  </p>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#444] group-hover:text-white transition-colors duration-300">
                    Enter The Vault
                    <span className="text-[14px] group-hover:translate-x-1 transition-transform duration-200 inline-block">→</span>
                  </div>
                </div>
              </Link>

              {/* Pack sections */}
              {(() => {
                const availablePacks = allPacks.filter(p => !isArchived(p) && !p.is_returned);
                const returnedPacks = allPacks.filter(p => p.is_returned && !isArchived(p));
                const archivedPacks = allPacks.filter(p => isArchived(p));
                return (
                  <>
                    {availablePacks.length > 0 && (
                      <section className="mb-12 sm:mb-16">
                        <div className="flex items-center gap-2 mb-4 sm:mb-6">
                          <Music className="w-5 h-5 text-white" />
                          <h2 className="text-h3 sm:text-h2 text-white">Available Packs</h2>
                          <span className="text-caption text-text-muted ml-2">{availablePacks.length} packs</span>
                        </div>
                        <Suspense fallback={<PackGridSkeleton />}>
                          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                            {availablePacks.map(pack => (
                              <PackCard key={pack.id} pack={pack} sampleCount={Array.isArray(pack.samples) ? pack.samples.length : 0} hasSubscription={hasAccess} />
                            ))}
                          </div>
                        </Suspense>
                      </section>
                    )}
                    {returnedPacks.length > 0 && (
                      <section className="mb-12 sm:mb-16">
                        <div className="flex items-center gap-2 mb-4 sm:mb-6">
                          <RotateCcw className="w-5 h-5 text-emerald-400" />
                          <h2 className="text-h3 sm:text-h2 text-white">Back by Popular Demand</h2>
                        </div>
                        <Suspense fallback={<PackGridSkeleton />}>
                          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                            {returnedPacks.map(pack => (
                              <PackCard key={pack.id} pack={pack} sampleCount={Array.isArray(pack.samples) ? pack.samples.length : 0} hasSubscription={hasAccess} />
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
                          <span className="text-caption text-text-subtle ml-2">Past releases (preview only)</span>
                        </div>
                        <Suspense fallback={<PackGridSkeleton />}>
                          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                            {archivedPacks.map(pack => (
                              <div key={pack.id} className="opacity-60 hover:opacity-100 transition-opacity duration-200">
                                <PackCard pack={pack} sampleCount={Array.isArray(pack.samples) ? pack.samples.length : 0} hasSubscription={hasAccess} />
                              </div>
                            ))}
                          </div>
                        </Suspense>
                      </section>
                    )}
                  </>
                );
              })()}

              {/* Mobile bottom nav */}
              <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-charcoal-elevated/95 backdrop-blur-xl border-t border-grey-700 z-40 safe-area-bottom">
                <div className="flex items-center justify-around h-14">
                  <Link href="/" className="flex flex-col items-center gap-1 py-2 px-4 text-white">
                    <Music className="w-5 h-5" /><span className="text-[10px]">Catalog</span>
                  </Link>
                  <Link href="/library" className="flex flex-col items-center gap-1 py-2 px-4 text-text-muted">
                    <Archive className="w-5 h-5" /><span className="text-[10px]">Library</span>
                  </Link>
                  <Link href="/vault" className="flex flex-col items-center gap-1 py-2 px-4 text-text-muted">
                    <Trophy className="w-5 h-5" /><span className="text-[10px]">Vault</span>
                  </Link>
                  <Link href="/account" className="flex flex-col items-center gap-1 py-2 px-4 text-text-muted">
                    <User className="w-5 h-5" /><span className="text-[10px]">Account</span>
                  </Link>
                </div>
              </nav>
            </>
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

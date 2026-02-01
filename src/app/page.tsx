import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CatalogSearch } from "@/components/catalog/CatalogSearch";
import { CreatorHeroStrip } from "@/components/sections/CreatorHeroStrip";
import { CompleteControlSection } from "@/components/sections/CompleteControlSection";
import { CommunityProof } from "@/components/sections/CommunityProof";
import { FAQSection } from "@/components/sections/FAQSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { Button } from "@/components/ui";
import { SubscribeCTA } from "@/components/ui/SubscribeCTA";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getNotificationsForUser } from "@/lib/notifications";
import {
  Music,
  Sparkles,
  Download,
  Headphones,
  Check,
  ArrowRight,
  Play,
  Zap,
  Shield,
  Clock,
  Star,
  ChevronRight,
  Archive,
  User,
  Shuffle,
} from "lucide-react";
import type { Sample, Profile, NotificationWithReadStatus } from "@/types/database";

// ============================================
// TYPES
// ============================================
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
  created_at: string;
  updated_at: string;
  samples: Sample[];
}

// ============================================
// DATA FETCHING
// ============================================
async function getAllPacks(): Promise<PackWithSamples[]> {
  const adminSupabase = createAdminClient();
  const result = await adminSupabase
    .from("packs")
    .select(`*, samples(*)`)
    .eq("is_published", true)
    .order("release_date", { ascending: false });

  return (result.data as PackWithSamples[]) || [];
}

async function getUserState(): Promise<{
  isLoggedIn: boolean;
  hasSubscription: boolean;
  profile: Profile | null;
  userId: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isLoggedIn: false, hasSubscription: false, profile: null, userId: null };
    }

    // Get profile
    const profileResult = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Check subscription
    const subResult = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single();

    // Check Patreon
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
      // Table might not exist
    }

    return {
      isLoggedIn: true,
      hasSubscription: !!subResult.data || hasPatreon,
      profile: profileResult.data as Profile | null,
      userId: user.id,
    };
  } catch {
    return { isLoggedIn: false, hasSubscription: false, profile: null, userId: null };
  }
}

// Helper to check if pack is archived (older than 3 months)
function isArchived(releaseDate: string): boolean {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return new Date(releaseDate) < threeMonthsAgo;
}

// ============================================
// CONSTANTS
// ============================================
const features = [
  {
    icon: Music,
    title: "Exclusive Compositions",
    description: "Original soul, gospel, and funk compositions curated for real releases.",
  },
  {
    icon: Download,
    title: "Full Stems Included",
    description: "Download full compositions with individual stems.",
  },
  {
    icon: Headphones,
    title: "Preview Everything",
    description: "Listen to every composition before you subscribe.",
  },
];

const benefits = [
  "Exclusive soul compositions added regularly",
  "Access new releases as they drop",
  "Download full compositions with stems",
  "No clearance needed. Ever.",
  "Cancel anytime",
];

const stats = [
  { value: "1000+", label: "members" },
  { value: "7-day", label: "free trial" },
  { value: "0", label: "restrictions" },
];

// ============================================
// PAGE COMPONENT
// ============================================
export default async function HomePage() {
  const [allPacks, userState] = await Promise.all([getAllPacks(), getUserState()]);

  const { isLoggedIn, hasSubscription, profile, userId } = userState;

  // Fetch notifications for logged-in users
  const { notifications, unreadCount } = userId
    ? await getNotificationsForUser(userId)
    : { notifications: [] as NotificationWithReadStatus[], unreadCount: 0 };

  // Organize packs
  const staffPicks = allPacks.filter((p) => p.is_staff_pick && !isArchived(p.release_date));
  const recentPacks = allPacks.filter((p) => !isArchived(p.release_date));
  const archivedPacks = allPacks.filter((p) => isArchived(p.release_date));

  // Featured pack for hero (most recent with cover image)
  const featuredPack = recentPacks.find((p) => p.cover_image_url) || recentPacks[0];

  return (
    <div className="min-h-screen bg-charcoal">
      {/* ============================================
          HEADER
          ============================================ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-charcoal/80 backdrop-blur-xl border-b border-grey-700/50">
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

          <nav className="hidden md:flex items-center gap-8">
            <a href="#catalog" className="nav-link">
              Catalog
            </a>
            <a href="#how-it-works" className="nav-link">
              How It Works
            </a>
            <a href="#pricing" className="nav-link">
              Pricing
            </a>
            <a href="#faq" className="nav-link">
              FAQ
            </a>
            <Link href="/app" className="nav-link">
              App
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <>
                {userId && (
                  <NotificationBell
                    userId={userId}
                    initialNotifications={notifications}
                    initialUnreadCount={unreadCount}
                  />
                )}
                <Link href="/library" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    Library
                  </Button>
                </Link>
                <Link href="/account">
                  <Button variant="secondary" size="sm">
                    {profile?.username || profile?.full_name || "Account"}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">
                    <span className="hidden sm:inline">Start free trial</span>
                    <span className="sm:hidden">Try free</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-14 sm:pt-16">
        {/* ============================================
            HERO SECTION - Tracklib inspired
            ============================================ */}
        <section className="relative min-h-[80vh] sm:min-h-[90vh] flex items-center overflow-hidden">
          {/* Background with featured pack artwork */}
          <div className="absolute inset-0">
            {featuredPack?.cover_image_url && (
              <Image
                src={featuredPack.cover_image_url}
                alt=""
                fill
                className="object-cover opacity-20 blur-2xl scale-110"
                priority
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-charcoal via-charcoal/95 to-charcoal" />
            <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-transparent to-charcoal/50" />
          </div>

          <div className="container-app relative z-10 py-12 sm:py-20">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
              {/* Left: Text content */}
              <div className="text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-6 sm:mb-8">
                  <Sparkles className="w-4 h-4 text-white" />
                  <span className="text-sm text-white font-medium">7-day free trial</span>
                  <span className="text-sm text-white/60">• Cancel anytime</span>
                </div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
                  Pre-cleared and original soul compositions.{" "}
                  <span className="text-gradient">Built for producers.</span>
                </h1>

                {/* Subheadline */}
                <p className="text-lg sm:text-xl text-text-muted max-w-xl mx-auto lg:mx-0 mb-8">
                  Exclusive, curated soul packs delivered regularly.
                  <br />
                  Preview everything free. Subscribe for full access.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
                  {isLoggedIn ? (
                    <>
                      <a href="#catalog">
                        <Button size="lg" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-4 h-4" />}>
                          Browse catalog
                        </Button>
                      </a>
                      {!hasSubscription && (
                        <Link href="/account?tab=billing">
                          <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                            Subscribe now
                          </Button>
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <Link href="/signup">
                        <Button size="lg" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-4 h-4" />}>
                          Start free trial
                        </Button>
                      </Link>
                      <a href="#catalog">
                        <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                          <Play className="w-4 h-4 mr-2" />
                          Preview catalog
                        </Button>
                      </a>
                    </>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center lg:justify-start gap-8 pt-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                      <div className="text-sm text-text-muted">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Explore Button - with shine/gleam effect */}
                <div className="pt-6 pb-8 sm:pb-0 flex justify-center lg:justify-start">
                  <Link
                    href="/explore"
                    className="group relative flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all overflow-hidden"
                  >
                    {/* Shine/gleam effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />
                    <Shuffle className="w-4 h-4 text-white/70 group-hover:text-white transition-colors relative z-10" />
                    <span className="text-sm text-white/70 group-hover:text-white transition-colors relative z-10">
                      Explore random samples
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors relative z-10" />
                  </Link>
                </div>
              </div>

              {/* Right: Featured pack showcase */}
              <div className="relative hidden lg:block">
                {featuredPack && (
                  <Link href={`/packs/${featuredPack.id}`} className="block group">
                    <div className="relative">
                      {/* Main featured pack */}
                      <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl transform group-hover:scale-[1.02] transition-transform duration-500">
                        {featuredPack.cover_image_url ? (
                          <Image
                            src={featuredPack.cover_image_url}
                            alt={featuredPack.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            priority
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-grey-700 to-grey-800 flex items-center justify-center">
                            <Music className="w-24 h-24 text-grey-600" />
                          </div>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                        {/* Play button */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-8 h-8 text-charcoal ml-1" fill="currentColor" />
                          </div>
                        </div>

                        {/* Info */}
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 rounded-full bg-white text-charcoal text-xs font-bold uppercase">
                              Featured
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-white">{featuredPack.name}</h3>
                          <p className="text-white/70 mt-1">{featuredPack.samples?.length || 0} tracks</p>
                        </div>
                      </div>

                      {/* Decorative smaller packs */}
                      {recentPacks[1] && (
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-xl overflow-hidden shadow-xl transform -rotate-6 opacity-80">
                          {recentPacks[1].cover_image_url && (
                            <Image
                              src={recentPacks[1].cover_image_url}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                      )}
                      {recentPacks[2] && (
                        <div className="absolute -top-4 -right-4 w-28 h-28 rounded-xl overflow-hidden shadow-xl transform rotate-6 opacity-80">
                          {recentPacks[2].cover_image_url && (
                            <Image
                              src={recentPacks[2].cover_image_url}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Scroll indicator - positioned lower on mobile to give more space */}
          <div className="absolute bottom-6 sm:bottom-4 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronRight className="w-6 h-6 text-white/40 rotate-90" />
          </div>
        </section>

        {/* ============================================
            FEATURES STRIP
            ============================================ */}
        <section className="border-y border-grey-800 bg-grey-900/30">
          <div className="container-app py-8 sm:py-12">
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-text-muted">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================
            CATALOG FEED - Single unified view (Netflix style)
            ============================================ */}
        <section id="catalog" className="section scroll-mt-20">
          <div className="container-app">
            {/* Section header */}
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Catalog</h2>
              <p className="text-text-muted mb-3">
                Preview any composition. Subscribe to save and download.
              </p>
              <p className="text-sm text-amber-400/80 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Packs are archived after 90 days. Grab them while they&apos;re live.
              </p>
            </div>

            {/* Searchable Catalog */}
            <CatalogSearch packs={allPacks} hasSubscription={hasSubscription} />
          </div>
        </section>

        {/* ============================================
            MADE BY HUMANS STRIP
            ============================================ */}
        <section className="py-16 sm:py-24 border-y border-grey-800 bg-gradient-to-b from-charcoal via-grey-900/20 to-charcoal overflow-hidden">
          <div className="container-app">
            <div className="flex flex-col items-center text-center">
              {/* Decorative elements */}
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-white/30" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-white/30" />
              </div>

              {/* Main text with premium styling */}
              <div className="relative">
                {/* Background glow effect */}
                <div className="absolute inset-0 blur-[100px] bg-white/10 rounded-full scale-150" />

                <h2 className="relative text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-none">
                  <span className="text-white">MADE IN HOUSE.</span>
                  <br />
                  <span className="text-white/70">MADE BY HUMANS.</span>
                </h2>
              </div>

              {/* Decorative elements */}
              <div className="flex items-center gap-4 mt-10">
                <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-white/30" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-white/30" />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            CREATOR STRIP
            ============================================ */}
        <CreatorHeroStrip />

        {/* ============================================
            COMPLETE CONTROL (Licensing/Clearance)
            ============================================ */}
        <CompleteControlSection />

        {/* ============================================
            COMMUNITY PROOF
            ============================================ */}
        <CommunityProof />

        {/* ============================================
            HOW IT WORKS
            ============================================ */}
        <HowItWorksSection />

        {/* ============================================
            PRICING
            ============================================ */}
        <section id="pricing" className="section scroll-mt-20">
          <div className="container-app">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Simple Pricing</h2>
              <p className="text-text-muted max-w-xl mx-auto">
                One price. Full access to everything.
              </p>
            </div>

            {/* Main Pricing Card */}
            <div className="max-w-lg mx-auto">
              <div className="relative bg-charcoal border-2 border-white/20 rounded-2xl p-6 sm:p-8">
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">$3.99</span>
                    <span className="text-text-muted text-lg">/month</span>
                  </div>
                  <p className="text-sm text-text-muted mt-2">7-day free trial included</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3 text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      {benefit}
                    </li>
                  ))}
                </ul>

                {/* Quality Badge */}
                <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Quality over quantity</p>
                      <p className="text-xs text-text-muted">New pack every month, minimum. Weekly drops coming.</p>
                    </div>
                  </div>
                </div>

                <SubscribeCTA
                  isLoggedIn={isLoggedIn}
                  hasSubscription={hasSubscription}
                  className="w-full"
                  size="lg"
                />
                {hasSubscription && (
                  <p className="text-center text-sm text-success mt-4">
                    You&apos;re already subscribed!
                  </p>
                )}
              </div>

              {/* Patreon Alternative */}
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-grey-800/50 border border-grey-700 mb-4">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#FF424D]" fill="currentColor">
                    <path d="M14.82 2.41C18.78 2.41 22 5.65 22 9.62C22 13.58 18.78 16.8 14.82 16.8C10.85 16.8 7.61 13.58 7.61 9.62C7.61 5.65 10.85 2.41 14.82 2.41M2 21.6H5.5V2.41H2V21.6Z" />
                  </svg>
                  <span className="text-sm text-text-muted">Already a Patreon member?</span>
                </div>
                <p className="text-sm text-text-muted max-w-md mx-auto mb-4">
                  If you&apos;re already supporting on Patreon, just sign up and connect your account to unlock downloads. No need to subscribe twice.
                </p>
                <Link href="/signup" className="text-white text-sm underline hover:text-grey-200 transition-colors">
                  Create account and link Patreon
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            FAQ SECTION
            ============================================ */}
        <FAQSection />

        {/* ============================================
            TRUST SIGNALS
            ============================================ */}
        <section className="section border-t border-grey-800">
          <div className="container-app">
            <div className="grid sm:grid-cols-3 gap-8 text-center">
              <div>
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Pre-Cleared for Release</h3>
                <p className="text-sm text-text-muted">Every sound is original and safe to use in real releases. No sample clearance stress.</p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Instant Access</h3>
                <p className="text-sm text-text-muted">Download everything immediately. No waiting, no unlocks.</p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Cancel Anytime</h3>
                <p className="text-sm text-text-muted">Month to month. Stay because it&apos;s useful, not because you&apos;re locked in.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            FINAL CTA
            ============================================ */}
        {!isLoggedIn && (
          <section className="section">
            <div className="container-app">
              <div className="relative overflow-hidden bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-3xl p-8 sm:p-12 lg:p-16 text-center">
                <div className="relative z-10">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
                    Ready to find your sound?
                  </h2>
                  <p className="text-lg text-text-muted mb-8 max-w-xl mx-auto">
                    Join producers who use Soul Sample Club for inspiration. Start your free trial today.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/signup">
                      <Button size="lg" className="w-full sm:w-auto">
                        Start free trial
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    <a href="#catalog">
                      <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                        Browse catalog first
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
              </div>
            </div>
          </section>
        )}

        {/* Logged-in user CTA */}
        {isLoggedIn && !hasSubscription && (
          <section className="section">
            <div className="container-app">
              <div className="bg-gradient-to-r from-white/5 to-transparent border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Ready to download?</h3>
                  <p className="text-text-muted">Start your 7-day free trial to download all samples.</p>
                </div>
                <SubscribeCTA
                  isLoggedIn={isLoggedIn}
                  hasSubscription={hasSubscription}
                  size="md"
                >
                  Subscribe now
                </SubscribeCTA>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ============================================
          FOOTER
          ============================================ */}
      <footer className={`border-t border-grey-700 py-8 sm:py-12 ${isLoggedIn ? 'pb-24 sm:pb-12' : ''}`}>
        <div className="container-app">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <Image
              src="/logo.svg"
              alt="Soul Sample Club"
              width={140}
              height={32}
              className="h-7 w-auto"
            />

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-text-muted">
              <a href="#catalog" className="hover:text-white transition-colors">
                Catalog
              </a>
              <a href="#pricing" className="hover:text-white transition-colors">
                Pricing
              </a>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
            </div>

            {/* Copyright */}
            <p className="text-sm text-text-subtle">
              © {new Date().getFullYear()} Soul Sample Club by Looplair
            </p>
          </div>
        </div>
      </footer>

      {/* ============================================
          MOBILE BOTTOM NAV (for logged-in users)
          ============================================ */}
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
  );
}

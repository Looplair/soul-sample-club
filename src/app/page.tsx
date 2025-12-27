import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PackCard } from "@/components/packs/PackCard";
import { CreatorHeroStrip } from "@/components/sections/CreatorHeroStrip";
import { CompleteControlSection } from "@/components/sections/CompleteControlSection";
import { CommunityProof } from "@/components/sections/CommunityProof";
import { FAQSection } from "@/components/sections/FAQSection";
import { Button } from "@/components/ui";
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
} from "lucide-react";
import type { Sample, Profile } from "@/types/database";

// ============================================
// TYPES
// ============================================
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
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isLoggedIn: false, hasSubscription: false, profile: null };
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
    };
  } catch {
    return { isLoggedIn: false, hasSubscription: false, profile: null };
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
    title: "Premium Samples",
    description: "Curated soul, funk, and jazz samples ready for your productions",
  },
  {
    icon: Download,
    title: "WAV + Stems",
    description: "High-quality downloads with individual stems included",
  },
  {
    icon: Headphones,
    title: "Preview Everything",
    description: "Listen to every track before you subscribe",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Browse the catalog",
    description: "Explore our curated library of soul samples. Preview any track instantly.",
  },
  {
    step: "02",
    title: "Start your free trial",
    description: "Get 7 days free. Cancel anytime before trial ends to avoid charges.",
  },
  {
    step: "03",
    title: "Download & create",
    description: "Download WAV files and stems. Use in your productions royalty-free.",
  },
];

const benefits = [
  "New sample packs every month",
  "3-month rolling access window",
  "WAV files with stems",
  "Commercial license included",
  "Cancel anytime",
];

const stats = [
  { value: "500+", label: "Samples" },
  { value: "50+", label: "Packs" },
  { value: "7", label: "Day Trial" },
];

// ============================================
// PAGE COMPONENT
// ============================================
export default async function HomePage() {
  const [allPacks, userState] = await Promise.all([getAllPacks(), getUserState()]);

  const { isLoggedIn, hasSubscription, profile } = userState;

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
                  Soul samples.
                  <br />
                  <span className="text-gradient">Made for producers.</span>
                </h1>

                {/* Subheadline */}
                <p className="text-lg sm:text-xl text-text-muted max-w-xl mx-auto lg:mx-0 mb-8">
                  Curated sample packs delivered monthly. Preview everything free.
                  Subscribe to download stems and WAVs.
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

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
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
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Sample Packs</h2>
                <p className="text-text-muted">
                  {allPacks.length} packs • {isLoggedIn
                    ? hasSubscription
                      ? "Download any track"
                      : "Preview everything • Subscribe to download"
                    : "Preview any track • Sign up to save favorites"}
                </p>
              </div>
            </div>

            {/* All Packs Grid - unified view */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {allPacks.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  sampleCount={Array.isArray(pack.samples) ? pack.samples.length : 0}
                  hasSubscription={hasSubscription}
                />
              ))}
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
        <section id="how-it-works" className="section bg-grey-900/50 scroll-mt-20">
          <div className="container-app">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">How It Works</h2>
              <p className="text-text-muted max-w-xl mx-auto">
                Get started in minutes. No complicated setup or contracts.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {howItWorks.map((item, index) => (
                <div key={item.step} className="relative">
                  {/* Connector line */}
                  {index < howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-full h-px bg-gradient-to-r from-grey-600 to-transparent" />
                  )}

                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-white">{item.step}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-text-muted">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

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
                    <span className="text-5xl font-bold text-white">$9.99</span>
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

                <Link href="/signup">
                  <Button className="w-full" size="lg">
                    Start free trial
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
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
                <h3 className="text-base font-semibold text-white mb-1">Commercial License</h3>
                <p className="text-sm text-text-muted">Use samples in your commercial releases</p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Instant Downloads</h3>
                <p className="text-sm text-text-muted">No waiting—download immediately</p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Cancel Anytime</h3>
                <p className="text-sm text-text-muted">No contracts or commitments</p>
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
                <Link href="/account?tab=billing">
                  <Button>
                    Subscribe now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
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

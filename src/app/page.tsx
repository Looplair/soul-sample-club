import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PackCard } from "@/components/packs/PackCard";
import { Button } from "@/components/ui";
import { Music, Sparkles, Download, Headphones, Check, ArrowRight } from "lucide-react";
import type { Sample } from "@/types/database";

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

async function getRecentPacks(): Promise<PackWithSamples[]> {
  const adminSupabase = createAdminClient();
  const result = await adminSupabase
    .from("packs")
    .select(`*, samples(*)`)
    .eq("is_published", true)
    .order("release_date", { ascending: false })
    .limit(4);

  return (result.data as PackWithSamples[]) || [];
}

async function isLoggedIn(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

const features = [
  {
    icon: Music,
    title: "Premium Samples",
    description: "Curated soul, funk, and jazz samples from professional producers",
  },
  {
    icon: Download,
    title: "High Quality WAV",
    description: "Download stems and full tracks in pristine audio quality",
  },
  {
    icon: Headphones,
    title: "Preview Everything",
    description: "Listen to every sample before you subscribe",
  },
];

const benefits = [
  "New sample packs released regularly",
  "Access to 3 months of rolling releases",
  "High-quality WAV files with stems",
  "Commercial use license included",
  "Cancel anytime, no commitment",
];

export default async function HomePage() {
  const loggedIn = await isLoggedIn();

  // If logged in, redirect to feed
  if (loggedIn) {
    redirect("/feed");
  }

  const recentPacks = await getRecentPacks();

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <header className="border-b border-grey-700 bg-charcoal/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-app h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white flex items-center justify-center shadow-button group-hover:shadow-glow-white-soft transition-shadow duration-300">
              <span className="text-charcoal font-bold text-sm sm:text-base">S</span>
            </div>
            <span className="font-wordmark text-lg sm:text-xl tracking-wider text-white uppercase hidden sm:block">
              Soul Sample Club
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">
                Start free trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <div className="container-app py-16 sm:py-24 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-6">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm text-white">7-day free trial</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 max-w-3xl mx-auto leading-tight">
              Premium samples for music producers
            </h1>

            <p className="text-lg sm:text-xl text-text-muted max-w-2xl mx-auto mb-8">
              Soul Sample Club delivers curated sample packs straight to your library.
              Preview everything for free. Subscribe to download.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Start free trial
                </Button>
              </Link>
              <Link href="/feed">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Browse catalog
                </Button>
              </Link>
            </div>

            <p className="text-sm text-text-muted">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </section>

        {/* Latest Releases - Feed Preview */}
        <section className="py-12 sm:py-16 border-t border-grey-800">
          <div className="container-app">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-white" />
                <h2 className="text-h3 sm:text-h2 text-white">Latest Releases</h2>
              </div>
              <Link href="/feed" className="text-sm text-text-muted hover:text-white transition-colors">
                View all →
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {recentPacks.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  sampleCount={Array.isArray(pack.samples) ? pack.samples.length : 0}
                  hasSubscription={false}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-12 sm:py-16 border-t border-grey-800">
          <div className="container-app">
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {features.map((feature) => (
                <div key={feature.title} className="text-center sm:text-left">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto sm:mx-0 mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-text-muted">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subscription Options */}
        <section className="py-12 sm:py-16 border-t border-grey-800 bg-grey-900/50">
          <div className="container-app">
            <div className="text-center mb-10">
              <h2 className="text-h2 text-white mb-3">Choose how you subscribe</h2>
              <p className="text-text-muted max-w-xl mx-auto">
                Two ways to get access. Same benefits either way. Pick what works for you.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Direct Subscription */}
              <div className="bg-charcoal border border-grey-700 rounded-2xl p-6 sm:p-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">Direct Subscription</h3>
                  <div className="text-3xl font-bold text-white mb-1">
                    $9.99<span className="text-lg text-text-muted font-normal">/month</span>
                  </div>
                  <p className="text-sm text-text-muted">Billed monthly via Stripe</p>
                </div>
                <ul className="space-y-3 mb-6">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2 text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button className="w-full">Start 7-day free trial</Button>
                </Link>
              </div>

              {/* Patreon */}
              <div className="bg-charcoal border border-grey-700 rounded-2xl p-6 sm:p-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">Patreon</h3>
                  <div className="text-3xl font-bold text-white mb-1">
                    $10<span className="text-lg text-text-muted font-normal">/month</span>
                  </div>
                  <p className="text-sm text-text-muted">Through Patreon membership</p>
                </div>
                <ul className="space-y-3 mb-6">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2 text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                <a href="https://patreon.com/looplair" target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" className="w-full">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" fill="currentColor">
                      <path d="M14.82 2.41C18.78 2.41 22 5.65 22 9.62C22 13.58 18.78 16.8 14.82 16.8C10.85 16.8 7.61 13.58 7.61 9.62C7.61 5.65 10.85 2.41 14.82 2.41M2 21.6H5.5V2.41H2V21.6Z" />
                    </svg>
                    Join on Patreon
                  </Button>
                </a>
              </div>
            </div>

            <p className="text-center text-sm text-text-muted mt-6 max-w-xl mx-auto">
              <strong className="text-white">Already a Patreon supporter?</strong>{" "}
              Sign up with your Patreon account to automatically link your membership.
              Choose one subscription method — you don&apos;t need both.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-24 border-t border-grey-800">
          <div className="container-app text-center">
            <h2 className="text-h2 sm:text-h1 text-white mb-4">
              Ready to start creating?
            </h2>
            <p className="text-lg text-text-muted mb-8 max-w-xl mx-auto">
              Join producers who trust Soul Sample Club for quality samples.
            </p>
            <Link href="/signup">
              <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Start your free trial
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-grey-700 py-8">
        <div className="container-app">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">
              © 2024 Soul Sample Club by Looplair
            </p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-sm text-text-muted hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-sm text-text-muted hover:text-white transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

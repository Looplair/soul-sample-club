import Image from "next/image";
import Link from "next/link";
import { Apple, Monitor } from "lucide-react";
import { Button } from "@/components/ui";
import { FAQAccordion } from "./FAQAccordion";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Desktop App | Soul Sample Club",
  description: "Download the Soul Sample Club desktop app for Mac and Windows",
};

// ============================================
// CONFIGURATION
// ============================================

const HEADLINE = "Download the Desktop App";
const SUBHEADLINE =
  "Sync your Soul Sample Club library and seamlessly integrate samples into your DAW. Make Soul Sample Club an essential part of your creative workflow.";

const DOWNLOAD_LINKS = {
  macOS: "#", // Replace with actual download link
  macOSIntel: "#", // Replace with actual Intel Mac download link
  windows: "#", // Replace with actual Windows download link
};

const FAQ_ITEMS = [
  {
    question: "What are the benefits of using the app?",
    answer:
      "The desktop app lets you browse, preview, and download samples directly to your computer. It syncs with your library, organizes your downloads, and makes it easy to drag samples straight into your DAW.",
  },
  {
    question: "What can I do in the app?",
    answer:
      "Browse the full catalog, preview samples with the built-in player, download WAV files and stems, organize your library, and access your favorites, all without opening a browser.",
  },
  {
    question: "How do I start using the desktop app?",
    answer:
      "Download the app for your operating system, install it, and sign in with your Soul Sample Club account. Your library and favorites will sync automatically.",
  },
  {
    question: "Can I sync samples directly with my DAW?",
    answer:
      "Yes. The app saves samples to a folder on your computer that you can point your DAW to. Any new downloads appear instantly and are ready to use in your projects.",
  },
  {
    question: "Is the app free to use?",
    answer:
      "Yes, the desktop app is free for all Soul Sample Club members. You need an active subscription or Patreon membership to download samples.",
  },
];

// ============================================
// PAGE COMPONENT
// ============================================

export default async function AppPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

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

          <nav className="hidden md:flex items-center gap-8">
            {isLoggedIn ? (
              <>
                <Link href="/" className="nav-link">
                  Catalog
                </Link>
                <Link href="/library" className="nav-link">
                  Library
                </Link>
                <Link href="/app" className="nav-link nav-link-active">
                  App
                </Link>
                <Link href="/account" className="nav-link">
                  Account
                </Link>
              </>
            ) : (
              <>
                <Link href="/#catalog" className="nav-link">
                  Catalog
                </Link>
                <Link href="/#how-it-works" className="nav-link">
                  How It Works
                </Link>
                <Link href="/#pricing" className="nav-link">
                  Pricing
                </Link>
                <Link href="/app" className="nav-link nav-link-active">
                  App
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <Link href="/">
                <Button size="sm">Back to Catalog</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border-b border-amber-500/20">
          <div className="container-app py-3 sm:py-4">
            <p className="text-center text-sm sm:text-base text-amber-200">
              <span className="font-semibold">Coming Soon</span> — The desktop app is currently in development. Stay tuned!
            </p>
          </div>
        </div>

        {/* Hero Section */}
        <section className="py-16 sm:py-24 lg:py-32">
          <div className="container-app">
            <div className="text-center max-w-3xl mx-auto">
              {/* App Icon */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-8 rounded-2xl bg-grey-800 border border-grey-700 flex items-center justify-center shadow-lg">
                <svg
                  viewBox="0 0 24 24"
                  className="w-12 h-12 sm:w-14 sm:h-14 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
                {HEADLINE}
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-white/60 leading-relaxed mb-10 max-w-2xl mx-auto">
                {SUBHEADLINE}
              </p>

              {/* Download Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <a href={DOWNLOAD_LINKS.macOS}>
                  <Button size="lg" className="w-full sm:w-auto min-w-[220px]">
                    Download for macOS
                    <Apple className="w-5 h-5 ml-2" />
                  </Button>
                </a>
                <a href={DOWNLOAD_LINKS.windows}>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full sm:w-auto min-w-[220px]"
                  >
                    Download for Windows
                    <Monitor className="w-5 h-5 ml-2" />
                  </Button>
                </a>
              </div>

              {/* Intel Mac Link */}
              <p className="text-sm text-white/40">
                You have an Intel Mac?{" "}
                <a
                  href={DOWNLOAD_LINKS.macOSIntel}
                  className="text-white underline hover:text-white/80 transition-colors"
                >
                  Download for Mac with Intel.
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* App Screenshot Section */}
        <section className="pb-16 sm:pb-24">
          <div className="container-app">
            <div className="relative max-w-5xl mx-auto">
              {/* Screenshot Container */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-grey-800 border border-grey-700 shadow-2xl">
                {/* Gradient background with placeholder */}
                <div className="aspect-[16/10] bg-gradient-to-br from-grey-700 via-grey-800 to-grey-900">
                  {/* Placeholder UI */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          className="w-8 h-8 text-white/30"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <path d="M8 21h8M12 17v4" />
                        </svg>
                      </div>
                      <p className="text-white/30 text-sm">App screenshot</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-rose-500/10 rounded-full blur-3xl" />
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-24 bg-grey-900/50">
          <div className="container-app">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12">
                Questions & Answers
              </h2>

              <FAQAccordion items={FAQ_ITEMS} />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-grey-700 py-8 sm:py-12">
        <div className="container-app">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Image
              src="/logo.svg"
              alt="Soul Sample Club"
              width={140}
              height={32}
              className="h-7 w-auto"
            />

            <div className="flex items-center gap-6 text-sm text-text-muted">
              <Link href="/#catalog" className="hover:text-white transition-colors">
                Catalog
              </Link>
              <Link href="/#pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
            </div>

            <p className="text-sm text-text-subtle">
              © {new Date().getFullYear()} Soul Sample Club by Looplair
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

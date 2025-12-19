import Link from "next/link";

export const metadata = {
  title: "Terms of Use | Soul Sample Club",
  description: "Terms of Use for Soul Sample Club",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <header className="border-b border-grey-700 bg-charcoal/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-app h-14 sm:h-16 flex items-center">
          <Link href="/feed" className="flex items-center gap-2 sm:gap-3 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white flex items-center justify-center">
              <span className="text-charcoal font-bold text-sm sm:text-base">S</span>
            </div>
            <span className="font-wordmark text-lg sm:text-xl tracking-wider text-white uppercase">
              Soul Sample Club
            </span>
          </Link>
        </div>
      </header>

      <main className="section">
        <div className="container-app max-w-3xl">
          <h1 className="text-h1 text-white mb-8">Terms of Use</h1>

          <div className="prose prose-invert prose-grey max-w-none space-y-6 text-text-secondary">
            <p className="text-body-lg text-text-muted">
              Last updated: December 2024
            </p>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Soul Sample Club, you agree to be bound by these Terms of Use.
                If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">2. Sample License</h2>
              <p>
                <strong className="text-white">Samples are licensed, not sold.</strong> When you download samples from Soul Sample Club,
                you receive a non-exclusive, royalty-free license to use them in your musical productions.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You may use samples in commercial and non-commercial productions</li>
                <li>You may not redistribute, resell, or share samples as standalone files</li>
                <li>You may not claim ownership of the original samples</li>
                <li>You may not use samples in sample pack products or sound libraries</li>
                <li>Samples must be incorporated into a new musical work</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">3. Account Terms</h2>
              <p>
                You are responsible for maintaining the security of your account and password.
                You agree to accept responsibility for all activities that occur under your account.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">4. Subscription & Billing</h2>
              <p>
                Subscriptions are billed on a recurring basis. You may cancel at any time,
                but no refunds are provided for partial billing periods. Access to downloads
                is limited to the most recent 3 months of releases while your subscription is active.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">5. Patreon Access</h2>
              <p>
                If you connect a Patreon account with an active pledge to Looplair,
                you receive equivalent access to Soul Sample Club. Patreon billing and
                membership are managed through Patreon&apos;s platform and subject to their terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">6. Termination</h2>
              <p>
                We may terminate or suspend your account at any time for violation of these terms.
                Upon termination, your license to downloaded samples remains valid for works
                created during your active subscription period.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">7. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the
                service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">8. Contact</h2>
              <p>
                For questions about these terms, please contact us through our website.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-grey-700">
            <Link
              href="/feed"
              className="text-white hover:underline"
            >
              ← Back to Catalog
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

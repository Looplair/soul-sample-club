import Link from "next/link";
import Image from "next/image";

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
        </div>
      </header>

      <main className="section">
        <div className="container-app max-w-3xl">
          <h1 className="text-h1 text-white mb-4">Terms of Use</h1>
          <p className="text-body-lg text-text-muted mb-8">
            Last updated: December 2024
          </p>

          <div className="prose prose-invert prose-grey max-w-none space-y-8 text-text-secondary">
            <p>
              These Terms of Use (&quot;Terms&quot;) govern your access to and use of the Soul Sample Club platform, including the website, web application, desktop application, and all related services (collectively, the &quot;Platform&quot;).
            </p>
            <p>
              By accessing or using the Platform, you agree to be bound by these Terms. If you do not agree, you must not access or use the Platform.
            </p>

            {/* Section 1 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">1. About Soul Sample Club</h2>
              <p>
                Soul Sample Club is a subscription-based platform providing access to original musical compositions, audio samples, and related playback and preview tools designed for music production and sampling.
              </p>
              <p>The Platform may be accessed through:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>A web-based application</li>
                <li>A desktop application that mirrors the web experience</li>
              </ul>
              <p>These Terms apply equally to all versions of the Platform.</p>
            </section>

            {/* Section 2 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">2. Eligibility and Age Requirements</h2>
              <p>
                To create an account, enter into a subscription, or make purchases on the Platform, you must be at least 18 years old or the age of legal majority in your jurisdiction.
              </p>
              <p>
                If you are under 18, you may only access or use the Platform with the knowledge, consent, and supervision of a parent or legal guardian, who agrees to these Terms on your behalf and assumes full responsibility for your use of the Platform.
              </p>
              <p>By using the Platform, you represent and warrant that:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You are legally permitted to enter into these Terms, or</li>
                <li>A parent or legal guardian has authorised your use of the Platform and accepts these Terms on your behalf</li>
              </ul>
              <p>Soul Sample Club does not knowingly target or solicit children under the age of 13.</p>
            </section>

            {/* Section 3 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">3. Account Registration and Security</h2>
              <p>Certain features of the Platform require account registration.</p>
              <p>You agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the confidentiality of your login credentials</li>
                <li>Notify us immediately of any unauthorised access or security breach</li>
              </ul>
              <p>
                You are responsible for all activity that occurs under your account, whether accessed via the web or desktop application.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">4. Subscriptions, Trials, and Billing</h2>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Free Trials</h3>
                <p>If a free trial is offered:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Trial access may be limited in duration or functionality</li>
                  <li>You may cancel before the trial ends to avoid charges</li>
                  <li>Trial terms may change or be withdrawn at any time</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Paid Subscriptions</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Subscriptions are billed on a recurring basis unless cancelled</li>
                  <li>Prices and billing terms are shown at checkout</li>
                  <li>You are responsible for all applicable taxes</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Cancellation</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You may cancel your subscription at any time</li>
                  <li>Cancellation prevents future billing</li>
                  <li>Fees already paid are non-refundable unless required by law</li>
                </ul>
              </div>
            </section>

            {/* Section 5 - License */}
            <section id="license" className="space-y-4 scroll-mt-24">
              <h2 className="text-h3 text-white">5. License to Use Samples</h2>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-emerald-400">Grant of License</h3>
                <p>
                  Subject to your compliance with these Terms, Soul Sample Club grants you a <strong className="text-white">non-exclusive, perpetual, royalty-free license</strong> to use any samples or compositions that you downloaded while your subscription was active.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Scope of Use</h3>
                <p>You may use downloaded samples in:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Commercial and non-commercial music releases</li>
                  <li>Independent and major label releases</li>
                  <li>Streaming platforms</li>
                  <li>Sync and media placements</li>
                  <li>Client work and commissioned projects</li>
                  <li>Advertising and promotional materials</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
                <h3 className="text-lg font-semibold text-white">No Clearance Required</h3>
                <p>All samples provided through the Platform are:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-white">Original compositions</strong></li>
                  <li><strong className="text-white">Pre-cleared for use</strong></li>
                  <li><strong className="text-white">Free from future clearance or royalty obligations</strong></li>
                </ul>
                <p className="text-white font-medium mt-4">
                  Once downloaded, no additional permission, attribution, payment, or notification is required, now or in the future.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">6. Restrictions on Use</h2>
              <p>You may not:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Resell, sublicense, or redistribute samples as standalone files</li>
                <li>Upload samples to competing libraries or platforms</li>
                <li>Share, leak, or publicly distribute raw sample files</li>
                <li>Use the Platform to create a competing service</li>
                <li>Circumvent access controls, download limits, or security features</li>
                <li>Scrape, harvest, or automate access to Platform content or metadata</li>
                <li><strong className="text-white">Use samples to train, develop, or improve any artificial intelligence, machine learning model, or similar technology</strong></li>
                <li><strong className="text-white">Include samples in datasets intended for AI training purposes</strong></li>
              </ul>
              <p>These restrictions apply regardless of whether access is via web or desktop application.</p>
            </section>

            {/* Section 6A - AI Prohibition */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">6A. Prohibition on AI Training</h2>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6 space-y-4">
                <p>
                  <strong className="text-white">Soul Sample Club samples may not be used for artificial intelligence or machine learning purposes.</strong>
                </p>
                <p>This includes, but is not limited to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Training generative AI models (audio, music, or otherwise)</li>
                  <li>Fine-tuning existing AI models</li>
                  <li>Creating datasets for machine learning research or development</li>
                  <li>Feeding samples into any system designed to analyse, replicate, or generate audio</li>
                </ul>
                <p>
                  This prohibition exists to protect the integrity of human-made music and ensure our compositions are not used to train systems that may replace human creativity.
                </p>
                <p className="text-rose-400 font-medium">
                  Violation of this policy constitutes a material breach of these Terms and may result in immediate account termination and legal action.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">7. Content Rotation and Availability</h2>
              <p>The Platform may:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Add, rotate, or remove content over time</li>
                <li>Limit the availability of certain samples</li>
              </ul>
              <p>However:</p>
              <p className="text-white font-medium">
                Your license to any samples you downloaded and used while subscribed remains valid indefinitely.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">8. Playback, Preview, and Creative Tools</h2>
              <p>The Platform may include features such as:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Audio previews</li>
                <li>Looping</li>
                <li>Pitch adjustment</li>
                <li>Playback controls</li>
              </ul>
              <p>These features:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Are provided for preview and inspiration only</li>
                <li>Do not modify downloadable files</li>
                <li>Do not create derivative licenses</li>
              </ul>
              <p>All downloaded files remain unaltered.</p>
            </section>

            {/* Section 9 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">9. Intellectual Property</h2>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Platform Ownership</h3>
                <p>
                  All Platform software, design, interface elements, branding, text, and non-sample content are owned by or licensed to Soul Sample Club and protected by intellectual property laws.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">User Creations</h3>
                <p>You retain full ownership of:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Any original music you create</li>
                  <li>Any recordings or compositions you produce using the samples</li>
                </ul>
                <p className="text-white font-medium">
                  Soul Sample Club claims no ownership over your finished works.
                </p>
              </div>
            </section>

            {/* Section 10 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">10. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Abuse or interfere with the Platform</li>
                <li>Attempt to reverse engineer or compromise the Platform</li>
                <li>Use the Platform for unlawful purposes</li>
                <li>Engage in behaviour that harms other users or the Platform</li>
              </ul>
              <p>We reserve the right to investigate misuse and take appropriate action.</p>
            </section>

            {/* Section 11 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">11. Suspension and Termination</h2>
              <p>We may suspend or terminate your account if:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You violate these Terms</li>
                <li>You misuse or abuse the Platform</li>
                <li>Required by law or regulation</li>
              </ul>
              <p>
                Termination does not revoke licenses for samples you downloaded and used in accordance with these Terms.
              </p>
            </section>

            {/* Section 12 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">12. Platform Changes</h2>
              <p>We may:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Modify or discontinue features</li>
                <li>Update these Terms from time to time</li>
              </ul>
              <p>
                Material changes will be communicated through the Platform. Continued use constitutes acceptance of updated Terms.
              </p>
            </section>

            {/* Section 13 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">13. Disclaimer of Warranties</h2>
              <p>The Platform is provided &quot;as is&quot; and &quot;as available.&quot;</p>
              <p>We do not guarantee:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Uninterrupted access</li>
                <li>Error-free operation</li>
                <li>That the Platform will meet all specific needs</li>
              </ul>
            </section>

            {/* Section 14 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">14. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Soul Sample Club is not liable for indirect or consequential damages</li>
                <li>Total liability shall not exceed the amount paid by you in the preceding 12 months</li>
              </ul>
            </section>

            {/* Section 15 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">15. Indemnification</h2>
              <p>You agree to indemnify and hold harmless Soul Sample Club from claims arising from:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your use of the Platform</li>
                <li>Your breach of these Terms</li>
                <li>Your misuse of samples or content</li>
              </ul>
            </section>

            {/* Section 16 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">16. Governing Law</h2>
              <p>These Terms are governed by the laws of England and Wales.</p>
              <p>
                Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            {/* Section 17 */}
            <section className="space-y-4">
              <h2 className="text-h3 text-white">17. Contact</h2>
              <p>For questions regarding these Terms or the Platform, contact:</p>
              <p>
                <a href="mailto:hello@soulsampleclub.com" className="text-white hover:underline">
                  hello@soulsampleclub.com
                </a>
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-grey-700">
            <Link
              href="/"
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

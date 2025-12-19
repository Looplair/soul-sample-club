import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Soul Sample Club",
  description: "Privacy Policy for Soul Sample Club",
};

export default function PrivacyPage() {
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
          <h1 className="text-h1 text-white mb-8">Privacy Policy</h1>

          <div className="prose prose-invert prose-grey max-w-none space-y-6 text-text-secondary">
            <p className="text-body-lg text-text-muted">
              Last updated: December 2024
            </p>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">1. Information We Collect</h2>
              <p>We collect the following types of information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-white">Account information:</strong> Email address, name, and password when you create an account</li>
                <li><strong className="text-white">Payment information:</strong> Processed securely through Stripe or Patreon; we do not store card details</li>
                <li><strong className="text-white">Usage data:</strong> Downloads, likes, and listening activity to improve our service</li>
                <li><strong className="text-white">Device information:</strong> Browser type and IP address for security purposes</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">2. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide and maintain our service</li>
                <li>Process subscriptions and payments</li>
                <li>Send important account notifications</li>
                <li>Improve our service based on usage patterns</li>
                <li>Prevent fraud and enforce our terms</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">3. Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-white">Stripe:</strong> Payment processing</li>
                <li><strong className="text-white">Patreon:</strong> Alternative membership management</li>
                <li><strong className="text-white">Supabase:</strong> Database and authentication</li>
                <li><strong className="text-white">Vercel:</strong> Hosting infrastructure</li>
              </ul>
              <p>Each service has its own privacy policy governing how they handle your data.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">4. Data Retention</h2>
              <p>
                We retain your account data for as long as your account is active.
                Download history and usage data may be retained for analytics purposes.
                You may request deletion of your account and data at any time.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">5. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">6. Cookies</h2>
              <p>
                We use essential cookies to maintain your session and preferences.
                We do not use third-party tracking cookies for advertising purposes.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">7. Security</h2>
              <p>
                We implement industry-standard security measures to protect your data.
                All data is transmitted over encrypted connections (HTTPS).
                Passwords are hashed and never stored in plain text.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-h3 text-white">8. Contact</h2>
              <p>
                For privacy-related inquiries, please contact us through our website.
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

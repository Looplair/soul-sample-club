import { LegalDoc, type TocItem } from "../LegalDoc";

export const metadata = {
  title: "Privacy Policy | Soul Sample Club",
  description: "Privacy Policy for Soul Sample Club",
};

const toc: TocItem[] = [
  { id: "section-1", label: "1. Who We Are" },
  { id: "section-2", label: "2. What Data We Collect" },
  { id: "section-3", label: "3. Authentication and Login Providers" },
  { id: "section-4", label: "4. Payments and Billing" },
  { id: "section-5", label: "5. How We Use Your Data" },
  { id: "section-6", label: "6. Audio Content and Creative Use" },
  { id: "section-7", label: "7. Cookies and Tracking" },
  { id: "section-8", label: "8. Under-18 Users" },
  { id: "section-9", label: "9. Data Storage and Security" },
  { id: "section-10", label: "10. Data Retention" },
  { id: "section-11", label: "11. Your Rights (UK/EU Users)" },
  { id: "section-12", label: "12. Third-Party Services" },
  { id: "section-13", label: "13. International Data Transfers" },
  { id: "section-14", label: "14. Changes to This Policy" },
  { id: "section-15", label: "15. Contact Us" },
];

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy" updated="Last updated: December 2024" toc={toc}>
            <p>
              This Privacy Policy explains how Soul Sample Club (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) collects, uses, and protects your personal information when you use our website, web application, desktop application, and related services (together, the &quot;Platform&quot;).
            </p>
            <p>
              By using the Platform, you agree to the practices described in this Policy. If you do not agree, please do not use the Platform.
            </p>

            {/* Section 1 */}
            <section id="section-1" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">1. Who We Are</h2>
              <p>
                Soul Sample Club is a music sample library and creative platform. We provide original compositions, audio tools, and digital resources designed for music producers and creators.
              </p>
              <p>
                We are based in the United Kingdom. Our Platform may be accessed from anywhere in the world, and we take reasonable steps to ensure compliance with applicable data protection laws.
              </p>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">2. What Data We Collect</h2>
              <p>We may collect the following types of information:</p>

              <div className="space-y-3">
                <h3 className="text-[17px] font-semibold text-white">Account Information</h3>
                <ul className="list-disc space-y-2 pl-6 marker:text-white/55">
                  <li>Email address</li>
                  <li>Full name</li>
                  <li>Hashed password (if using email login)</li>
                  <li>Third-party login identifiers (Google, Facebook, Patreon)</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-[17px] font-semibold text-white">Activity Data</h3>
                <ul className="list-disc space-y-2 pl-6 marker:text-white/55">
                  <li>Samples you listen to or download</li>
                  <li>Items you favourite, save, or add to playlists</li>
                  <li>Playback activity (play, pause, loop)</li>
                  <li>Search history within the Platform</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-[17px] font-semibold text-white">Technical Data</h3>
                <ul className="list-disc space-y-2 pl-6 marker:text-white/55">
                  <li>IP address</li>
                  <li>Browser type and version</li>
                  <li>Device type and operating system</li>
                  <li>Approximate location (country or region, based on IP)</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-[17px] font-semibold text-white">Billing Data</h3>
                <ul className="list-disc space-y-2 pl-6 marker:text-white/55">
                  <li>Subscription plan and status</li>
                  <li>Billing history</li>
                  <li>Payment method type (card, PayPal, etc.)</li>
                </ul>
                <p className="text-white/75">
                  We do not store full card numbers. Payments are processed by Stripe or Patreon, who maintain their own privacy policies.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section id="section-3" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">3. Authentication and Login Providers</h2>
              <p>You may log in using third-party providers such as:</p>
              <ul className="list-disc space-y-2 pl-6 marker:text-white/55">
                <li>Google</li>
                <li>Facebook</li>
                <li>Patreon</li>
              </ul>
              <p>
                When you choose to authenticate via a third party, we receive only the information necessary to create or link your account (e.g. your name, email address, and unique identifier).
              </p>
              <p>
                We do not access your contacts, post on your behalf, or retrieve any data beyond what is required for login.
              </p>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">4. Payments and Billing</h2>
              <p>
                All payment processing is handled by Stripe or Patreon. We do not have access to your full payment details. We receive only:
              </p>
              <ul className="list-disc space-y-2 pl-6 marker:text-white/55">
                <li>Confirmation of payment status</li>
                <li>Subscription tier</li>
                <li>Payment method type</li>
                <li>Billing dates</li>
              </ul>
              <p>
                Please review Stripe&apos;s and Patreon&apos;s privacy policies for details on how they process your data.
              </p>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">5. How We Use Your Data</h2>
              <p>We use your data to:</p>
              <ul className="list-disc space-y-2 pl-6 marker:text-white/55">
                <li>Provide and maintain access to the Platform</li>
                <li>Authenticate your account and secure your session</li>
                <li>Process subscriptions and verify access rights</li>
                <li>Personalise the experience (e.g. recommended samples)</li>
                <li>Improve Platform performance and fix issues</li>
                <li>Respond to support requests and user inquiries</li>
                <li>Send service-related communications (e.g. receipts, updates)</li>
                <li>Enforce our Terms of Use and prevent misuse</li>
              </ul>
              <p>
                We do not sell your personal data. We do not share it with third parties for advertising purposes.
              </p>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">6. Audio Content and Creative Use</h2>
              <p>
                We do not analyse, track, or claim ownership of any music you create using our samples. We have no visibility into how you use downloaded samples after export.
              </p>
              <p>
                Any analytics related to samples (e.g. most popular downloads) are aggregated and anonymised.
              </p>
            </section>

            {/* Section 7 */}
            <section id="section-7" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">7. Cookies and Tracking</h2>
              <p>We use a small number of essential cookies to:</p>
              <ul className="list-disc space-y-2 pl-6 marker:text-white/55">
                <li>Keep you logged in</li>
                <li>Remember preferences (e.g. volume level)</li>
                <li>Track session state</li>
              </ul>
              <p>We do not use:</p>
              <ul className="list-disc space-y-2 pl-6 marker:text-white/55">
                <li>Third-party advertising cookies</li>
                <li>Behavioural tracking across other websites</li>
                <li>Any form of cross-platform retargeting</li>
              </ul>
              <p>
                Analytics, if used, are limited to aggregate usage trends and do not include individual identification.
              </p>
            </section>

            {/* Section 8 */}
            <section id="section-8" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">8. Under-18 Users</h2>
              <p>
                Users under the age of 18 may only use the Platform with parental or guardian consent. We do not knowingly collect personal data from users under 13.
              </p>
              <p>
                If we become aware that we have inadvertently collected data from someone under 13, we will delete that data.
              </p>
            </section>

            {/* Section 9 */}
            <section id="section-9" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">9. Data Storage and Security</h2>
              <p>
                Your data is stored securely using modern infrastructure (Supabase and Vercel). We implement standard protections including:
              </p>
              <ul className="list-disc space-y-2 pl-6 marker:text-white/55">
                <li>HTTPS encryption for all connections</li>
                <li>Secure password hashing</li>
                <li>Access controls and role-based permissions</li>
                <li>Regular monitoring and security updates</li>
              </ul>
              <p>
                While we take every reasonable precaution, no system is completely secure. We encourage you to use a strong password and keep your login details private.
              </p>
            </section>

            {/* Section 10 */}
            <section id="section-10" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">10. Data Retention</h2>
              <p>
                We retain your account data for as long as your account is active. If you cancel your subscription, your account remains accessible with limited functionality.
              </p>
              <p>You may request full deletion of your account and associated data at any time by contacting us.</p>
              <p>Certain data (e.g. payment receipts) may be retained for legal or regulatory purposes.</p>
            </section>

            {/* Section 11 */}
            <section id="section-11" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">11. Your Rights (UK/EU Users)</h2>
              <p>If you are based in the UK or EU, you have the right to:</p>
              <ul className="list-disc space-y-2 pl-6 marker:text-white/55">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate or incomplete data</li>
                <li>Request deletion of your data</li>
                <li>Object to certain uses of your data</li>
                <li>Request a copy of your data in a portable format</li>
                <li>Withdraw consent at any time (where applicable)</li>
              </ul>
              <p>
                To exercise these rights, please contact us at{" "}
                <a href="mailto:hello@soulsampleclub.com" className="text-white underline underline-offset-4 hover:text-white/75">
                  hello@soulsampleclub.com
                </a>.
              </p>
            </section>

            {/* Section 12 */}
            <section id="section-12" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">12. Third-Party Services</h2>
              <p>We rely on trusted third-party services to operate the Platform:</p>
              <ul className="list-disc space-y-2 pl-6 marker:text-white/55">
                <li><strong className="text-white">Supabase</strong> – Database and authentication</li>
                <li><strong className="text-white">Vercel</strong> – Hosting and infrastructure</li>
                <li><strong className="text-white">Stripe</strong> – Payment processing</li>
                <li><strong className="text-white">Patreon</strong> – Membership and billing</li>
                <li><strong className="text-white">Google, Facebook</strong> – Optional login providers</li>
              </ul>
              <p>
                Each of these providers has its own privacy policy. We only share the minimum data required for these services to function.
              </p>
            </section>

            {/* Section 13 */}
            <section id="section-13" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">13. International Data Transfers</h2>
              <p>
                Your data may be stored or processed outside the UK or EU, in countries where our service providers operate. Where this occurs, we ensure appropriate safeguards are in place (e.g. Standard Contractual Clauses).
              </p>
            </section>

            {/* Section 14 */}
            <section id="section-14" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">14. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Significant changes will be communicated through the Platform. Continued use after changes constitutes acceptance of the revised Policy.
              </p>
            </section>

            {/* Section 15 */}
            <section id="section-15" className="scroll-mt-24 space-y-4">
              <h2 className="[font-family:var(--font-display)] text-[clamp(1.05rem,1.5vw,1.25rem)] font-extrabold uppercase leading-[1.3] tracking-[-0.01em] text-white">15. Contact Us</h2>
              <p>For privacy-related inquiries, please contact:</p>
              <p>
                <a href="mailto:hello@soulsampleclub.com" className="text-white underline underline-offset-4 hover:text-white/75">
                  hello@soulsampleclub.com
                </a>
              </p>
            </section>
    </LegalDoc>
  );
}

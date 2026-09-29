import Image from "next/image";
import { Apple, Monitor } from "lucide-react";
import { Navbar } from "@/components/layout";
import { GlassBox, Pill, Section, SectionHead } from "@/components/ssc/Glass";
import { FaqList } from "@/components/ssc/FaqList";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { createClient } from "@/lib/supabase/server";
import { getNotificationsForUser } from "@/lib/notifications";
import { hasPublishedGuides } from "@/lib/guides";
import type { Profile, NotificationWithReadStatus } from "@/types/database";

export const metadata = {
  title: "Desktop App | Soul Sample Club",
  description: "Download the free Soul Sample Club desktop app for Mac and Windows",
  alternates: { canonical: "/app" },
};

// ============================================
// CONFIGURATION
// ============================================

const HEADLINE = "The catalog on your desktop";
const SUBHEADLINE =
  "Browse every pack and preview any sample, then download it and drag it straight into your DAW. No browser tab or downloads folder in between.";

const DOWNLOAD_LINKS = {
  macOS: "/api/download-app/mac",
  windows: "/api/download-app/windows",
};

const FAQ_ITEMS = [
  {
    question: "What are the benefits of using the app?",
    answer:
      "It cuts out every step between finding a sound and actually using it. No digging through a downloads folder or renaming files. Find a sound, then drag it straight into your session.",
  },
  {
    question: "What can I do in the app?",
    answer:
      "Browse every pack in the catalog, preview any sample instantly with the built-in player, and download the WAV or the full stems separately. Downloaded samples show up in an \"On This Mac\" view so you always know what's local and what's not.",
  },
  {
    question: "How do I start using the desktop app?",
    answer:
      "Download the app for your operating system, install it, and sign in with your Soul Sample Club account. Your library shows up automatically, no manual syncing required.",
  },
  {
    question: "Can I drag samples directly into my DAW?",
    answer:
      "Yes. Once a sample's downloaded, drag it straight out of the app and drop it into your DAW's timeline. No detour through Finder or Explorer.",
  },
  {
    question: "Is the app free to use?",
    answer:
      "Yes. The app is free to download for everyone, and free to use for all Soul Sample Club members. You need an active subscription or Patreon membership to download samples.",
  },
];

// ============================================
// PAGE COMPONENT
// ============================================

export default async function AppPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [[profile, { notifications, unreadCount }], hasGuides] = await Promise.all([
    user
      ? Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single().then((r) => r.data as Profile | null),
          getNotificationsForUser(user.id),
        ])
      : Promise.resolve([null, { notifications: [] as NotificationWithReadStatus[], unreadCount: 0 }] as const),
    hasPublishedGuides(),
  ]);

  return (
    <div className="ssc min-h-screen overflow-x-clip">
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />

      <main>
        {/* HERO */}
        <Section className="pt-[clamp(56px,8vw,112px)]">
          <header className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <Pill>Desktop app · Mac and Windows</Pill>
            <h1 className="ssc-display mt-6 text-[clamp(2.4rem,6.4vw,5rem)] [text-wrap:balance]">{HEADLINE}</h1>
            <p className="ssc-body mt-6 max-w-2xl text-[clamp(1rem,1.4vw,1.2rem)] leading-relaxed">{SUBHEADLINE}</p>

            <div className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
              <a href={DOWNLOAD_LINKS.macOS} className="ssc-btn ssc-btn--primary sm:min-w-[240px]">
                <Apple className="h-5 w-5" />
                Download for macOS
              </a>
              <a href={DOWNLOAD_LINKS.windows} className="ssc-btn ssc-btn--ghost sm:min-w-[240px]">
                <Monitor className="h-5 w-5" />
                Download for Windows
              </a>
            </div>
            <p className="ssc-label mt-5">Free to download for macOS and Windows</p>
          </header>

          {/* Screenshot */}
          <GlassBox plain className="mx-auto mt-16 max-w-5xl rounded-[28px] p-2 sm:p-3">
            <div className="overflow-hidden rounded-[20px] border border-white/10">
              <Image
                src="/app-library.png"
                alt="Soul Sample Club app"
                width={1404}
                height={902}
                sizes="(max-width: 1100px) 94vw, 1024px"
                className="block h-auto w-full"
                priority
              />
            </div>
          </GlassBox>

          {/* Windows SmartScreen note */}
          <GlassBox plain className="mx-auto mt-5 max-w-5xl rounded-[22px] p-5 sm:p-6">
            <p className="ssc-label">On Windows</p>
            <p className="ssc-body mt-3 text-[15px] leading-relaxed">
              Windows may show a &quot;Windows protected your PC&quot; warning on first launch. Click{" "}
              <span className="font-medium text-white">More info</span>, then{" "}
              <span className="font-medium text-white">Run anyway</span>. It&apos;s a safety check for newly released apps, and it&apos;s
              signed and safe to run.
            </p>
          </GlassBox>
        </Section>

        {/* FAQ */}
        <Section id="faq">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHead
              pill="Questions"
              title="About the app"
              body={
                <>
                  Anything else, email{" "}
                  <a href="mailto:hello@soulsampleclub.com" className="font-medium text-white underline underline-offset-4">
                    hello@soulsampleclub.com
                  </a>
                  .
                </>
              }
            />
            <FaqList faqs={FAQ_ITEMS} />
          </div>
        </Section>
      </main>

      <SiteFooter showGuides={hasGuides} />
    </div>
  );
}

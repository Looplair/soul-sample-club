import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navbar } from "@/components/layout";
import { SubscribeCTA } from "@/components/ui/SubscribeCTA";
import { GlassBox, Pill, Section, SectionHead } from "@/components/ssc/Glass";
import { PackCard, type CardPack } from "@/components/ssc/PackCard";
import { Rail, type RailTab } from "@/components/ssc/Rail";
import { FaqList } from "@/components/ssc/FaqList";
import { TrackList } from "@/components/ssc/TrackList";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { HomeHero } from "@/components/ssc/home/HomeHero";
import { WhyBoxes } from "@/components/ssc/home/WhyBoxes";
import { ControlFilm } from "@/components/ssc/home/ControlFilm";
import { ArtistRoll } from "@/components/ssc/home/ArtistRoll";
import { MemberCap } from "@/components/ssc/MemberCap";
import { getNotificationsForUser } from "@/lib/notifications";
import { SITE_URL } from "@/lib/site";
import { isGuidePublished, hasPublishedGuides } from "@/lib/guides";
import { faqs } from "@/lib/faqs";
import { withCoverColors } from "@/lib/cover-color";
import { packPath } from "@/lib/pack-url";
import { hidePaths } from "@/lib/hide-paths";
import type { Sample, Profile, NotificationWithReadStatus } from "@/types/database";

export const metadata = {
  alternates: { canonical: "/" },
};

// Tells search engines who runs the site (name, logo, main URL)
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Soul Sample Club",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      sameAs: ["https://www.patreon.com/Looplair"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Soul Sample Club",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

interface PackWithSamples {
  id: string;
  slug?: string | null;
  name: string;
  description: string;
  cover_image_url: string | null;
  release_date: string;
  end_date: string | null;
  is_published: boolean;
  is_bonus: boolean;
  is_returned?: boolean;
  genres?: string[] | null;
  samples: Sample[];
}

// ============================================
// DATA
// ============================================
async function getAllPacks(): Promise<PackWithSamples[]> {
  const result = await createAdminClient()
    .from("packs")
    .select(`*, samples(*)`)
    .eq("is_published", true)
    .order("release_date", { ascending: false });
  return hidePaths((result.data as PackWithSamples[]) || []);
}

async function getUserState(): Promise<{
  isLoggedIn: boolean;
  hasSubscription: boolean;
  profile: Profile | null;
  userId: string | null;
  hasUsedTrial: boolean;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { isLoggedIn: false, hasSubscription: false, profile: null, userId: null, hasUsedTrial: false };

    const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const subResult = await supabase.from("subscriptions").select("*").eq("user_id", user.id).in("status", ["active", "trialing"]).single();

    let hasPatreon = false;
    try {
      const patreonResult = await supabase.from("patreon_links").select("*").eq("user_id", user.id).eq("is_active", true).single();
      hasPatreon = !!patreonResult.data;
    } catch {
      // Table might not exist
    }

    // Has ever had any subscription (for trial messaging)
    const anySubResult = await supabase.from("subscriptions").select("id").eq("user_id", user.id).limit(1);

    return {
      isLoggedIn: true,
      hasSubscription: !!subResult.data || hasPatreon,
      profile: profileResult.data as Profile | null,
      userId: user.id,
      hasUsedTrial: (anySubResult.data?.length ?? 0) > 0,
    };
  } catch {
    return { isLoggedIn: false, hasSubscription: false, profile: null, userId: null, hasUsedTrial: false };
  }
}

function isArchived(pack: PackWithSamples): boolean {
  if (pack.is_returned) return pack.end_date ? new Date() > new Date(pack.end_date) : false;
  if (pack.end_date && new Date() > new Date(pack.end_date)) return true;
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return new Date(pack.release_date) < threeMonthsAgo;
}

const byOrder = (a: Sample, b: Sample) => a.order_index - b.order_index;

const ARTISTS = [
  { name: "Dave East", image: "/placeholders/Daveast.jpg" },
  { name: "Statik Selektah", image: "/placeholders/statik.jpg" },
  { name: "Apollo Brown", image: "/placeholders/apollobrown.jpg" },
  { name: "Mick Jenkins", image: "/placeholders/mickjenkins.jpg" },
  { name: "Westside Boogie", image: "/placeholders/westideboogie.jpeg" },
  { name: "BeatsByJBlack", image: "/placeholders/beatsbyjblack.webp" },
];

const QUOTES = [
  { name: "Kimba", quote: "One of the best decisions to jump on board at the top of 2025. Looking forward to the masterpieces. You're an inspiration." },
  { name: "Sef Lateef", quote: "Finally great musicianship. AND I FUGGIN LOVE IT!!!" },
  { name: "Joshua Spann", quote: "Thanks so much for quality material" },
  { name: "Shaun D.", quote: "How sweet it is! Great work!" },
  { name: "Wilson", quote: "I jumped on it with the quickness" },
  { name: "Pharoe", quote: "Looking forward to this. Appreciate it!" },
];

// The questions a first-time visitor actually asks before joining
const HOME_FAQS = [
  "What exactly is the Soul Sample Club",
  "Are the samples really royalty free",
  "Will I ever need to clear a sample later",
  "Can I use the sounds in commercial releases",
  "Why do packs expire after 90 days",
  "Do I keep access to samples if I cancel",
  "Are these compositions made with AI",
  "Can I cancel anytime",
];

const STEPS = [
  { n: "01", title: "Preview anything", body: "Every composition in the catalog plays free. No account needed to listen." },
  { n: "02", title: "Join for $0.99", body: "Your first month is $0.99, then $6.99 a month. Cancel whenever you like." },
  { n: "03", title: "Download and flip", body: "Grab full compositions and their stems, pre-cleared for your releases." },
];

const PERKS = ["A new pack every week", "Full stems on every release", "Pre-cleared. No clearance needed, ever.", "Cancel anytime"];

// ============================================
// PAGE
// ============================================
export default async function HomePage() {
  const [allPacks, userState, hasClearanceGuide, hasGuides] = await Promise.all([
    getAllPacks(),
    getUserState(),
    isGuidePublished("sample-clearance"),
    hasPublishedGuides(),
  ]);
  const { isLoggedIn, hasSubscription, profile, userId, hasUsedTrial } = userState;
  const { notifications, unreadCount } = userId
    ? await getNotificationsForUser(userId)
    : { notifications: [] as NotificationWithReadStatus[], unreadCount: 0 };

  // Bonus packs are member extras and never featured in marketing
  const marketed = allPacks.filter((p) => !p.is_bonus);
  const current = marketed.filter((p) => !isArchived(p));
  const archived = marketed.filter(isArchived);

  // Covers light the page, so only colour what's shown
  const shown = [...current, ...archived.slice(0, 12)];
  const lit = new Map((await withCoverColors(shown)).map((p) => [p.id, p]));
  const glowOf = (p: PackWithSamples) => lit.get(p.id)?.glow ?? "196, 160, 120";
  const card = (p: PackWithSamples): CardPack => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    cover_image_url: p.cover_image_url,
    release_date: p.release_date,
    end_date: p.end_date,
    is_returned: p.is_returned,
    glow: glowOf(p),
    sampleCount: p.samples.length,
    archived: isArchived(p),
  });

  const latest = current.find((p) => p.cover_image_url) ?? current[0];
  const latestTracks = latest ? [...latest.samples].sort(byOrder) : [];
  const reelTracks = latestTracks.map((s) => ({
    id: s.id,
    name: s.name,
    bpm: s.bpm,
    key: s.key,
    duration: s.duration,
    peaks: Array.isArray(s.waveform_peaks) ? (s.waveform_peaks as number[]) : [],
    hasStems: !!s.stems_path,
  }));
  const bpms = latestTracks.map((s) => s.bpm).filter((b): b is number => !!b);
  const keys = Array.from(new Set(latestTracks.map((s) => s.key?.replace(/\s*minor$/i, "m").replace(/\s*major$/i, "")).filter(Boolean)));

  // Releases rail: New, Returning, then any genre with enough packs, then the archive
  const genreCounts = new Map<string, PackWithSamples[]>();
  current.forEach((p) => (p.genres ?? []).forEach((g) => genreCounts.set(g, [...(genreCounts.get(g) ?? []), p])));
  const railTabs: RailTab[] = [
    { label: "New", items: current.slice(0, 12).map((p) => <PackCard key={p.id} pack={card(p)} size="lg" />) },
    ...(current.some((p) => p.is_returned)
      ? [{ label: "Returning", items: current.filter((p) => p.is_returned).map((p) => <PackCard key={p.id} pack={card(p)} size="lg" />) }]
      : []),
    ...Array.from(genreCounts)
      .filter(([, packs]) => packs.length >= 3)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 4)
      .map(([genre, packs]) => ({ label: genre, items: packs.map((p) => <PackCard key={p.id} pack={card(p)} size="lg" />) })),
    ...(archived.length ? [{ label: "Archive", items: archived.slice(0, 12).map((p) => <PackCard key={p.id} pack={card(p)} size="lg" />) }] : []),
  ];

  const recent = current.slice(0, 5).map((p) => ({ name: p.name, cover_image_url: p.cover_image_url, release_date: p.release_date, glow: glowOf(p) }));
  const stemPeaks = latestTracks.map((s) => (Array.isArray(s.waveform_peaks) ? (s.waveform_peaks as number[]) : [])).filter((p) => p.length);

  const faqItems = HOME_FAQS.map((q) => faqs.find((f) => f.question === q))
    .filter((f): f is (typeof faqs)[number] => !!f)
    .map((f) => ({
      question: `${f.question}?`,
      answer: f.answer,
      href: "guideLink" in f && f.guideLink && hasClearanceGuide ? "/guides/sample-clearance" : undefined,
      linkLabel: "Read the sample clearance guide",
    }));

  const primaryCta = hasSubscription ? (
    <Link href="/feed" className="ssc-btn ssc-btn--primary">
      Open the catalog
    </Link>
  ) : (
    <SubscribeCTA isLoggedIn={isLoggedIn} hasSubscription={false} plan="monthly" bare className="ssc-btn ssc-btn--primary">
      {isLoggedIn && hasUsedTrial ? "Subscribe now" : "Start for $0.99"}
    </SubscribeCTA>
  );
  const yearlyLink = (
    <SubscribeCTA isLoggedIn={isLoggedIn} hasSubscription={false} plan="yearly" bare className="font-medium text-white underline underline-offset-4">
      $35 a year
    </SubscribeCTA>
  );

  return (
    <div className="ssc min-h-screen overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <Navbar
        user={profile}
        notifications={notifications}
        unreadCount={unreadCount}
        latest={latest ? { name: latest.name, href: packPath(latest), cover_image_url: latest.cover_image_url } : undefined}
      />

      <main>
        {/* HERO */}
        <HomeHero
          covers={current.slice(0, 3).map((p) => ({ name: p.name, href: packPath(p), cover_image_url: p.cover_image_url, glow: glowOf(p) }))}
          tracks={reelTracks}
          primaryCta={primaryCta}
          extra={!hasSubscription ? <MemberCap /> : undefined}
          secondaryLine={
            !hasSubscription && (
              <>
                {isLoggedIn && hasUsedTrial ? "$6.99 a month" : "Then $6.99 a month"}, cancel anytime. Or {yearlyLink}, offer price.
              </>
            )
          }
        />

        {/* THIS WEEK'S PACK */}
        {latest && (
          <Section>
            <GlassBox glow={glowOf(latest)} className="grid gap-8 rounded-[28px] p-4 sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:gap-10 lg:p-8">
              {/* Big cover on desktop only: on phones the hero right above already shows it */}
              <Link href={packPath(latest)} className="relative hidden aspect-square overflow-hidden rounded-[20px] lg:block">
                {latest.cover_image_url && (
                  <Image src={latest.cover_image_url} alt={latest.name} fill sizes="(max-width: 1024px) 90vw, 460px" className="object-cover" />
                )}
              </Link>
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-4">
                  <Link href={packPath(latest)} className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl lg:hidden">
                    {latest.cover_image_url && <Image src={latest.cover_image_url} alt="" fill sizes="64px" className="object-cover" />}
                  </Link>
                  <div className="flex min-w-0 flex-col items-start">
                    <Pill dot glow={glowOf(latest)}>This week</Pill>
                    <h2 className="ssc-display mt-3 break-words text-[clamp(2.2rem,5vw,4rem)] lg:mt-4">{latest.name}</h2>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    `${latestTracks.length} compositions`,
                    latestTracks.some((s) => s.stems_path) ? "Full stems" : null,
                    bpms.length ? (Math.min(...bpms) === Math.max(...bpms) ? `${bpms[0]} BPM` : `${Math.min(...bpms)}–${Math.max(...bpms)} BPM`) : null,
                    keys.length ? keys.slice(0, 4).join(" · ") : null,
                  ]
                    .filter(Boolean)
                    .map((chip) => (
                      <span key={chip} className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/75">
                        {chip}
                      </span>
                    ))}
                </div>
                <TrackList tracks={reelTracks} packName={latest.name} className="-mx-3 mt-6" />
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={packPath(latest)} className="ssc-btn ssc-btn--ghost">
                    Open the pack
                  </Link>
                </div>
              </div>
            </GlassBox>
          </Section>
        )}

        {/* COMPLETE CONTROL FILM */}
        <Section id="control">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <SectionHead
                pill="Pre-cleared by design"
                title={
                  <>
                    Complete control.
                    <br />
                    From day one.
                  </>
                }
                body="Every sound in Soul Sample Club is pre-cleared at every stage, with no limits and nothing to clear later. Release it on your own or through a label, now or years from now. Nothing changes."
              />
              <Link
                href={hasClearanceGuide ? "/guides/sample-clearance" : "/terms#license"}
                className="ssc-btn ssc-btn--ghost mt-8"
              >
                {hasClearanceGuide ? "How sample clearance works" : "Read the license"}
              </Link>
            </div>
            <ControlFilm />
          </div>
        </Section>

        {/* RELEASES RAIL */}
        <Section id="catalog">
          <SectionHead
            pill="The catalog"
            title="Every week, a new pack"
            body="Preview any composition before you join. Packs stay for 90 days, and the ones members vote for come back."
            action={
              <Link href="/feed" className="ssc-btn ssc-btn--ghost self-start md:self-auto">
                Browse everything
              </Link>
            }
          />
          <Rail tabs={railTabs} className="mt-10" />
        </Section>

        {/* WHY SSC */}
        <Section>
          <SectionHead pill="Why producers join" title="Sample soul without the paperwork" align="center" className="mb-12" />
          <WhyBoxes latestName={latest?.name ?? "This week"} stemPeaks={stemPeaks} recent={recent} />
        </Section>

        {/* PROOF */}
        <Section>
          <SectionHead
            pill="Heard on"
            title="Used by artists you know"
            body="Our sounds have been used by everyone from independent artists to industry heavyweights."
          />
          <div className="mt-12">
            <ArtistRoll artists={ARTISTS} />
          </div>
          <div className="mt-20">
            <Rail
              title={<p className="ssc-label">From members</p>}
              tabs={[
                {
                  label: "From members",
                  items: QUOTES.map((q) => (
                    <GlassBox key={q.name} plain className="flex w-[min(80vw,340px)] flex-col justify-between gap-6 rounded-[22px] p-6">
                      <p className="text-[17px] font-light leading-relaxed text-white">&ldquo;{q.quote}&rdquo;</p>
                      <p className="ssc-label">{q.name}</p>
                    </GlassBox>
                  )),
                },
              ]}
            />
          </div>
        </Section>

        {/* APP */}
        <Section>
          <GlassBox plain className="grid items-center gap-10 overflow-hidden rounded-[28px] p-7 sm:p-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <SectionHead
                pill="Desktop app"
                title="Drag it straight into your session"
                body="The free Soul Sample Club app puts the catalog on your Mac or PC. Search by key and BPM, then drag any sample into your DAW."
              />
              <Link href="/app" className="ssc-btn ssc-btn--primary mt-8">
                Get the app
              </Link>
            </div>
            <div className="relative aspect-[1404/902] overflow-hidden rounded-[14px] border border-white/10 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]">
              <Image src="/app-library.png" alt="The Soul Sample Club desktop app library" fill sizes="(max-width: 1024px) 90vw, 700px" className="object-cover" />
            </div>
          </GlassBox>
        </Section>

        {/* HOW IT WORKS */}
        <Section id="how-it-works">
          <SectionHead pill="How it works" title="From preview to release" align="center" className="mb-12" />
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <GlassBox key={step.n} glow={recent[i]?.glow} className="flex flex-col gap-10 rounded-[24px] p-7">
                <span className="ssc-display text-[3.2rem] text-white/[0.22]">{step.n}</span>
                <div>
                  <h3 className="ssc-display text-[1.4rem]">{step.title}</h3>
                  <p className="ssc-body mt-3 text-[15px] leading-relaxed">{step.body}</p>
                </div>
              </GlassBox>
            ))}
          </div>
        </Section>

        {/* PRICING */}
        <Section id="pricing">
          <SectionHead
            pill="Membership"
            title={isLoggedIn && hasUsedTrial ? "Come back to the club" : "Start for $0.99"}
            body="One membership, full access to every pack in the catalog."
            align="center"
            className="mb-12"
          />
          {hasSubscription ? (
            <GlassBox glow={latest ? glowOf(latest) : undefined} className="mx-auto max-w-xl rounded-[28px] p-8 text-center">
              <p className="ssc-display text-2xl">You&apos;re a member</p>
              <p className="ssc-body mt-3">Everything in the catalog is yours to download.</p>
              <Link href="/feed" className="ssc-btn ssc-btn--primary mt-6">
                Open the catalog
              </Link>
            </GlassBox>
          ) : (
            <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
              <GlassBox glow={latest ? glowOf(latest) : undefined} className="ssc-breathe flex flex-col rounded-[28px] p-8">
                <p className="ssc-label">Monthly</p>
                {isLoggedIn && hasUsedTrial ? (
                  <p className="mt-4 flex items-baseline gap-2">
                    <span className="ssc-display text-[3.4rem]">$6.99</span>
                    <span className="text-white/55">a month</span>
                  </p>
                ) : (
                  <>
                    <p className="mt-4 flex items-baseline gap-2">
                      <span className="ssc-display text-[3.4rem]">$0.99</span>
                      <span className="text-white/55">first month</span>
                    </p>
                    <p className="mt-1 text-[14px] text-white/55">Then $6.99 a month. Cancel anytime.</p>
                  </>
                )}
                <ul className="mt-6 flex-1 space-y-2.5">
                  {PERKS.map((perk) => (
                    <li key={perk} className="flex items-center gap-3 text-[15px] text-white/75">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <SubscribeCTA isLoggedIn={isLoggedIn} hasSubscription={false} plan="monthly" bare className="ssc-btn ssc-btn--primary mt-8 w-full">
                  {isLoggedIn && hasUsedTrial ? "Subscribe now" : "Start for $0.99"}
                </SubscribeCTA>
              </GlassBox>
              <GlassBox plain className="flex flex-col rounded-[28px] p-8">
                <p className="ssc-label">Yearly · offer price</p>
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="text-2xl text-white/55 line-through">$49</span>
                  <span className="ssc-display text-[3.4rem]">$35</span>
                  <span className="text-white/55">a year</span>
                </p>
                <p className="mt-1 text-[14px] text-white/55">Locked in for life while you stay a member.</p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {PERKS.slice(0, 3).map((perk) => (
                    <li key={perk} className="flex items-center gap-3 text-[15px] text-white/75">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <SubscribeCTA isLoggedIn={isLoggedIn} hasSubscription={false} plan="yearly" bare className="ssc-btn ssc-btn--ghost mt-8 w-full">
                  Start for $35 a year
                </SubscribeCTA>
              </GlassBox>
            </div>
          )}
          {!hasSubscription && (
            <p className="mx-auto mt-8 max-w-md text-center text-[14px] text-white/55">
              Already on Patreon?{" "}
              <Link href="/signup" className="font-medium text-white underline underline-offset-4">
                Create an account and link it
              </Link>{" "}
              to unlock downloads. No need to pay twice.
            </p>
          )}
        </Section>

        {/* FAQ */}
        <Section id="faq">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHead
              pill="Questions"
              title="Before you join"
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
            <FaqList faqs={faqItems} />
          </div>
        </Section>

        {/* CLOSING CTA */}
        {!hasSubscription && (
          <Section>
            <GlassBox glow={latest ? glowOf(latest) : undefined} className="ssc-breathe rounded-[32px] px-7 py-14 text-center sm:px-12 sm:py-20">
              <Pill dot glow={latest ? glowOf(latest) : undefined}>
                Join the club
              </Pill>
              <h2 className="ssc-display mx-auto mt-6 max-w-3xl text-[clamp(2.2rem,5.4vw,4.4rem)]">Your next flip is in here</h2>
              <p className="ssc-body mx-auto mt-5 max-w-xl text-[17px]">
                {isLoggedIn && hasUsedTrial ? "$6.99 a month. Cancel anytime." : "Start for $0.99, then $6.99 a month. Cancel anytime."}
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                {primaryCta}
                <Link href="/feed" className="ssc-btn ssc-btn--ghost">
                  Browse the catalog
                </Link>
              </div>
            </GlassBox>
          </Section>
        )}
      </main>

      <SiteFooter showGuides={hasGuides} cta={false} glow={latest ? glowOf(latest) : undefined} />
    </div>
  );
}

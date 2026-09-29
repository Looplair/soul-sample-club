import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/layout";
import { GenrePackGrid } from "@/components/genre/GenrePackGrid";
import { GenreWordmark } from "@/components/genre/GenreWordmark";
import { createClient } from "@/lib/supabase/server";
import { getNotificationsForUser } from "@/lib/notifications";
import { GENRE_PAGES, getGenrePage } from "@/lib/genre-pages";
import { getGenreAvailability, getGenrePacks, getGenreStats } from "@/lib/genre-data";
import { SITE_URL } from "@/lib/site";
import { packPath } from "@/lib/pack-url";
import { withCoverColors } from "@/lib/cover-color";
import { GlassBox, Pill, SectionHead } from "@/components/ssc/Glass";
import { FaqList } from "@/components/ssc/FaqList";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import type { Profile, NotificationWithReadStatus } from "@/types/database";

export async function generateMetadata({ params }: { params: { genre: string } }) {
  const page = getGenrePage(params.genre);
  if (!page) return {};
  const url = `${SITE_URL}/samples/${page.slug}`;
  // Indexed as soon as any real pack carries the tag, expired or not, so pages don't
  // drop in and out of Google as packs move to the archive
  const hasPacks = (await getGenrePacks(page.tag)).length > 0;
  return {
    title: page.seoTitle,
    ...(!hasPacks && { robots: { index: false, follow: true } }),
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.seoTitle, description: page.description, url, siteName: "Soul Sample Club", type: "website" },
    twitter: { card: "summary_large_image", title: page.seoTitle, description: page.description },
  };
}

export default async function GenrePage({ params }: { params: { genre: string } }) {
  const page = getGenrePage(params.genre);
  if (!page) notFound();

  const [packs, availability] = await Promise.all([getGenrePacks(page.tag), getGenreAvailability()]);
  // Other genre pages with any tagged packs, for the "explore" links
  const otherGenres = GENRE_PAGES.filter((g) => g.slug !== page.slug && (availability[g.tag]?.total ?? 0) > 0);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [profile, { notifications, unreadCount }] = user
    ? await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single().then((r) => r.data as Profile | null),
        getNotificationsForUser(user.id),
      ])
    : [null, { notifications: [] as NotificationWithReadStatus[], unreadCount: 0 }];

  const stats = getGenreStats(packs);
  // A question answered from this page's own data, so every genre page says something unique
  const dataFaq =
    stats.tempoRange && stats.topKeys.length
      ? {
          q: `What tempo and key are these ${page.tag.toLowerCase()} samples?`,
          a: `Across the ${stats.releases} packs featuring ${page.tag.toLowerCase()}, most compositions sit between ${stats.tempoRange[0]} and ${stats.tempoRange[1]} BPM, and the most common keys are ${stats.topKeys.join(" and ")}. Every track lists its BPM and key, so you can find one that fits your project quickly.`,
        }
      : null;
  const faqs = dataFaq ? [page.faqs[0], dataFaq, ...page.faqs.slice(1)] : page.faqs;
  const live = packs.filter((p) => !p.archived);
  const mosaic = [...live, ...packs.filter((p) => p.archived)].filter((p) => p.cover_image_url).slice(0, 6);
  const url = `${SITE_URL}/samples/${page.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: page.seoTitle,
        description: page.description,
        url,
        publisher: { "@id": `${SITE_URL}/#organization` },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: live.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}${packPath(p)}`,
            name: p.name,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Soul Sample Club", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: `${page.tag} samples`, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  // Tags are per pack, so numbers describe the packs featuring the genre, not every track in them
  const genreLower = page.tag.toLowerCase();
  const statItems = [
    { label: `Packs featuring ${genreLower}`, value: String(stats.releases) },
    ...(stats.tempoRange ? [{ label: "Tempo across these packs", value: `${stats.tempoRange[0]}–${stats.tempoRange[1]}`, unit: "BPM" }] : []),
    ...(stats.topKeys.length ? [{ label: "Common keys across these packs", value: stats.topKeys.join(", ") }] : []),
  ];

  // Covers light the page: each tile glows in its own cover colour
  const lit = await withCoverColors(packs);
  const glowOf = new Map(lit.map((p) => [p.id, p.glow]));
  const litMosaic = mosaic.map((p) => ({ ...p, glow: glowOf.get(p.id) }));
  const leadGlow = (live[0] && glowOf.get(live[0].id)) ?? litMosaic[0]?.glow;
  const chip =
    "rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/75 transition-colors hover:border-white/30 hover:text-white";

  return (
    <div className="ssc min-h-screen overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />

      <main className="pb-24">
        {/* Hero */}
        <section className="px-5 pt-8 sm:px-8 sm:pt-12">
          <div className="mx-auto max-w-[1240px]">
            <nav className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55">
              <Link href="/" className="transition-colors hover:text-white">
                Soul Sample Club
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>Samples</span>
            </nav>
            <h1 className="ssc-pill mt-8">{page.h1}</h1>
            <div className="mt-5">
              <GenreWordmark text={page.wordmark} fontClassName="ssc-display !tracking-[0]" className="text-white" />
            </div>
          </div>

          <div className="mx-auto grid max-w-[1240px] items-start gap-12 pb-4 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:pt-14">
            <div>
              <p className="ssc-body max-w-xl text-[clamp(1.05rem,1.4vw,1.2rem)] leading-relaxed">{page.manifesto}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/subscribe" className="ssc-btn ssc-btn--primary">
                  Get started
                </Link>
                {packs.length > 0 && (
                  <a href="#releases" className="ssc-btn ssc-btn--ghost">
                    Preview the packs
                  </a>
                )}
              </div>
              <p className="mt-6 text-[13px] text-white/55">Full stems on every track. Cleared for commercial releases.</p>
            </div>

            {litMosaic.length >= 3 && (
              <div className="relative hidden lg:block">
                <div className="grid grid-cols-3 gap-4">
                  {litMosaic.map((p, i) => (
                    <GlassBox
                      key={p.id}
                      glow={p.glow}
                      className="rounded-[20px] p-2"
                      style={{ transform: `translateY(${i % 3 === 1 ? 28 : 0}px)` }}
                    >
                      <div className="relative aspect-square overflow-hidden rounded-[14px]">
                        <Image src={p.cover_image_url!} alt="" fill sizes="200px" className="object-cover" />
                      </div>
                    </GlassBox>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {packs.length === 0 ? (
          <section id="releases" className="scroll-mt-24 px-5 pt-[clamp(44px,5.5vw,80px)] sm:px-8">
            <GlassBox plain className="mx-auto max-w-[1240px] rounded-[28px] px-6 py-12 text-center sm:px-12 sm:py-16">
              <Pill>Coming soon</Pill>
              <h2 className="ssc-display mx-auto mt-5 max-w-3xl text-[clamp(1.6rem,3.4vw,2.6rem)]">
                No packs in the catalog feature {genreLower} right now
              </h2>
              <p className="ssc-body mx-auto mt-4 max-w-xl text-[16px] leading-relaxed">
                New packs land regularly, so check back soon. In the meantime, there&apos;s plenty to explore in the rest of the
                catalog.
              </p>
              {otherGenres.length > 0 && (
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {otherGenres.map((g) => (
                    <Link key={g.slug} href={`/samples/${g.slug}`} className={chip}>
                      {g.tag}
                    </Link>
                  ))}
                </div>
              )}
              <Link href="/feed" className="ssc-btn ssc-btn--ghost mt-8">
                Browse the whole catalog
              </Link>
            </GlassBox>
          </section>
        ) : (
          <>
            {/* Stats */}
            <section className="px-5 pt-[clamp(44px,5.5vw,72px)] sm:px-8">
              <dl className="mx-auto grid max-w-[1240px] gap-3 sm:grid-cols-3 sm:gap-4">
                {statItems.map((s, i) => (
                  <GlassBox key={s.label} glow={litMosaic[i]?.glow} className="rounded-[22px] px-6 py-6">
                    <dt className="ssc-label">{s.label}</dt>
                    <dd className="ssc-display mt-3 break-words text-[clamp(1.5rem,2.6vw,2.2rem)] !leading-[1.05]">
                      {s.value}
                      {"unit" in s && s.unit && <span className="ml-2 font-sans text-[13px] font-semibold tracking-[0.14em] text-white/55">{s.unit}</span>}
                    </dd>
                  </GlassBox>
                ))}
              </dl>
            </section>

            {/* Releases */}
            <section id="releases" className="scroll-mt-24 px-5 pt-[clamp(56px,7vw,112px)] sm:px-8">
              <div className="mx-auto max-w-[1240px]">
                <SectionHead
                  pill="The packs"
                  glow={leadGlow}
                  title={`Sample packs featuring ${genreLower}`}
                  body={`Each of these packs includes ${genreLower} compositions, often alongside other styles. Tap play to preview, or open a pack for every track and its stems.`}
                  className="mb-10"
                />
                <GenrePackGrid packs={lit} genre={genreLower} />
              </div>
            </section>
          </>
        )}

        {/* About */}
        <section className="px-5 pt-[clamp(64px,8vw,128px)] sm:px-8">
          <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
            <div className="flex flex-col items-start">
              <Pill>About these samples</Pill>
              <h2 className="ssc-display mt-5 text-[clamp(1.8rem,3.6vw,2.8rem)]">{page.aboutHeading}</h2>
            </div>
            <div className="space-y-5 text-[17px] font-light leading-[1.8] text-white/75 sm:text-[18px]">
              {page.about.split(/\n\n+/).map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
              <p className="text-[14px] text-white/55">Chris, Founder of Soul Sample Club</p>
            </div>
          </div>
        </section>

        {/* FAQ + guides */}
        <section className="px-5 pt-[clamp(64px,8vw,128px)] sm:px-8">
          <div className="mx-auto grid max-w-[1240px] gap-14 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
            <div className="min-w-0">
              <Pill>Questions</Pill>
              <h2 className="ssc-display mb-8 mt-5 text-[clamp(1.6rem,3vw,2.4rem)]">{page.tag} samples: common questions</h2>
              <FaqList faqs={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
            </div>
            <div className="min-w-0">
              <Pill>Learn</Pill>
              <h2 className="ssc-display mb-8 mt-5 text-[clamp(1.6rem,3vw,2.4rem)]">Guides</h2>
              <div className="flex flex-col gap-3">
                {page.guides.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/guides/${g.slug}`}
                    className="ssc-glass ssc-glass--plain group flex items-center justify-between gap-4 rounded-[20px] px-6 py-5 text-[16px] font-semibold text-white transition-colors hover:border-white/20"
                  >
                    {g.title}
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-white/75 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {packs.length > 0 && otherGenres.length > 0 && (
          <section className="px-5 pt-[clamp(64px,8vw,112px)] sm:px-8">
            <div className="mx-auto max-w-[1240px]">
              <p className="ssc-label">More styles</p>
              <h2 className="ssc-display mb-6 mt-3 text-[clamp(1.4rem,2.6vw,2rem)]">Explore other genres</h2>
              <div className="flex flex-wrap gap-2">
                {otherGenres.map((g) => (
                  <Link key={g.slug} href={`/samples/${g.slug}`} className={chip}>
                    {g.tag} samples
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Close */}
        <section className="px-5 pt-[clamp(64px,8vw,112px)] sm:px-8">
          <GlassBox
            glow={leadGlow}
            plain={!leadGlow}
            className={`mx-auto max-w-[1240px] rounded-[32px] px-6 py-12 sm:px-12 sm:py-16 ${leadGlow ? "ssc-breathe" : ""}`}
          >
            <h2 className="ssc-display max-w-3xl text-[clamp(2rem,4.8vw,3.8rem)]">Every release, pre-cleared. Every track, with stems.</h2>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/subscribe" className="ssc-btn ssc-btn--primary">
                Get started
              </Link>
              <Link href="/feed" className="ssc-btn ssc-btn--ghost">
                Preview the whole catalog free
              </Link>
            </div>
            <Link
              href="/free"
              className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-white/75 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white"
            >
              Get a free soul sample pack <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </GlassBox>
        </section>
      </main>

      <SiteFooter cta={false} glow={leadGlow} />
    </div>
  );
}

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Unbounded } from "next/font/google";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { GenrePackGrid } from "@/components/genre/GenrePackGrid";
import { GenreWordmark } from "@/components/genre/GenreWordmark";
import { createClient } from "@/lib/supabase/server";
import { getNotificationsForUser } from "@/lib/notifications";
import { GENRE_PAGES, getGenrePage } from "@/lib/genre-pages";
import { getGenreAvailability, getGenrePacks, getGenreStats } from "@/lib/genre-data";
import { SITE_URL } from "@/lib/site";
import { packPath } from "@/lib/pack-url";
import type { Profile, NotificationWithReadStatus } from "@/types/database";

// Wide display face for the giant genre title (a free cousin of Monument Extended)
const display = Unbounded({ subsets: ["latin"], weight: ["700"], display: "swap" });

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

  return (
    <div className="min-h-screen flex flex-col bg-charcoal overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />

      <main className="flex-1 pb-24">
        {/* Hero */}
        <section className="relative">
          <div className="container-app relative pt-12 sm:pt-16">
            <nav className="flex items-center gap-1.5 text-xs text-white/40">
              <Link href="/" className="hover:text-white">Soul Sample Club</Link>
              <ChevronRight className="h-3 w-3" />
              <span>Samples</span>
            </nav>
            <h1 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">{page.h1}</h1>
            <div className="mt-4">
              <GenreWordmark
                text={page.wordmark}
                fontClassName={display.className}
                className="text-white"
              />
            </div>
          </div>

          <div className="container-app relative grid items-start gap-12 pt-10 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:pb-24">
            <div>
              <p className="max-w-xl text-lg leading-relaxed text-white/60">{page.manifesto}</p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/subscribe" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-charcoal hover:bg-white/90">
                  Get started
                </Link>
                {packs.length > 0 && (
                  <a href="#releases" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white">
                    Preview the packs <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <p className="mt-6 text-xs text-white/35">Full stems on every track. Cleared for commercial releases.</p>
            </div>

            {mosaic.length >= 3 && (
              <div className="relative hidden lg:block">
                <div className="grid grid-cols-3 gap-3">
                  {mosaic.map((p, i) => (
                    <div
                      key={p.id}
                      className="relative aspect-square overflow-hidden rounded-2xl bg-grey-800 shadow-2xl"
                      style={{ transform: `translateY(${i % 3 === 1 ? 28 : 0}px)` }}
                    >
                      <Image src={p.cover_image_url!} alt="" fill sizes="200px" className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {packs.length === 0 ? (
          <section id="releases" className="container-app scroll-mt-24">
            <div className="rounded-3xl border border-white/10 px-7 py-12 text-center sm:px-12 sm:py-16">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                No packs in the catalog feature {genreLower} right now
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-white/55">
                New packs land regularly, so check back soon. In the meantime, there&apos;s plenty to explore in the rest of the
                catalog.
              </p>
              {otherGenres.length > 0 && (
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {otherGenres.map((g) => (
                    <Link
                      key={g.slug}
                      href={`/samples/${g.slug}`}
                      className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 transition-colors hover:border-white/40 hover:text-white"
                    >
                      {g.tag}
                    </Link>
                  ))}
                </div>
              )}
              <Link href="/feed" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white">
                Browse the whole catalog <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        ) : (
          <>
        {/* Stats */}
        <section className="container-app">
          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
            {statItems.map((s) => (
              <div key={s.label} className="bg-charcoal px-5 py-5 sm:px-6">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">{s.label}</dt>
                <dd className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                  {s.value}
                  {"unit" in s && s.unit && <span className="ml-1.5 text-sm font-normal text-white/40">{s.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Releases */}
        <section id="releases" className="container-app scroll-mt-24 pt-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Sample packs featuring {genreLower}</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/45">
                Each of these packs includes {genreLower} compositions, often alongside other styles. Tap play to preview, or open a
                pack for every track and its stems.
              </p>
            </div>
          </div>
          <GenrePackGrid packs={packs} genre={genreLower} />
        </section>
          </>
        )}

        {/* About */}
        <section className="container-app pt-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/35">About these samples</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {page.aboutHeading}
              </h2>
            </div>
            <div className="space-y-5 text-[17px] leading-[1.75] text-white/70">
              {page.about.split(/\n\n+/).map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
              <p className="text-sm text-white/40">Chris, Founder of Soul Sample Club</p>
            </div>
          </div>
        </section>

        {/* FAQ + guides */}
        <section className="container-app pt-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div>
              <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">{page.tag} samples: common questions</h2>
              <div className="divide-y divide-white/10 rounded-2xl border border-white/10">
                {faqs.map((f) => (
                  <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium text-white">
                      {f.q}
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/40 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="mt-3 text-[15px] leading-relaxed text-white/65">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Guides</h2>
              <div className="space-y-3">
                {page.guides.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/guides/${g.slug}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 px-5 py-4 text-white/80 transition-colors hover:border-white/25 hover:text-white"
                  >
                    {g.title}
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {packs.length > 0 && otherGenres.length > 0 && (
          <section className="container-app pt-24">
            <h2 className="mb-5 text-2xl font-bold tracking-tight text-white">Explore other genres</h2>
            <div className="flex flex-wrap gap-2">
              {otherGenres.map((g) => (
                <Link
                  key={g.slug}
                  href={`/samples/${g.slug}`}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 transition-colors hover:border-white/40 hover:text-white"
                >
                  {g.tag} samples
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Close */}
        <section className="container-app pt-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#111111] px-7 py-10 sm:px-12 sm:py-14">
            <h2 className="relative max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Every release, pre-cleared. Every track, with stems.
            </h2>
            <div className="relative mt-8 flex flex-wrap items-center gap-4">
              <Link href="/subscribe" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-charcoal hover:bg-white/90">
                Get started
              </Link>
              <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white">
                Preview the whole catalog free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/free" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white">
                Get a free soul sample pack <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

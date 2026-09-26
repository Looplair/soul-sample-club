import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { GuideMarkdown } from "@/components/guides/GuideMarkdown";
import { createClient } from "@/lib/supabase/server";
import { getGuidePacks } from "@/lib/guide-packs";
import { getNotificationsForUser } from "@/lib/notifications";
import { SITE_URL } from "@/lib/site";
import {
  GUIDE_AUTHOR,
  getGuideBySlug,
  getGuideHeadings,
  getGuidePackIds,
  getPublishedGuides,
  getReadingMinutes,
  getGuideStatus,
  isGuideLive,
  viewerIsAdmin,
} from "@/lib/guides";
import type { Profile, NotificationWithReadStatus } from "@/types/database";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const guide = await getGuideBySlug(params.slug);
  if (!guide) return {};
  const url = `${SITE_URL}/guides/${guide.slug}`;
  return {
    title: `${guide.seoTitle || guide.title} | Soul Sample Club`,
    description: guide.description,
    alternates: { canonical: url },
    // Drafts can be previewed by admins but must never be indexed
    ...(!isGuideLive(guide) && { robots: { index: false, follow: false } }),
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.description,
      url,
      siteName: "Soul Sample Club",
      publishedTime: guide.publishedAt ?? undefined,
      modifiedTime: guide.updatedAt,
      authors: [`${GUIDE_AUTHOR.name}, ${GUIDE_AUTHOR.role}`],
    },
    // Image comes from ./opengraph-image.tsx
    twitter: { card: "summary_large_image", title: guide.title, description: guide.description },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const guide = await getGuideBySlug(params.slug);
  if (!guide) notFound();
  // Drafts are only visible to admins (for previewing before publishing)
  if (!isGuideLive(guide) && !(await viewerIsAdmin(supabase, user?.id))) notFound();
  const status = getGuideStatus(guide);

  const body = guide.body;
  const headings = getGuideHeadings(body);
  const url = `${SITE_URL}/guides/${guide.slug}`;
  const liveGuides = await getPublishedGuides();
  const related = liveGuides.filter((g) => guide.related.includes(g.slug));
  const [packs, profile, { notifications, unreadCount }] = await Promise.all([
    getGuidePacks(getGuidePackIds(body)).then((list) => Object.fromEntries(list.map((p) => [p.id, p]))),
    user
      ? supabase.from("profiles").select("*").eq("id", user.id).single().then((r) => r.data as Profile | null)
      : Promise.resolve(null),
    user
      ? getNotificationsForUser(user.id)
      : Promise.resolve({ notifications: [] as NotificationWithReadStatus[], unreadCount: 0 }),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        datePublished: guide.publishedAt ?? guide.updatedAt,
        dateModified: guide.updatedAt,
        mainEntityOfPage: url,
        author: {
          "@type": "Person",
          name: GUIDE_AUTHOR.name,
          jobTitle: "Founder",
          worksFor: { "@id": `${SITE_URL}/#organization` },
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Soul Sample Club", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
          { "@type": "ListItem", position: 3, name: guide.title, item: url },
        ],
      },
      ...(guide.faqs.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: guide.faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-charcoal">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />

      <main className="flex-1 pb-24">
        {status !== "published" && (
          <div className="bg-yellow-300/10 border-b border-yellow-300/30 py-2 text-center text-xs font-medium text-yellow-200">
            {status === "scheduled" && guide.publishedAt
              ? `Scheduled for ${formatDate(guide.publishedAt)}. Only admins can see this page until then.`
              : "Draft. Only admins can see this page until it's published."}
          </div>
        )}

        {/* Header */}
        <header className="container-app max-w-3xl pt-10 sm:pt-16">
          <nav className="flex items-center gap-1.5 text-xs text-white/40">
            <Link href="/guides" className="hover:text-white">Guides</Link>
            <ChevronRight className="h-3 w-3" />
            <span>{guide.cluster}</span>
          </nav>
          <h1 className="mt-5 text-[2.25rem] sm:text-5xl font-bold leading-[1.08] tracking-tight text-white">
            {guide.title}
          </h1>
          <p className="mt-6 text-lg sm:text-xl leading-relaxed text-white/60">{guide.lead}</p>
          <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-charcoal">
              {GUIDE_AUTHOR.name[0]}
            </span>
            <div className="text-sm">
              <p className="font-medium text-white">
                {GUIDE_AUTHOR.name}, {GUIDE_AUTHOR.role}
              </p>
              <p className="text-white/40">
                Updated {formatDate(guide.updatedAt)} · {getReadingMinutes(body)} min read
              </p>
            </div>
          </div>
        </header>

        {/* Key takeaways */}
        <section className="container-app max-w-3xl mt-10">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Key takeaways</p>
            <ul className="mt-4 space-y-3">
              {guide.keyTakeaways.map((t) => (
                <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-white/80">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/60" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Body with contents list */}
        <div className="container-app mt-6 lg:grid lg:max-w-6xl lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          <aside className="hidden lg:block">
            <nav className="sticky top-28 mt-14">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/35">Contents</p>
              <ol className="mt-4 space-y-2.5 border-l border-white/10">
                {headings.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className="-ml-px block border-l border-transparent pl-4 text-sm leading-snug text-white/50 hover:border-white hover:text-white">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="max-w-3xl">
            <GuideMarkdown body={body} packs={packs} liveGuideSlugs={liveGuides.map((g) => g.slug)} />

            {/* FAQ */}
            {guide.faqs.length > 0 && (
              <section className="mt-16">
                <h2 id="faq" className="mb-6 scroll-mt-28 text-2xl sm:text-[1.75rem] font-bold tracking-tight text-white">
                  Questions producers ask
                </h2>
                <div className="divide-y divide-white/10 rounded-2xl border border-white/10">
                  {guide.faqs.map((f) => (
                    <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium text-white">
                        {f.q}
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/40 transition-transform group-open:rotate-90" />
                      </summary>
                      <p className="mt-3 text-[15px] leading-relaxed text-white/65">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Next step */}
            <section className="mt-16 rounded-3xl border border-white/15 bg-[#111111] p-7 sm:p-9">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Skip the paperwork</p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Original soul, cleared before you press play.
              </h2>
              <p className="mt-3 max-w-xl text-white/60">
                Every sound in Soul Sample Club is an original composition, pre-cleared for commercial releases.
                Download it, flip it, release it. Nothing to negotiate.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link href="/subscribe" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-charcoal hover:bg-white/90">
                  See membership
                </Link>
                <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white">
                  Preview the catalog free <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link href="/free" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white">
                  Get a free soul sample pack <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>

            {/* Author */}
            <section className="mt-12 flex gap-4 border-t border-white/10 pt-8">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white font-bold text-charcoal">
                {GUIDE_AUTHOR.name[0]}
              </span>
              <div>
                <p className="font-semibold text-white">
                  {GUIDE_AUTHOR.name}, {GUIDE_AUTHOR.role}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/55">
                  Producer and the person behind Looplair and Soul Sample Club. I started SSC so producers could sample
                  soul without the clearance headache.
                </p>
              </div>
            </section>

            {/* Sources */}
            {guide.sources.length > 0 && (
              <section className="mt-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/35">Sources</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {guide.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-white/50 underline decoration-white/20 underline-offset-4 hover:text-white">
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs leading-relaxed text-white/35">
                  This guide is general information, not legal advice. For a specific release, talk to a music lawyer.
                </p>
              </section>
            )}

            {/* Related */}
            {related.length > 0 && (
              <section className="mt-12">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/35">Keep reading</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {related.map((r) => (
                    <Link key={r.slug} href={`/guides/${r.slug}`} className="rounded-2xl border border-white/10 p-5 hover:border-white/25">
                      <p className="font-semibold text-white">{r.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-white/50">{r.description}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}

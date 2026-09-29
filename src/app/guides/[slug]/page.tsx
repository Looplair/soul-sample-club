import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout";
import { GuideMarkdown } from "@/components/guides/GuideMarkdown";
import { GlassBox, Pill } from "@/components/ssc/Glass";
import { FaqList } from "@/components/ssc/FaqList";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { withCoverColors } from "@/lib/cover-color";
import { createClient } from "@/lib/supabase/server";
import { getGuidePacks } from "@/lib/guide-packs";
import { getNotificationsForUser } from "@/lib/notifications";
import { SITE_URL } from "@/lib/site";
import { TrackView } from "@/lib/track";
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
    // Embedded packs glow in their own cover colour
    getGuidePacks(getGuidePackIds(body))
      .then((list) => withCoverColors(list))
      .then((list) => Object.fromEntries(list.map((p) => [p.id, p]))),
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

  // The closing ask takes its light from the first pack the guide features
  const ctaGlow = Object.values(packs)[0]?.glow;
  const meta = `Updated ${formatDate(guide.updatedAt)} · ${getReadingMinutes(body)} min read`;

  return (
    <div className="ssc min-h-screen overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrackView path={`/guides/${guide.slug}`} />
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />

      {status !== "published" && (
        <div className="border-b border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-center text-[12px] font-medium text-white/75">
          {status === "scheduled" && guide.publishedAt
            ? `Scheduled for ${formatDate(guide.publishedAt)}. Only admins can see this page until then.`
            : "Draft. Only admins can see this page until it's published."}
        </div>
      )}

      <main className="px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        {/* Contents rail on the left from lg up; everything else sits on one ~68ch reading column */}
        <div className="mx-auto max-w-[1060px] lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          <aside className="hidden lg:block">
            <nav className="sticky top-28">
              <Link
                href="/guides"
                className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                All guides
              </Link>
              {headings.length > 0 && (
                <>
                  <p className="ssc-label mt-10">Contents</p>
                  <ol className="mt-4 space-y-1 border-l border-white/[0.1]">
                    {headings.map((h) => (
                      <li key={h.id}>
                        <a
                          href={`#${h.id}`}
                          className="-ml-px block border-l border-transparent py-1 pl-4 text-[13px] leading-snug text-white/55 transition-colors hover:border-white hover:text-white"
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </nav>
          </aside>

          <div className="min-w-0 max-w-[720px]">
            {/* Header */}
            <header>
              <nav className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55 lg:hidden">
                <Link href="/guides" className="inline-flex items-center gap-2 transition-colors hover:text-white">
                  <ArrowLeft className="h-4 w-4" />
                  Guides
                </Link>
              </nav>
              <div className="mt-6 lg:mt-0">
                <Pill>{guide.cluster}</Pill>
              </div>
              <h1 className="ssc-display mt-5 break-words text-[clamp(2.1rem,5.2vw,3.7rem)] !leading-[1]">{guide.title}</h1>
              <p className="ssc-body mt-6 text-[clamp(1.1rem,1.6vw,1.3rem)] leading-relaxed">{guide.lead}</p>
              <div className="mt-8 flex items-center gap-3 border-t border-white/[0.08] pt-6">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-black">
                  {GUIDE_AUTHOR.name[0]}
                </span>
                <div className="min-w-0 text-[14px]">
                  <p className="font-semibold text-white">
                    {GUIDE_AUTHOR.name}, {GUIDE_AUTHOR.role}
                  </p>
                  <p className="text-[13px] text-white/55">{meta}</p>
                </div>
              </div>
            </header>

            {/* Key takeaways */}
            {guide.keyTakeaways.length > 0 && (
              <GlassBox plain className="mt-10 rounded-[24px] p-6 sm:p-8">
                <p className="ssc-label">Key takeaways</p>
                <ul className="mt-5 space-y-3.5">
                  {guide.keyTakeaways.map((t) => (
                    <li key={t} className="flex gap-3.5 text-[16px] font-light leading-relaxed text-white/75 sm:text-[17px]">
                      <span className="mt-[0.6em] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white" />
                      {t}
                    </li>
                  ))}
                </ul>
              </GlassBox>
            )}

            <article className="mt-4">
              <GuideMarkdown body={body} packs={packs} liveGuideSlugs={liveGuides.map((g) => g.slug)} />
            </article>

            {/* FAQ */}
            {guide.faqs.length > 0 && (
              <section className="mt-20">
                <h2 id="faq" className="mb-6 scroll-mt-28 text-[1.6rem] font-semibold leading-[1.2] tracking-[-0.02em] text-white sm:text-[1.9rem]">
                  Questions producers ask
                </h2>
                <FaqList faqs={guide.faqs.map((f) => ({ question: f.q, answer: f.a }))} />
              </section>
            )}

            {/* Next step */}
            <GlassBox glow={ctaGlow} plain={!ctaGlow} className={`mt-20 rounded-[28px] p-7 sm:p-10 ${ctaGlow ? "ssc-breathe" : ""}`}>
              <Pill dot={!!ctaGlow} glow={ctaGlow}>
                Skip the paperwork
              </Pill>
              <h2 className="ssc-display mt-5 text-[clamp(1.8rem,4vw,2.8rem)]">Original soul, cleared before you press play</h2>
              <p className="ssc-body mt-4 max-w-xl text-[16px] leading-relaxed sm:text-[17px]">
                Every sound in Soul Sample Club is an original composition, pre-cleared for commercial releases. Flip it and put it out
                with nothing to negotiate.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/subscribe" className="ssc-btn ssc-btn--primary">
                  See membership
                </Link>
                <Link href="/feed" className="ssc-btn ssc-btn--ghost">
                  Preview the catalog free
                </Link>
              </div>
              <Link
                href="/free"
                className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-white/75 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white"
              >
                Get a free soul sample pack <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </GlassBox>

            {/* Author */}
            <section className="mt-14 flex gap-4 border-t border-white/[0.08] pt-8">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white font-bold text-black">
                {GUIDE_AUTHOR.name[0]}
              </span>
              <div>
                <p className="font-semibold text-white">
                  {GUIDE_AUTHOR.name}, {GUIDE_AUTHOR.role}
                </p>
                <p className="ssc-body mt-1.5 text-[15px] leading-relaxed">
                  Producer and the person behind Looplair and Soul Sample Club. I started SSC so producers could sample
                  soul without the clearance headache.
                </p>
              </div>
            </section>

            {/* Sources */}
            {guide.sources.length > 0 && (
              <section className="mt-12">
                <p className="ssc-label">Sources</p>
                <ul className="mt-4 space-y-2 text-[14px]">
                  {guide.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-white/75 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white">
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-[13px] leading-relaxed text-white/55">
                  This guide is general information, not legal advice. For a specific release, talk to a music lawyer.
                </p>
              </section>
            )}

            {/* Related */}
            {related.length > 0 && (
              <section className="mt-14">
                <p className="ssc-label">Keep reading</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/guides/${r.slug}`}
                      className="ssc-glass ssc-glass--plain group flex flex-col rounded-[22px] p-6 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-white/20"
                    >
                      <p className="ssc-display break-words text-[1.05rem] !leading-[1.15]">{r.title}</p>
                      <p className="ssc-body mt-3 line-clamp-2 text-[14px] leading-relaxed">{r.description}</p>
                      <span className="mt-auto inline-flex items-center gap-2 pt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/75 transition-colors group-hover:text-white">
                        Read <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <SiteFooter cta={false} glow={ctaGlow} />
    </div>
  );
}

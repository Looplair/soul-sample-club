import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight, Megaphone } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { GlassBox, Pill } from "@/components/ssc/Glass";
import type { Announcement } from "@/types/database";

// Presentation for the members-only announcements pages. The pages themselves
// keep the auth, access checks and data fetching.

const BACK = "inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-white";

// Card preview: the first 120 characters, without Markdown symbols showing
function excerpt(body: string) {
  const text = body.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`]+/g, "").replace(/\s+/g, " ").trim();
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

export function AnnouncementList({ announcements }: { announcements: Announcement[] }) {
  return (
    <main className="px-5 pb-24 pt-6 sm:px-8 sm:pt-10">
      <div className="mx-auto max-w-[1240px]">
        <Link href="/feed" className={BACK}>
          <ArrowLeft className="h-4 w-4" />
          Catalog
        </Link>

        <header className="mt-8 flex flex-col items-start">
          <Pill>Members only</Pill>
          <h1 className="ssc-display mt-5 max-w-full break-words text-[clamp(1.9rem,5.4vw,4.4rem)]">Announcements</h1>
          <p className="ssc-body mt-4 text-[clamp(1rem,1.3vw,1.125rem)]">Updates and news for members.</p>
        </header>

        {announcements.length === 0 ? (
          <GlassBox plain className="mt-12 flex flex-col items-center rounded-[28px] px-6 py-16 text-center sm:py-20">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/12 bg-white/[0.04]">
              <Megaphone className="h-6 w-6 text-white/75" />
            </span>
            <p className="ssc-display mt-6 text-[1.6rem]">Nothing yet</p>
            <p className="ssc-body mt-2 text-[15px]">Check back soon.</p>
          </GlassBox>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {announcements.map((a) => (
              <Link
                key={a.id}
                href={`/announcements/${a.slug}`}
                className="ssc-glass ssc-glass--plain group flex flex-col rounded-[24px] p-2.5 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-white/20"
              >
                <div className="relative aspect-video overflow-hidden rounded-[18px] bg-white/[0.04]">
                  {a.cover_image_url ? (
                    <Image
                      src={a.cover_image_url}
                      alt={a.title}
                      fill
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 400px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Megaphone className="h-9 w-9 text-white/55" />
                    </div>
                  )}
                </div>
                <article className="flex flex-1 flex-col px-3.5 pb-4 pt-5">
                  <p className="ssc-label">{formatDate(a.published_at ?? a.created_at)}</p>
                  <h2 className="ssc-display mt-3 line-clamp-3 break-words pb-[0.08em] text-[1.25rem] !leading-[1.18]">{a.title}</h2>
                  <p className="ssc-body mt-3 line-clamp-3 text-[15px] leading-relaxed">
                    {excerpt(a.body)}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/75 transition-colors group-hover:text-white">
                    Read <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const LINK = "text-white underline decoration-white/40 underline-offset-[5px] transition-colors hover:decoration-white";

export function AnnouncementArticle({ announcement }: { announcement: Announcement }) {
  return (
    <main className="px-5 pb-24 pt-6 sm:px-8 sm:pt-10">
      <div className="mx-auto max-w-[760px]">
        <Link href="/announcements" className={BACK}>
          <ArrowLeft className="h-4 w-4" />
          All announcements
        </Link>

        <header className="mt-8 flex flex-col items-start">
          <Pill>{formatDate(announcement.published_at ?? announcement.created_at)}</Pill>
          <h1 className="ssc-display mt-5 break-words text-[clamp(2rem,5.2vw,3.7rem)] !leading-[1.02]">{announcement.title}</h1>
        </header>

        {announcement.cover_image_url && (
          <GlassBox plain className="mt-10 rounded-[26px] p-2.5">
            <div className="relative aspect-[21/9] overflow-hidden rounded-[18px]">
              <Image src={announcement.cover_image_url} alt={announcement.title} fill sizes="(max-width: 800px) 92vw, 760px" className="object-cover" priority />
            </div>
          </GlassBox>
        )}

        <div className="mt-10 max-w-[68ch]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="my-6 text-[17px] font-light leading-[1.8] text-white/75 sm:text-[18px]">{children}</p>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
                  {children}
                </a>
              ),
              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => (
                <ul className="my-6 list-outside list-disc space-y-3 pl-6 text-[17px] font-light leading-[1.75] text-white/75 marker:text-white/55 sm:text-[18px]">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="my-6 list-outside list-decimal space-y-3 pl-6 text-[17px] font-light leading-[1.75] text-white/75 marker:text-white/55 sm:text-[18px]">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="pl-1.5">{children}</li>,
              h2: ({ children }) => <h2 className="mb-5 mt-14 text-[1.6rem] font-semibold leading-[1.2] tracking-[-0.02em] text-white sm:text-[1.9rem]">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-3 mt-10 text-[1.2rem] font-semibold leading-snug text-white sm:text-[1.3rem]">{children}</h3>,
              blockquote: ({ children }) => (
                <blockquote className="my-10 border-l-2 border-white/40 pl-6 [&>p]:text-[19px] [&>p]:italic [&>p]:text-white">{children}</blockquote>
              ),
              hr: () => <hr className="my-12 border-white/[0.08]" />,
              code: ({ children }) => <code className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.9em] text-white">{children}</code>,
            }}
          >
            {announcement.body}
          </ReactMarkdown>
        </div>
      </div>
    </main>
  );
}

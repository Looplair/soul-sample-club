import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { GlassBox, Pill } from "@/components/ssc/Glass";

// Long-read frame for the legal pages: display headline, a glass contents box
// pinned beside the text on wide screens, and a ~70ch light body measure.

export type TocItem = { id: string; label: string };

export function LegalDoc({ title, updated, toc, children }: { title: string; updated: string; toc: TocItem[]; children: ReactNode }) {
  return (
    <main className="px-5 pb-[clamp(56px,7vw,96px)] pt-[clamp(36px,6vw,80px)] sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-12 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16">
          <div className="hidden lg:block" />
          <header className="flex flex-col items-start gap-5">
            <Pill>Legal</Pill>
            <h1 className="ssc-display text-[clamp(2.3rem,6vw,4.4rem)]">{title}</h1>
            <p className="text-[14px] text-white/55">{updated}</p>
          </header>
        </div>

        <div className="mt-10 grid gap-12 sm:mt-14 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16">
          {/* Contents: desktop only, the text reads straight through on phones */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <GlassBox plain className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[22px] p-5">
                <p className="ssc-label mb-4">Contents</p>
                <ol className="space-y-1">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block rounded-lg px-2 py-1.5 text-[13px] leading-snug text-white/75 transition-colors hover:bg-white/[0.05] hover:text-white"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </GlassBox>
            </div>
          </aside>

          <article className="min-w-0 max-w-[70ch] text-[16px] [&>*+*]:mt-10 [&>p+p]:mt-5 font-light leading-[1.75] text-white/75 sm:text-[17px]">
            {children}

            <div className="border-t border-white/[0.08] pt-8">
              <Link href="/" className="ssc-btn ssc-btn--ghost">
                <ArrowLeft className="h-4 w-4" />
                Back to Catalog
              </Link>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}

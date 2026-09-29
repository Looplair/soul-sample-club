import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout";
import { Pill } from "@/components/ssc/Glass";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { createClient } from "@/lib/supabase/server";
import { getNotificationsForUser } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { GUIDE_CLUSTERS, getAllGuides, getGuideStatus, getPublishedGuides, getReadingMinutes, viewerIsAdmin } from "@/lib/guides";
import type { Profile, NotificationWithReadStatus } from "@/types/database";

export const metadata = {
  title: "Guides for Producers | Soul Sample Club",
  description:
    "Straight answers on sample clearance, sampling soul, and building a catalog you can actually release. Written by producers, for producers.",
  alternates: { canonical: "/guides" },
};


export default async function GuidesPage() {
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

  // Admins also see drafts here, marked as such
  const guides = (await viewerIsAdmin(supabase, user?.id)) ? await getAllGuides() : await getPublishedGuides();
  // Nothing to show until the first guide is published
  if (guides.length === 0) notFound();

  return (
    <div className="ssc min-h-screen overflow-x-clip">
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />

      <main className="px-5 pb-24 pt-10 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-[1240px]">
          <header className="flex max-w-3xl flex-col items-start">
            <Pill>Guides</Pill>
            <h1 className="ssc-display mt-5 text-[clamp(2.6rem,7vw,5.6rem)]">Sample smarter</h1>
            <p className="ssc-body mt-5 max-w-2xl text-[clamp(1.05rem,1.4vw,1.2rem)] leading-relaxed">
              Straight answers on sample clearance and sampling soul, written for producers who want to release what they make.
            </p>
          </header>

          <div className="mt-[clamp(48px,6vw,88px)] space-y-[clamp(48px,6vw,80px)]">
            {GUIDE_CLUSTERS.map((cluster) => {
              const items = guides
                .filter((g) => g.cluster === cluster)
                .sort((a, b) => Number(!!b.isPillar) - Number(!!a.isPillar));
              if (items.length === 0) return null;
              return (
                <section key={cluster}>
                  <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.08] pb-4">
                    <h2 className="ssc-display text-[clamp(1.3rem,2.4vw,1.8rem)]">{cluster}</h2>
                    <span className="ssc-label flex-shrink-0">
                      {items.length} guide{items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((g) => {
                      const status = getGuideStatus(g);
                      return (
                        <Link
                          key={g.slug}
                          href={`/guides/${g.slug}`}
                          className={cn(
                            "ssc-glass ssc-glass--plain group flex flex-col rounded-[24px] p-6 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-white/20",
                            g.isPillar && "sm:col-span-2 lg:col-span-3 sm:p-9"
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            {g.isPillar && <span className="ssc-pill">Start here</span>}
                            <span className="ssc-label">{getReadingMinutes(g.body)} min read</span>
                            {status !== "published" && (
                              <span className="rounded-full border border-dashed border-white/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                                {status}
                              </span>
                            )}
                          </div>
                          <p
                            className={cn(
                              "ssc-display mt-5 break-words text-white",
                              g.isPillar ? "max-w-4xl text-[clamp(1.7rem,3.6vw,3rem)] !leading-[1.02]" : "text-[1.2rem] !leading-[1.12]"
                            )}
                          >
                            {g.title}
                          </p>
                          <p className={cn("ssc-body mt-3 leading-relaxed", g.isPillar ? "max-w-2xl text-[17px]" : "text-[15px]")}>
                            {g.description}
                          </p>
                          <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/75 transition-colors group-hover:text-white">
                            Read the guide <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

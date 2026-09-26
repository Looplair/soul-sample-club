import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { createClient } from "@/lib/supabase/server";
import { getNotificationsForUser } from "@/lib/notifications";
import { GUIDE_CLUSTERS, getAllGuides, getPublishedGuides, viewerIsAdmin } from "@/lib/guides";
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
    <div className="min-h-screen flex flex-col bg-charcoal">
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />

      <main className="flex-1 pb-24">
        <header className="container-app max-w-3xl pt-14 sm:pt-20 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">Guides</p>
          <h1 className="mt-4 text-4xl sm:text-6xl font-bold tracking-tight text-white">
            Sample smarter.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-white/55">
            Straight answers on clearance, sampling soul, and making records you can actually release.
          </p>
        </header>

        <div className="container-app max-w-5xl mt-14 space-y-14">
          {GUIDE_CLUSTERS.map((cluster) => {
            const items = guides
              .filter((g) => g.cluster === cluster)
              .sort((a, b) => Number(!!b.isPillar) - Number(!!a.isPillar));
            if (items.length === 0) return null;
            return (
              <section key={cluster}>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">{cluster}</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {items.map((g) => (
                    <Link
                      key={g.slug}
                      href={`/guides/${g.slug}`}
                      className={`group rounded-2xl border p-6 transition-colors ${
                        g.isPillar
                          ? "border-white/20 bg-white/[0.05] sm:col-span-2 hover:border-white/40"
                          : "border-white/10 hover:border-white/25"
                      }`}
                    >
                      {g.isPillar && (
                        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">Start here</p>
                      )}
                      <p className={`mt-2 font-bold text-white ${g.isPillar ? "text-2xl" : "text-lg"}`}>{g.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-white/55">{g.description}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 group-hover:text-white">
                        Read <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                      {!g.published && (
                        <span className="ml-3 rounded-full bg-yellow-300/15 px-2 py-0.5 text-[10px] font-semibold text-yellow-200">
                          Draft
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}

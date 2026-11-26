export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navbar } from "@/components/layout";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { GlassBox, Pill } from "@/components/ssc/Glass";
import { Notice } from "@/components/member/MemberUI";
import { getNotificationsForUser } from "@/lib/notifications";
import { isLiteOnly } from "@/lib/lite";
import { LITE } from "@/lib/lite-plan";
import { packPath } from "@/lib/pack-url";
import { isPackExpiredWithEndDate } from "@/lib/utils";
import type { Profile } from "@/types/database";

// Unlisted: sent to people who cancelled, and shown on their account page
export const metadata = {
  title: "Lite: one pack a month | Soul Sample Club",
  robots: { index: false, follow: false },
};

type Who = "guest" | "new" | "lite" | "member";

type LitePack = { id: string; slug: string | null; name: string; cover_image_url: string | null; release_date: string; end_date: string | null };

async function currentLitePack(): Promise<LitePack | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (createAdminClient() as any)
    .from("packs")
    .select("id, slug, name, cover_image_url, release_date, end_date")
    .eq("is_published", true)
    .eq("is_lite", true)
    .order("release_date", { ascending: false })
    .limit(5);
  if (error) return null;
  return ((data ?? []) as LitePack[]).find((p) => !isPackExpiredWithEndDate(p.release_date, p.end_date)) ?? null;
}

export default async function LitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();

  let who: Who = "guest";
  let profile: Profile | null = null;
  let notifs = { notifications: [] as Awaited<ReturnType<typeof getNotificationsForUser>>["notifications"], unreadCount: 0 };
  if (user) {
    const [profileResult, n, subs, patreon] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      getNotificationsForUser(user.id),
      admin.from("subscriptions").select("id").eq("user_id", user.id).in("status", ["active", "trialing"]).limit(1),
      admin.from("patreon_links").select("id").eq("user_id", user.id).eq("is_active", true).limit(1),
    ]);
    profile = profileResult.data as Profile | null;
    notifs = n;
    const member = !!subs.data?.length || !!patreon.data?.length;
    who = !member ? "new" : (await isLiteOnly(user.id)) ? "lite" : "member";
  }
  const pack = await currentLitePack();

  return (
    <div className="ssc flex min-h-screen flex-col overflow-x-clip">
      <Navbar user={profile} notifications={notifs.notifications} unreadCount={notifs.unreadCount} />
      <main className="flex-1 px-5 pb-24 pt-10 sm:px-8 sm:pt-16">
        <div className="mx-auto grid max-w-[1100px] items-start gap-10 md:grid-cols-[1.15fr_1fr] md:gap-14">
          <header>
            <Pill dot>Lite</Pill>
            <h1 className="ssc-display mt-6 text-[clamp(2.8rem,7.4vw,5.6rem)] [text-wrap:balance]">One pack a month for {LITE.price}</h1>
            <p className="ssc-body mt-6 max-w-lg text-[clamp(1rem,1.4vw,1.2rem)] leading-relaxed">
              Every month we pick one pack for Lite. Download all of it, stems included, and it&apos;s yours to keep. Pre-cleared, like everything
              here.
            </p>
            <ul className="mt-8 space-y-3">
              {["One hand-picked pack every month", "Full stems on every track", "Pre-cleared and royalty-free, for life", `Upgrade to every pack anytime, only ${LITE.extra} more`].map((perk) => (
                <li key={perk} className="flex items-center gap-3 text-[15px] text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  {perk}
                </li>
              ))}
            </ul>
            {pack && (
              <Link href={packPath(pack)} className="group mt-10 flex max-w-sm items-center gap-4 rounded-[20px] border border-white/10 p-3 transition-colors hover:border-white/25">
                {pack.cover_image_url && (
                  <Image src={pack.cover_image_url} alt="" width={72} height={72} className="h-[72px] w-[72px] rounded-[14px] object-cover" />
                )}
                <div>
                  <p className="ssc-label">This month&apos;s Lite pack</p>
                  <p className="ssc-display mt-1 text-[1.2rem]">{pack.name}</p>
                  <p className="text-[13px] text-white/55">Have a listen →</p>
                </div>
              </Link>
            )}
          </header>
          <div>
            <Action who={who} />
          </div>
        </div>
      </main>
      <SiteFooter cta={false} />
    </div>
  );
}

function Action({ who }: { who: Who }) {
  if (who === "member") {
    return (
      <Notice tone="success" title="You've already got every pack">
        Your membership unlocks the whole catalog, so Lite isn&apos;t for you.{" "}
        <Link href="/feed" className="font-semibold text-white underline underline-offset-4">
          Go to the catalog
        </Link>
      </Notice>
    );
  }
  if (who === "lite") {
    return (
      <Notice tone="success" title="You're on Lite">
        Want every pack? It&apos;s only {LITE.extra} more a month.{" "}
        <Link href="/upgrade?from=/lite" className="font-semibold text-white underline underline-offset-4">
          Upgrade
        </Link>
      </Notice>
    );
  }
  const href = who === "guest" ? `/signup?redirect=${encodeURIComponent("/checkout?plan=lite")}` : "/checkout?plan=lite";
  return (
    <GlassBox className="ssc-breathe rounded-[28px] p-7 sm:p-9">
      <p className="ssc-label">Lite · monthly</p>
      <p className="mt-5 flex items-baseline gap-2">
        <span className="ssc-display text-[clamp(3rem,7vw,4.4rem)]">{LITE.price}</span>
        <span className="text-white/55">a month</span>
      </p>
      <Link href={href} className="ssc-btn ssc-btn--primary mt-8 w-full">
        Start Lite
      </Link>
      {who === "guest" && (
        <p className="mt-4 text-center text-[14px] text-white/65">
          Had an account before?{" "}
          <Link href="/login?redirect=/lite" className="font-medium text-white underline underline-offset-4">
            Log in
          </Link>
        </p>
      )}
      <p className="mt-4 text-center text-[12px] leading-relaxed text-white/55">Cancel anytime. Want every pack? The full membership is {LITE.fullPrice} a month.</p>
    </GlassBox>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Drum, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubscribeCTA } from "@/components/ui/SubscribeCTA";
import { PriceJustificationSection } from "@/components/sections/PriceJustificationSection";
import { GlassBox, Pill, Section, SectionHead } from "@/components/ssc/Glass";
import { MemberCap } from "@/components/ssc/MemberCap";
import { withCoverColors } from "@/lib/cover-color";

export const metadata = {
  title: "Join Soul Sample Club | Pre-Cleared Soul Samples",
  description:
    "Unlimited access to exclusive, pre-cleared soul compositions with full stems. First month $0.99, then $6.99/month. Cancel anytime and keep everything you download.",
  alternates: { canonical: "/subscribe" },
};

async function getUserState() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { isLoggedIn: false, hasSubscription: false, hasUsedTrial: false };

    const [subResult, anySubResult] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .single(),
      supabase.from("subscriptions").select("id").eq("user_id", user.id).limit(1),
    ]);

    return {
      isLoggedIn: true,
      hasSubscription: !!subResult.data,
      hasUsedTrial: (anySubResult.data?.length ?? 0) > 0,
    };
  } catch {
    return { isLoggedIn: false, hasSubscription: false, hasUsedTrial: false };
  }
}

type PackCover = { id: string; name: string; cover_image_url: string; glow?: string };

async function getPackCovers(): Promise<PackCover[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("packs")
      .select("id, name, cover_image_url, is_bonus")
      .eq("is_published", true)
      .order("release_date", { ascending: false })
      .limit(20);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data as any[]) || [])
      // Bonus packs are member extras and never featured in marketing
      .filter((p) => p.cover_image_url && !p.is_bonus)
      .map((p) => ({ id: String(p.id), name: String(p.name), cover_image_url: String(p.cover_image_url) }));
  } catch {
    return [];
  }
}

const coreFacts = [
  "Pre-cleared soul, jazz, gospel and funk",
  "No clearance needed. Ever.",
  "Full stems on every release",
  "A new pack drops every week",
  "Made by real musicians. Not AI, not stock.",
  "Exclusive to SSC. Nowhere else on the internet.",
];

export default async function SubscribePage() {
  const [{ isLoggedIn, hasSubscription, hasUsedTrial }, rawPacks] = await Promise.all([
    getUserState(),
    getPackCovers(),
  ]);

  if (hasSubscription) redirect("/feed");

  const showTrial = !hasUsedTrial;

  // Cover-lit: the page takes its colour from the latest covers
  const packs = await withCoverColors(rawPacks);
  const glow = packs[0]?.glow;

  return (
    <div className="ssc min-h-screen overflow-x-clip">
      {/* Logo only: a checkout page, so no menu to wander off through */}
      <header className="flex justify-center pb-1 pt-7">
        <Link href="/">
          <Image src="/logo.svg" alt="Soul Sample Club" width={160} height={36} className="h-8 w-auto" priority />
        </Link>
      </header>

      <main>
        {/* HERO + PLANS */}
        <Section className="pt-[clamp(40px,6vw,72px)]">
          <header className="flex flex-col items-center text-center">
            <Pill dot glow={glow}>
              Membership
            </Pill>
            <h1 className="ssc-display mt-6 text-[clamp(2.4rem,7vw,5.6rem)] [text-wrap:balance]">
              The only soul catalog
              <br className="hidden sm:block" /> built for producers.
            </h1>
            <p className="ssc-body mt-6 max-w-xl text-[clamp(1rem,1.4vw,1.2rem)] leading-relaxed">
              One sample clearance can cost $5,000 to six figures.
              <br />A year of Soul Sample Club is $35.
            </p>
            <MemberCap className="mt-6 justify-center" />
          </header>

          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
            {/* Monthly */}
            <GlassBox plain className="flex flex-col rounded-[28px] p-7 sm:p-9">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="ssc-label">Monthly</p>
                {showTrial && (
                  <Pill dot glow={glow}>
                    Start for $0.99
                  </Pill>
                )}
              </div>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="ssc-display text-[clamp(3rem,6vw,4.2rem)]">{showTrial ? "$0.99" : "$6.99"}</span>
                <span className="text-white/55">{showTrial ? "first month" : "a month"}</span>
              </p>
              <p className="mt-2 min-h-[1.5em] text-[14px] text-white/55">{showTrial ? "Then $6.99 a month." : ""}</p>

              <div className="mt-auto pt-8">
                {isLoggedIn ? (
                  <SubscribeCTA isLoggedIn={true} hasSubscription={false} plan="monthly" bare className="ssc-btn ssc-btn--ghost w-full">
                    Get started
                  </SubscribeCTA>
                ) : (
                  <Link href="/signup?redirect=/checkout" className="ssc-btn ssc-btn--ghost w-full">
                    Get started
                  </Link>
                )}
                <p className="mt-3 text-center text-[12px] text-white/55">Cancel anytime</p>
              </div>
            </GlassBox>

            {/* Yearly: the one to pick, so it's the lit box */}
            <GlassBox glow={glow} className="ssc-breathe flex flex-col rounded-[28px] p-7 sm:p-9">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="ssc-label">Yearly · offer price</p>
                <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-black">Best value</span>
              </div>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="text-2xl text-white/55 line-through">$49</span>
                <span className="ssc-display text-[clamp(3rem,6vw,4.2rem)]">$35</span>
                <span className="text-white/55">a year</span>
              </p>
              <p className="mt-2 min-h-[1.5em] text-[14px] text-white/55">Save over 50% vs monthly</p>

              <div className="mt-auto pt-8">
                {isLoggedIn ? (
                  <SubscribeCTA isLoggedIn={true} hasSubscription={false} plan="yearly" bare className="ssc-btn ssc-btn--primary w-full">
                    Lock in yearly
                  </SubscribeCTA>
                ) : (
                  <Link href={`/signup?redirect=${encodeURIComponent("/checkout?plan=yearly")}`} className="ssc-btn ssc-btn--primary w-full">
                    Lock in yearly
                  </Link>
                )}
                <p className="mt-3 text-center text-[12px] text-white/55">Offer price, locked in for life. Won&apos;t last forever.</p>
              </div>
            </GlassBox>
          </div>

          {/* Core facts */}
          <GlassBox plain className="mx-auto mt-5 max-w-4xl rounded-[24px] px-7 py-6 sm:px-9">
            <p className="ssc-label">Every membership</p>
            <ul className="mt-4 grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
              {coreFacts.map((fact) => (
                <li key={fact} className="flex items-center gap-3 text-[15px] text-white/75">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white" />
                  {fact}
                </li>
              ))}
            </ul>
          </GlassBox>
        </Section>

        {/* Price justification */}
        <PriceJustificationSection glow={glow} />

        {/* Member exclusives */}
        <Section>
          <SectionHead
            pill="Member exclusives"
            title="More than the catalog"
            body="Two extras that come with every membership."
            align="center"
            className="mb-12 [text-wrap:balance]"
          />
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
            {[
              {
                icon: Drum,
                title: "The Drum Vault",
                body: "Raw, original drum breaks recorded by real musicians. Exclusive to SSC members. Free to collect and download, updated regularly.",
              },
              {
                icon: Gift,
                title: "Looplair Member Perks",
                body: "Early access to drops, bonus packs from one of the best soul libraries in the world, and member-only discounts. Just for being here.",
              },
            ].map(({ icon: Icon, title, body: text }) => (
              <GlassBox key={title} plain className="flex flex-col gap-8 rounded-[24px] p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04]">
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <div>
                  <h3 className="ssc-display text-[1.35rem]">{title}</h3>
                  <p className="ssc-body mt-3 text-[15px] leading-relaxed">{text}</p>
                </div>
              </GlassBox>
            ))}
          </div>
        </Section>

        {/* The catalog, moving past: each cover lit in its own colour */}
        {packs.length > 0 && (
          <section className="pb-[clamp(64px,8vw,112px)] pt-[clamp(44px,5.5vw,80px)]">
            <div className="px-5 sm:px-8">
              <SectionHead
                pill="The catalog"
                title="A world of pre-cleared samples"
                body="A new pack joins the catalog every week."
                align="center"
                className="mx-auto mb-6 max-w-[1240px] [text-wrap:balance]"
              />
            </div>
            <div className="overflow-hidden py-10">
              <div className="flex gap-4 sm:gap-5" style={{ animation: "subscribe-marquee 60s linear infinite", width: "max-content" }}>
                {[...packs, ...packs].map((pack, i) => (
                  <GlassBox key={i} glow={pack.glow} className="flex-shrink-0 rounded-[20px] p-2">
                    <div className="relative h-36 w-36 overflow-hidden rounded-[14px] bg-white/[0.04] sm:h-48 sm:w-48">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pack.cover_image_url} alt={i < packs.length ? pack.name : ""} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  </GlassBox>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <style>{`
        @keyframes subscribe-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

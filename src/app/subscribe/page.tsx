import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Drum, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubscribeCTA } from "@/components/ui/SubscribeCTA";

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
        .in("status", ["active", "trialing", "past_due"])
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

type PackCover = { id: string; name: string; cover_image_url: string };

async function getPackCovers(): Promise<PackCover[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("packs")
      .select("id, name, cover_image_url")
      .eq("is_published", true)
      .order("release_date", { ascending: false })
      .limit(20);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data as any[]) || [])
      .filter((p) => p.cover_image_url)
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
  const [{ isLoggedIn, hasSubscription, hasUsedTrial }, packs] = await Promise.all([
    getUserState(),
    getPackCovers(),
  ]);

  if (hasSubscription) redirect("/feed");

  const showTrial = !hasUsedTrial;

  return (
    <div className="min-h-screen bg-charcoal overflow-x-hidden">

      {/* Logo */}
      <div className="flex justify-center pt-7 pb-1">
        <Link href="/">
          <Image
            src="/logo.svg"
            alt="Soul Sample Club"
            width={160}
            height={36}
            className="h-9 w-auto"
            priority
          />
        </Link>
      </div>

      {/* Hero */}
      <div className="container-app text-center pt-10 pb-8 sm:pt-12 sm:pb-10">
        <h1 className="text-[2.75rem] sm:text-6xl lg:text-[5.5rem] font-bold text-white tracking-tight leading-[1.02] mb-5">
          The only soul catalog<br />built for producers.
        </h1>
        <p className="text-white/45 text-base sm:text-lg leading-relaxed">
          One sample clearance can cost $5,000 to six figures.
        </p>
        <p className="text-white/45 text-base sm:text-lg leading-relaxed">
          A year of Soul Sample Club is $49.
        </p>
      </div>

      {/* Capacity badge */}
      <div className="container-app flex flex-col items-center gap-3 pb-7 sm:pb-8">
        <div className="w-full max-w-[280px]">
          <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500/70 to-amber-300/90"
              style={{ width: "52%" }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-400/[0.08] border border-amber-400/[0.18] rounded-full px-4 py-[7px]">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          <span className="text-[11px] font-medium text-amber-300/75 tracking-wide">
            Worldwide cap of 5,000 members
          </span>
        </div>
      </div>

      {/* Plan cards */}
      <div className="container-app pb-6 sm:pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">

          {/* Monthly */}
          <div className="bg-white/[0.04] border border-white/[0.09] rounded-3xl p-7 lg:p-9 flex flex-col">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25 mb-4">
              Monthly
            </p>

            {showTrial && (
              <div className="self-start flex items-center gap-1.5 bg-amber-400/[0.12] border border-amber-400/25 rounded-full px-3 py-[5px] mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="text-amber-300 text-[11px] font-semibold tracking-wider">
                  START FOR $2.99
                </span>
              </div>
            )}

            <div className="flex items-end gap-2.5 mb-1">
              <span className="text-[3.5rem] lg:text-[4.5rem] font-bold text-white leading-none tracking-tight">
                {showTrial ? "$2.99" : "$6.99"}
              </span>
              <span className="text-white/30 text-sm mb-2">
                {showTrial ? "first month" : "/month"}
              </span>
            </div>
            <p className="text-sm text-white/30 mb-2">
              {showTrial ? "then $6.99/month" : " "}
            </p>

            <div className="mt-auto pt-5 border-t border-white/[0.07]">
              {isLoggedIn ? (
                <SubscribeCTA
                  isLoggedIn={true}
                  hasSubscription={false}
                  className="w-full !rounded-xl bg-white/10 text-white hover:bg-white/[0.16] shadow-none"
                  size="lg"
                  plan="monthly"
                  hideArrow
                >
                  Get started
                </SubscribeCTA>
              ) : (
                <Link
                  href="/signup?redirect=/checkout"
                  className="flex items-center justify-center w-full bg-white/10 hover:bg-white/[0.16] text-white font-semibold rounded-xl py-3.5 text-[15px] transition-colors duration-200"
                >
                  Get started
                </Link>
              )}
              <p className="text-xs text-white/20 mt-3 text-center">Cancel anytime</p>
            </div>
          </div>

          {/* Yearly */}
          <div
            className="relative bg-[#111111] border border-white/[0.18] rounded-3xl p-7 lg:p-9 flex flex-col"
            style={{ boxShadow: "0 0 60px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)" }}
          >
            <div className="absolute -top-[13px] left-1/2 -translate-x-1/2">
              <span className="bg-white text-charcoal text-[10px] font-bold uppercase tracking-widest px-4 py-[5px] rounded-full whitespace-nowrap">
                Best value
              </span>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25 mb-4">
              Yearly
            </p>

            {/* Align with monthly's amber badge row */}
            {showTrial && <div className="h-[29px] mb-4" />}

            <div className="flex items-end gap-2.5 mb-1">
              <span className="text-[3.5rem] lg:text-[4.5rem] font-bold text-white leading-none tracking-tight">
                $49
              </span>
              <span className="text-white/30 text-sm mb-2">/year</span>
            </div>
            <p className="text-sm text-white/30 mb-2">Save over 40% vs monthly</p>

            <div className="mt-auto pt-5 border-t border-white/[0.1]">
              {isLoggedIn ? (
                <SubscribeCTA
                  isLoggedIn={true}
                  hasSubscription={false}
                  className="w-full !rounded-xl shadow-none"
                  size="lg"
                  plan="yearly"
                  hideArrow
                >
                  Lock in yearly
                </SubscribeCTA>
              ) : (
                <Link
                  href={`/signup?redirect=${encodeURIComponent("/checkout?plan=yearly")}`}
                  className="flex items-center justify-center w-full bg-white hover:bg-white/90 text-charcoal font-semibold rounded-xl py-3.5 text-[15px] transition-colors duration-200"
                >
                  Lock in yearly
                </Link>
              )}
              <p className="text-xs text-white/20 mt-3 text-center">Lock in before prices rise</p>
            </div>
          </div>

        </div>
      </div>

      {/* Core facts */}
      <div className="container-app pb-10 sm:pb-12">
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
          {coreFacts.map((fact) => (
            <div key={fact} className="flex items-center gap-3">
              <span className="w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
              <span className="text-[13px] text-white/40 leading-snug">{fact}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Member exclusives */}
      <div className="container-app pb-14 sm:pb-16">
        <p className="text-[9px] uppercase tracking-[0.35em] text-white/15 text-center mb-6 font-medium">
          Member exclusives
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 sm:p-7">
            <div className="w-9 h-9 rounded-xl bg-white/[0.07] flex items-center justify-center mb-5">
              <Drum className="w-4 h-4 text-white/50" />
            </div>
            <h3 className="text-white font-semibold text-[15px] mb-2">The Drum Vault</h3>
            <p className="text-[13px] text-white/40 leading-relaxed">Raw, original drum breaks recorded by real musicians. Exclusive to SSC members. Free to collect and download, updated regularly.</p>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 sm:p-7">
            <div className="w-9 h-9 rounded-xl bg-white/[0.07] flex items-center justify-center mb-5">
              <Gift className="w-4 h-4 text-white/50" />
            </div>
            <h3 className="text-white font-semibold text-[15px] mb-2">Looplair Member Perks</h3>
            <p className="text-[13px] text-white/40 leading-relaxed">Early access to drops, bonus packs from one of the best soul libraries in the world, and member-only discounts. Just for being here.</p>
          </div>
        </div>
      </div>

      {/* Pack scroll — the world */}
      {packs.length > 0 && (
        <div className="pb-20 sm:pb-28">
          <p className="text-center text-[9px] uppercase tracking-[0.35em] text-white/15 mb-5 font-medium">
            A world of pre-cleared samples
          </p>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-charcoal to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-charcoal to-transparent z-10 pointer-events-none" />
            <div className="overflow-hidden">
              <div
                className="flex gap-3 sm:gap-4"
                style={{ animation: "subscribe-marquee 40s linear infinite", width: "max-content" }}
              >
                {[...packs, ...packs].map((pack, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden bg-white/[0.04]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pack.cover_image_url}
                      alt={pack.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes subscribe-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

    </div>
  );
}

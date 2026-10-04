import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { promoFromCookies, resolvePromo } from "@/lib/promo";
import { getCoverColor } from "@/lib/cover-color";
import { GlassBox, Pill, glowStyle } from "@/components/ssc/Glass";

// Landing page for promo links from ads (/join?promo=SOUL3). The middleware has
// already saved the code in a cookie; here it's checked in Stripe and the deal
// shown. Most visitors are former members, so logging in comes first. After
// auth everyone goes straight to /checkout. A missing or invalid code shows the
// standard offer instead.

export const dynamic = "force-dynamic";
export const metadata = { title: "Your offer | Soul Sample Club", robots: { index: false, follow: false } };

const FACTS = [
  "A new pack drops every week",
  "Full stems on every release",
  "Pre-cleared. No clearance needed, ever.",
  "Cancel anytime",
];

const STANDARD_LINE = "Your first month is $0.99, then $6.99/month. Cancel anytime.";

async function getAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, isMember: false };
  const admin = createAdminClient();
  const [subs, patreon] = await Promise.all([
    admin.from("subscriptions").select("id").eq("user_id", user.id).in("status", ["active", "trialing"]).limit(1),
    admin.from("patreon_links").select("id").eq("user_id", user.id).eq("is_active", true).limit(1),
  ]);
  return { signedIn: true, isMember: (subs.data?.length ?? 0) > 0 || (patreon.data?.length ?? 0) > 0 };
}

async function getCovers() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (createAdminClient() as any)
    .from("packs")
    .select("id, name, cover_image_url")
    .eq("is_published", true)
    .eq("is_bonus", false)
    .not("cover_image_url", "is", null)
    .order("release_date", { ascending: false })
    .limit(6);
  return (data ?? []) as { id: string; name: string; cover_image_url: string }[];
}

export default async function JoinPage({ searchParams }: { searchParams: { promo?: string } }) {
  // The cookie is set by the middleware on this same request, so read the URL first
  const [promo, access, covers] = await Promise.all([
    searchParams.promo ? resolvePromo(searchParams.promo) : promoFromCookies(),
    getAccess(),
    getCovers(),
  ]);
  const glow = await getCoverColor(covers[0]?.cover_image_url);

  return (
    <div className="ssc min-h-screen overflow-x-clip pb-24" style={glowStyle(glow)}>
      <header className="flex h-16 items-center justify-center">
        <Link href="/" aria-label="Soul Sample Club">
          <Image src="/logo.svg" alt="Soul Sample Club" width={140} height={32} className="h-6 w-auto" priority />
        </Link>
      </header>

      <main className="mx-auto max-w-xl px-5">
        <div className="mt-12 flex justify-center">
          <Pill dot glow={glow}>
            {promo ? "Limited offer" : "Membership"}
          </Pill>
        </div>
        <h1 className="ssc-display mt-5 text-center text-[clamp(2.4rem,12vw,3.8rem)]">
          {promo ? `${promo.firstPrice} a month` : "$0.99 first month"}
        </h1>
        <p className="mt-5 text-center text-[18px] font-medium leading-relaxed text-white">{promo?.line ?? STANDARD_LINE}</p>

        <GlassBox glow={glow} className="mt-8 rounded-[24px] p-5 sm:p-6">
          {access.isMember ? (
            <>
              <p className="text-center text-[16px] leading-relaxed text-white">You&apos;re already a member, so there&apos;s nothing to claim.</p>
              <Link href="/account" className="ssc-btn ssc-btn--primary mt-5 h-14 w-full">
                Go to your account
              </Link>
            </>
          ) : access.signedIn ? (
            <Link href="/checkout" className="ssc-btn ssc-btn--primary h-14 w-full">
              Continue to checkout
            </Link>
          ) : (
            <>
              <Link href="/login?redirect=/checkout" className="ssc-btn ssc-btn--primary h-14 w-full">
                {promo ? "Log in to claim" : "Log in to join"}
              </Link>
              <p className="mt-3 text-center text-[14px] leading-relaxed text-white/75">
                Been a member before? Log in with the same email.
              </p>
              <Link href="/signup?redirect=/checkout" className="ssc-btn ssc-btn--ghost mt-5 h-12 w-full text-[12px]">
                New here? Create an account
              </Link>
            </>
          )}
        </GlassBox>

        <Pill className="mb-4 mt-12">What members get</Pill>
        <GlassBox plain className="rounded-[24px] px-5 py-1">
          <ul className="divide-y divide-white/[0.08]">
            {FACTS.map((f) => (
              <li key={f} className="flex items-center gap-3 py-3.5 text-[15px] text-white/80">
                <Check className="h-4 w-4 flex-shrink-0 text-white" />
                {f}
              </li>
            ))}
          </ul>
        </GlassBox>

        {covers.length > 0 && (
          <>
            <Pill className="mb-4 mt-12">Recent releases</Pill>
            <div className="grid grid-cols-3 gap-2">
              {covers.map((c) => (
                <div key={c.id} className="relative aspect-square overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
                  <Image src={c.cover_image_url} alt={c.name} fill sizes="(max-width: 640px) 33vw, 190px" className="object-cover" />
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SubscribeCTA } from "@/components/ui/SubscribeCTA";

async function getUserState() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isLoggedIn: false, hasSubscription: false, hasUsedTrial: false };
    }

    const subResult = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .single();

    const anySubResult = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    return {
      isLoggedIn: true,
      hasSubscription: !!subResult.data,
      hasUsedTrial: (anySubResult.data?.length ?? 0) > 0,
    };
  } catch {
    return { isLoggedIn: false, hasSubscription: false, hasUsedTrial: false };
  }
}

const features = [
  "Pre-cleared soul, jazz, gospel and funk. Use it in any release.",
  "No clearance needed. Ever.",
  "Full stems on every release. Chop, flip, replay however you want.",
  "A new pre-cleared pack drops every week.",
  "Made by real musicians, in-house. Not AI, not stock.",
  "Access to the full active catalog.",
];

export default async function SubscribePage() {
  const { isLoggedIn, hasSubscription, hasUsedTrial } = await getUserState();

  if (hasSubscription) {
    redirect("/feed");
  }

  const monthlyHref = isLoggedIn ? null : "/signup?redirect=/checkout";
  const yearlyHref = isLoggedIn
    ? null
    : `/signup?redirect=${encodeURIComponent("/checkout?plan=yearly")}`;

  return (
    <div className="min-h-screen bg-charcoal">
      <div className="container-app py-16 sm:py-24 max-w-4xl">

        {/* Hero */}
        <div className="text-center mb-14 sm:mb-20">
          <p className="text-[11px] uppercase tracking-[0.25em] text-white/30 font-semibold mb-5">
            Soul Sample Club
          </p>
          <h1 className="text-[2.6rem] sm:text-6xl font-bold text-white mb-5 tracking-tight leading-[1.05]">
            The only soul catalog<br className="hidden sm:block" /> built for producers.
          </h1>
          <p className="text-white/50 text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
            One sample clearance can cost $5,000 to six figures.<br className="hidden sm:block" />
            A year of Soul Sample Club is $49.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16">

          {/* Monthly */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-7 sm:p-9 flex flex-col">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35 mb-7">
              Monthly
            </p>
            <div className="mb-8">
              <div className="flex items-end gap-2">
                <span className="text-[3.25rem] font-bold text-white leading-none tracking-tight">
                  $6.99
                </span>
                <span className="text-white/35 text-sm mb-1">/month</span>
              </div>
              {!hasUsedTrial && (
                <p className="text-sm text-white/45 mt-2">First month $2.99</p>
              )}
            </div>

            <div className="mt-auto pt-6 border-t border-white/[0.07]">
              {isLoggedIn ? (
                <SubscribeCTA
                  isLoggedIn={true}
                  hasSubscription={false}
                  className="w-full !rounded-xl bg-white/10 text-white hover:bg-white/15 shadow-none"
                  size="lg"
                  plan="monthly"
                  hideArrow
                >
                  Get started
                </SubscribeCTA>
              ) : (
                <Link
                  href={monthlyHref!}
                  className="flex items-center justify-center w-full bg-white/10 hover:bg-white/[0.15] text-white font-semibold rounded-xl py-3.5 text-[15px] transition-colors duration-200"
                >
                  Get started
                </Link>
              )}
              <p className="text-xs text-white/25 mt-3 text-center">Cancel anytime</p>
            </div>
          </div>

          {/* Yearly — highlighted */}
          <div
            className="relative bg-white/[0.07] border border-white/20 rounded-2xl p-7 sm:p-9 flex flex-col"
            style={{ boxShadow: "0 0 48px rgba(255,255,255,0.04)" }}
          >
            {/* Best value badge */}
            <div className="absolute -top-[14px] left-1/2 -translate-x-1/2">
              <span className="bg-white text-charcoal text-[10px] font-bold uppercase tracking-widest px-3.5 py-[5px] rounded-full whitespace-nowrap">
                Best value
              </span>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35 mb-7">
              Yearly
            </p>
            <div className="mb-8">
              <div className="flex items-end gap-2">
                <span className="text-[3.25rem] font-bold text-white leading-none tracking-tight">
                  $49
                </span>
                <span className="text-white/35 text-sm mb-1">/year</span>
              </div>
              <p className="text-sm text-white/45 mt-2">Save over 40% vs monthly</p>
            </div>

            <div className="mt-auto pt-6 border-t border-white/[0.1]">
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
                  href={yearlyHref!}
                  className="flex items-center justify-center w-full bg-white hover:bg-white/90 text-charcoal font-semibold rounded-xl py-3.5 text-[15px] transition-colors duration-200"
                >
                  Lock in yearly
                </Link>
              )}
              <p className="text-xs text-white/25 mt-3 text-center">
                Prices rise August 1st, 2026
              </p>
            </div>
          </div>

        </div>

        {/* Feature list */}
        <div className="max-w-lg mx-auto">
          <ul className="space-y-4">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3.5">
                <Check className="w-[18px] h-[18px] text-success flex-shrink-0 mt-[1px]" />
                <span className="text-[15px] text-white/60 leading-snug">{feature}</span>
              </li>
            ))}
          </ul>
          <p className="text-center text-xs text-white/20 mt-8">
            Archived releases stay archived. Active catalog only.
          </p>
        </div>

      </div>
    </div>
  );
}

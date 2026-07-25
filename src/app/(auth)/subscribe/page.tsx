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

  return (
    <div className="min-h-screen bg-charcoal">

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-[800px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.035) 0%, transparent 70%)" }}
          />
        </div>
        <div className="container-app relative z-10 pt-20 pb-16 sm:pt-32 sm:pb-24 text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 font-semibold mb-6">
            Soul Sample Club
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.02] mb-7">
            The only soul catalog<br />built for producers.
          </h1>
          <p className="text-white/40 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
            One sample clearance can cost $5,000 to six figures.
            A year of Soul Sample Club is $49.
          </p>
        </div>
      </div>

      {/* Plan cards */}
      <div className="container-app pb-16 sm:pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-8">

          {/* Monthly */}
          <div className="bg-white/[0.04] border border-white/[0.09] rounded-3xl p-8 lg:p-12 flex flex-col">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25 mb-8">
              Monthly
            </p>
            <div className="mb-10">
              <div className="flex items-end gap-3">
                <span className="text-6xl lg:text-7xl font-bold text-white leading-none tracking-tight">
                  $6.99
                </span>
                <span className="text-white/30 text-base mb-2">/month</span>
              </div>
              {!hasUsedTrial && (
                <p className="text-[15px] text-white/35 mt-3">First month $2.99</p>
              )}
            </div>

            <div className="mt-auto pt-8 border-t border-white/[0.07]">
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
                  className="flex items-center justify-center w-full bg-white/10 hover:bg-white/[0.16] text-white font-semibold rounded-xl py-4 text-[15px] transition-colors duration-200"
                >
                  Get started
                </Link>
              )}
              <p className="text-sm text-white/20 mt-4 text-center">Cancel anytime</p>
            </div>
          </div>

          {/* Yearly */}
          <div
            className="relative bg-[#111111] border border-white/[0.18] rounded-3xl p-8 lg:p-12 flex flex-col"
            style={{ boxShadow: "0 0 60px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)" }}
          >
            <div className="absolute -top-[14px] left-1/2 -translate-x-1/2">
              <span className="bg-white text-charcoal text-[10px] font-bold uppercase tracking-widest px-4 py-[5px] rounded-full whitespace-nowrap">
                Best value
              </span>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25 mb-8">
              Yearly
            </p>
            <div className="mb-10">
              <div className="flex items-end gap-3">
                <span className="text-6xl lg:text-7xl font-bold text-white leading-none tracking-tight">
                  $49
                </span>
                <span className="text-white/30 text-base mb-2">/year</span>
              </div>
              <p className="text-[15px] text-white/35 mt-3">Save over 40% vs monthly</p>
            </div>

            <div className="mt-auto pt-8 border-t border-white/[0.1]">
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
                  className="flex items-center justify-center w-full bg-white hover:bg-white/90 text-charcoal font-semibold rounded-xl py-4 text-[15px] transition-colors duration-200"
                >
                  Lock in yearly
                </Link>
              )}
              <p className="text-sm text-white/20 mt-4 text-center">Lock in before prices rise</p>
            </div>
          </div>

        </div>
      </div>

      {/* Features */}
      <div className="container-app pb-24 sm:pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6 max-w-5xl mx-auto">
          {features.map((feature) => (
            <div key={feature} className="flex items-start gap-3.5">
              <Check className="w-[18px] h-[18px] text-success flex-shrink-0 mt-[2px]" />
              <span className="text-[15px] text-white/50 leading-snug">{feature}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-white/15 mt-12">
          Archived releases stay archived. Active catalog only.
        </p>
      </div>

    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SubscribeCTA } from "@/components/ui/SubscribeCTA";
import { Button } from "@/components/ui";

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
      <div className="container-app py-16 sm:py-24">

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted mb-4">
            Soul Sample Club
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
            The only soul catalog built for producers.
          </h1>
          <p className="text-text-muted text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            One sample clearance can cost $5,000 to six figures. A year of Soul Sample Club is $49.
          </p>
        </div>

        {/* Plan cards */}
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">

          {/* Monthly */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.15em] text-text-muted mb-3">Monthly</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-white">$6.99</span>
                <span className="text-text-muted text-sm">/month</span>
              </div>
              {!hasUsedTrial && (
                <p className="text-sm text-text-muted mt-2">First month just $2.99</p>
              )}
            </div>

            <div className="flex-1" />

            {isLoggedIn ? (
              <SubscribeCTA
                isLoggedIn={true}
                hasSubscription={false}
                className="w-full"
                size="lg"
                plan="monthly"
              >
                Get started
              </SubscribeCTA>
            ) : (
              <Link href="/signup?redirect=/checkout">
                <Button className="w-full" size="lg">Get started</Button>
              </Link>
            )}
            <p className="text-xs text-text-muted mt-3 text-center">Cancel anytime</p>
          </div>

          {/* Yearly */}
          <div className="relative bg-charcoal border-2 border-white/25 rounded-2xl p-6 sm:p-8 flex flex-col">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-white text-charcoal text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                Best value
              </span>
            </div>

            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.15em] text-text-muted mb-3">Yearly</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-white">$49</span>
                <span className="text-text-muted text-sm">/year</span>
              </div>
              <p className="text-sm text-text-muted mt-2">Save over 40% vs monthly</p>
            </div>

            <div className="flex-1" />

            {isLoggedIn ? (
              <SubscribeCTA
                isLoggedIn={true}
                hasSubscription={false}
                className="w-full"
                size="lg"
                plan="yearly"
              >
                Lock in yearly
              </SubscribeCTA>
            ) : (
              <Link href={`/signup?redirect=${encodeURIComponent("/checkout?plan=yearly")}`}>
                <Button className="w-full" size="lg">Lock in yearly</Button>
              </Link>
            )}
            <p className="text-xs text-text-muted mt-3 text-center">Prices rise August 1st, 2026</p>
          </div>

        </div>

        {/* Feature list */}
        <div className="max-w-md mx-auto">
          <ul className="space-y-3.5">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-text-secondary">
                <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                {feature}
              </li>
            ))}
          </ul>
          <p className="text-center text-xs text-text-muted mt-6">
            Archived releases stay archived. Active catalog only.
          </p>
        </div>

      </div>
    </div>
  );
}

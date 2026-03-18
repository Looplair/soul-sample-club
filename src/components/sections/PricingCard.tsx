"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { SubscribeCTA } from "@/components/ui/SubscribeCTA";

const benefits = [
  "Exclusive soul compositions added regularly",
  "Access new releases as they drop",
  "Download full compositions with stems",
  "No clearance needed. Ever.",
  "Cancel anytime",
];

interface PricingCardProps {
  isLoggedIn: boolean;
  hasSubscription: boolean;
  hasUsedTrial: boolean;
}

export function PricingCard({ isLoggedIn, hasSubscription, hasUsedTrial }: PricingCardProps) {
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="max-w-lg mx-auto">
      {/* Toggle */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex bg-white/5 border border-white/10 rounded-full p-1 gap-1">
          <button
            onClick={() => setPlan("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              plan === "monthly"
                ? "bg-white text-charcoal"
                : "text-text-muted hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPlan("yearly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              plan === "yearly"
                ? "bg-white text-charcoal"
                : "text-text-muted hover:text-white"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="relative bg-charcoal border-2 border-white/20 rounded-2xl p-6 sm:p-8">
        <div className="text-center mb-6">
          {plan === "monthly" ? (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-white">$3.99</span>
                <span className="text-text-muted text-lg">/month</span>
              </div>
              {!(isLoggedIn && hasUsedTrial) && (
                <p className="text-sm text-text-muted mt-2">First month just $0.99</p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-white">$29</span>
                <span className="text-text-muted text-lg">/year</span>
              </div>
              <p className="text-sm text-text-muted mt-2 max-w-xs mx-auto">
                Special introductory offer for the first 250 annual members only. Lock in this rate and it&apos;s yours for life, even if we raise prices later.
              </p>
            </>
          )}
        </div>

        <ul className="space-y-3 mb-6">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3 text-sm text-text-secondary">
              <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              {benefit}
            </li>
          ))}
        </ul>

        {/* Quality Badge */}
        <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Quality over quantity</p>
              <p className="text-xs text-text-muted">New pack every month, minimum. Weekly drops coming.</p>
            </div>
          </div>
        </div>

        <SubscribeCTA
          isLoggedIn={isLoggedIn}
          hasSubscription={hasSubscription}
          className="w-full"
          size="lg"
          plan={plan}
        >
          {plan === "yearly" ? "Start for $29/year" : undefined}
        </SubscribeCTA>

        {hasSubscription && (
          <p className="text-center text-sm text-success mt-4">
            You&apos;re already subscribed!
          </p>
        )}

        {plan === "yearly" && !hasSubscription && (
          <p className="text-center text-xs text-text-muted mt-3">
            No refunds on annual plans.
          </p>
        )}
      </div>
    </div>
  );
}

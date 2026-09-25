"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISS_KEY = "ssc_payment_banner_dismissed";

// Mobile can dismiss for the rest of the visit (the card covers a lot of screen there)
export function PaymentFailedBannerCard() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) setDismissed(true);
    } catch {
      // Storage blocked: always show
    }
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Storage blocked: hidden until next page load
    }
  };

  return (
    <div className="fixed z-[60] left-4 right-4 bottom-24 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm">
      <div className="relative rounded-2xl border border-red-500/40 bg-charcoal/95 backdrop-blur-xl p-4 shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="sm:hidden absolute top-2 right-2 p-2 text-text-muted hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-white font-semibold text-sm pr-8 sm:pr-0">Your last payment didn&apos;t go through</p>
        <p className="text-text-muted text-sm mt-1">
          Downloads are paused until it&apos;s sorted. Update your card to get straight back in.
        </p>
        <a
          href="/api/billing/fix-payment"
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-white/90 transition-colors"
        >
          Update payment
        </a>
      </div>
    </div>
  );
}

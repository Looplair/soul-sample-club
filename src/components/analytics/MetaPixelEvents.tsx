"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fires Meta Pixel conversion events based on URL params.
 * Place this inside a Suspense boundary on pages that need conversion tracking.
 */
export function MetaPixelCheckoutSuccess() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "true" && typeof window.fbq === "function") {
      window.fbq("track", "StartTrial", {
        currency: "GBP",
        value: 0,
      });
    }
  }, [searchParams]);

  return null;
}

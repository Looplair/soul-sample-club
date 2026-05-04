"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const STORAGE_KEY = "ssc_start_trial_fired";

// Read a cookie value by name (client-side)
function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * Fires Meta Pixel StartTrial event once per user after Stripe checkout.
 * - Passes event_id from URL for CAPI deduplication
 * - Includes fbc/fbp cookies for better EMQ matching
 * - Guards against refresh/re-subscribe duplicates via storage
 */
export function MetaPixelCheckoutSuccess() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    if (success !== "true") return;
    if (typeof window.fbq !== "function") return;

    // Already fired for this user (persists across sessions)
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Already fired this session (guards against refresh)
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    // Grab the event_id generated at checkout creation for CAPI deduplication
    const eventId = searchParams.get("meta_event_id") || undefined;

    // Read fbc/fbp cookies for better match quality
    const fbc = getCookie("_fbc") || undefined;
    const fbp = getCookie("_fbp") || undefined;

    window.fbq(
      "track",
      "StartTrial",
      {
        currency: "USD",
        value: 0.99,
        ...(fbc && { fbc }),
        ...(fbp && { fbp }),
      },
      // eventID enables deduplication with the CAPI server event
      ...(eventId ? [{ eventID: eventId }] : [])
    );

    sessionStorage.setItem(STORAGE_KEY, "1");
    localStorage.setItem(STORAGE_KEY, "1");
  }, [searchParams]);

  return null;
}

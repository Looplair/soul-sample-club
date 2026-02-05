"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const STORAGE_KEY = "ssc_start_trial_fired";

/**
 * Fires Meta Pixel StartTrial event once per user after Stripe checkout.
 * Guards: sessionStorage prevents refresh duplicates, localStorage prevents
 * the same user from being counted twice (e.g. cancel and re-subscribe).
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

    window.fbq("track", "StartTrial", {
      currency: "GBP",
      value: 0,
    });

    sessionStorage.setItem(STORAGE_KEY, "1");
    localStorage.setItem(STORAGE_KEY, "1");
  }, [searchParams]);

  return null;
}

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const FBCLID_KEY = "ssc_fbclid";
const FBCLID_TS_KEY = "ssc_fbclid_ts";
const FBCLID_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

/**
 * Captures fbclid from the URL when a user lands from a Meta ad
 * and stores it in localStorage for use at checkout.
 * Survives cookie deletion (iOS ITP) since it's localStorage-based.
 */
export function FbclidCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const fbclid = searchParams.get("fbclid");
    if (fbclid) {
      localStorage.setItem(FBCLID_KEY, fbclid);
      localStorage.setItem(FBCLID_TS_KEY, Date.now().toString());
    }
  }, [searchParams]);

  return null;
}

/**
 * Retrieve stored fbclid (expires after 7 days).
 * Call this at checkout time to pass to the API.
 */
export function getStoredFbclid(): string | null {
  if (typeof window === "undefined") return null;
  const fbclid = localStorage.getItem(FBCLID_KEY);
  const ts = localStorage.getItem(FBCLID_TS_KEY);
  if (!fbclid || !ts) return null;
  if (Date.now() - parseInt(ts) > FBCLID_TTL) {
    localStorage.removeItem(FBCLID_KEY);
    localStorage.removeItem(FBCLID_TS_KEY);
    return null;
  }
  return fbclid;
}

"use client";

import { useEffect } from "react";

/**
 * Sends a view or click to /api/track for the admin reports. Counted once per
 * browser tab session per page and event, so refreshing doesn't inflate it.
 */
export function track(event: "view" | "free_cta", path: string) {
  try {
    const key = `ssc_track:${event}:${path}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Storage blocked (private mode etc.): still count it
  }
  const body = JSON.stringify({ event, path });
  if (!navigator.sendBeacon?.("/api/track", body)) {
    void fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
  }
}

/** Drop-in for a page: records one view of `path` */
export function TrackView({ path }: { path: string }) {
  useEffect(() => track("view", path), [path]);
  return null;
}
